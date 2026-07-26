from __future__ import annotations

from datetime import date
from math import sqrt
from typing import TYPE_CHECKING, Any, Literal

import numpy as np

if TYPE_CHECKING:
    from .selection import ModelSelection


BACKTEST_MAX_FOLDS = 8
BACKTEST_MINIMUM_FOLDS = 2
BASELINE_METHOD = "seasonal_naive_7_days"
EVALUATION_STRATEGY = "rolling_origin_selected_method"
RELIABILITY_HIGH_MINIMUM_FOLDS = 6

Reliability = Literal["high", "medium", "low", "unavailable"]


def build_selected_evaluation(
    revenue_by_date: list[dict[str, Any]],
    selection: ModelSelection,
    *,
    forecast_available: bool,
) -> dict[str, Any]:
    if not forecast_available:
        return _unavailable_evaluation(
            selection,
            "FORECAST_UNAVAILABLE",
        )

    selected = selection.selected_candidate
    if selected is None:
        return _unavailable_evaluation(
            selection,
            "INSUFFICIENT_SELECTION_HISTORY",
        )
    baseline = next(
        candidate
        for candidate in selection.candidates
        if candidate.method == BASELINE_METHOD
    )
    baseline_folds_by_origin = {
        fold.origin: fold for fold in baseline.folds
    }
    folds = []
    for fold_number, selected_fold in enumerate(
        selected.folds,
        start=1,
    ):
        baseline_fold = baseline_folds_by_origin[selected_fold.origin]
        origin = selected_fold.origin
        validation_to_index = origin + selection.horizon_days - 1
        folds.append(
            {
                "fold": fold_number,
                "training_days": origin,
                "train_end_date": _date_value(
                    revenue_by_date[origin - 1]["date"]
                ),
                "validation_from": _date_value(
                    revenue_by_date[origin]["date"]
                ),
                "validation_to": _date_value(
                    revenue_by_date[validation_to_index]["date"]
                ),
                "model_daily_metrics": calculate_error_metrics(
                    np.array(selected_fold.actual, dtype=float),
                    np.array(selected_fold.predictions, dtype=float),
                ),
                "baseline_daily_metrics": calculate_error_metrics(
                    np.array(baseline_fold.actual, dtype=float),
                    np.array(baseline_fold.predictions, dtype=float),
                ),
                "model_total_revenue": int(
                    round(sum(selected_fold.predictions))
                ),
                "actual_total_revenue": int(
                    round(sum(selected_fold.actual))
                ),
                "baseline_total_revenue": int(
                    round(sum(baseline_fold.predictions))
                ),
            }
        )

    model_primary_metrics = _primary_metrics(selection, selected)
    baseline_primary_metrics = _primary_metrics(selection, baseline)
    return {
        **_evaluation_metadata(selection),
        "available": True,
        "reason": None,
        "evaluated_method": selected.method,
        "fold_count": len(selection.fold_origins),
        "evaluation_points": (
            len(selection.fold_origins) * selection.horizon_days
        ),
        "model_daily_metrics": selected.daily_metrics,
        "baseline_daily_metrics": baseline.daily_metrics,
        "model_total_metrics": selected.total_metrics,
        "baseline_total_metrics": baseline.total_metrics,
        "primary_mae_improvement_vs_baseline_percent": (
            calculate_mae_improvement(
                model_mae=model_primary_metrics["mae"],
                baseline_mae=baseline_primary_metrics["mae"],
            )
        ),
        "reliability": classify_reliability(
            fold_count=len(selection.fold_origins),
            model_metrics=model_primary_metrics,
            baseline_metrics=baseline_primary_metrics,
        ),
        "folds": folds,
    }


def recent_fold_origins(
    *,
    history_days: int,
    minimum_training: int,
    horizon_days: int = 7,
    maximum_folds: int = BACKTEST_MAX_FOLDS,
) -> list[int]:
    latest_origin = history_days - horizon_days
    descending_origins = list(
        range(
            latest_origin,
            minimum_training - 1,
            -horizon_days,
        )
    )
    return list(reversed(descending_origins[:maximum_folds]))


def calculate_error_metrics(
    actual: np.ndarray,
    predicted: np.ndarray,
) -> dict[str, float]:
    absolute_errors = np.abs(actual - predicted)
    squared_errors = np.square(actual - predicted)
    denominators = np.abs(actual) + np.abs(predicted)
    smape_components = np.divide(
        200 * absolute_errors,
        denominators,
        out=np.zeros_like(absolute_errors, dtype=float),
        where=denominators != 0,
    )
    return {
        "mae": round(float(absolute_errors.mean()), 2),
        "rmse": round(sqrt(float(squared_errors.mean())), 2),
        "smape_percent": round(float(smape_components.mean()), 6),
    }


def calculate_mae_improvement(
    *,
    model_mae: float,
    baseline_mae: float,
) -> float | None:
    if baseline_mae == 0:
        return 0.0 if model_mae == 0 else None
    return round((baseline_mae - model_mae) / baseline_mae * 100, 6)


def classify_reliability(
    *,
    fold_count: int,
    model_metrics: dict[str, float],
    baseline_metrics: dict[str, float],
) -> Reliability:
    model_is_no_worse = model_metrics["mae"] <= baseline_metrics["mae"]
    model_is_within_ten_percent = (
        model_metrics["mae"] <= baseline_metrics["mae"] * 1.1
    )

    if (
        fold_count >= RELIABILITY_HIGH_MINIMUM_FOLDS
        and model_metrics["smape_percent"] <= 20
        and model_is_no_worse
    ):
        return "high"
    if (
        fold_count >= BACKTEST_MINIMUM_FOLDS
        and model_metrics["smape_percent"] <= 40
        and model_is_within_ten_percent
    ):
        return "medium"
    return "low"


def _unavailable_evaluation(
    selection: ModelSelection,
    reason: Literal[
        "FORECAST_UNAVAILABLE",
        "INSUFFICIENT_SELECTION_HISTORY",
    ],
) -> dict[str, Any]:
    fold_count = len(selection.fold_origins)
    return {
        **_evaluation_metadata(selection),
        "available": False,
        "reason": reason,
        "evaluated_method": None,
        "fold_count": fold_count,
        "evaluation_points": fold_count * selection.horizon_days,
        "model_daily_metrics": None,
        "baseline_daily_metrics": None,
        "model_total_metrics": None,
        "baseline_total_metrics": None,
        "primary_mae_improvement_vs_baseline_percent": None,
        "reliability": "unavailable",
        "folds": [],
    }


def _evaluation_metadata(selection: ModelSelection) -> dict[str, Any]:
    return {
        "strategy": EVALUATION_STRATEGY,
        "primary_metric": selection.primary_metric,
        "baseline_method": BASELINE_METHOD,
        "horizon_days": selection.horizon_days,
        "minimum_fold_count": BACKTEST_MINIMUM_FOLDS,
        "maximum_fold_count": BACKTEST_MAX_FOLDS,
        "minimum_history_days": selection.minimum_history_days,
    }


def _primary_metrics(
    selection: ModelSelection,
    candidate: Any,
) -> dict[str, float]:
    if selection.primary_metric == "daily_mae":
        return candidate.daily_metrics
    return candidate.total_metrics


def _date_value(value: object) -> str:
    if isinstance(value, date):
        return value.isoformat()
    return str(value)
