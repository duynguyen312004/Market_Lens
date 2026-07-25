from __future__ import annotations

from datetime import date
from math import sqrt
from typing import TYPE_CHECKING, Any, Literal

import numpy as np

from .methods import (
    FORECAST_HORIZON_DAYS,
    minimum_training_days,
)

if TYPE_CHECKING:
    from .selection import ModelSelection


BACKTEST_MAX_FOLDS = 8
BACKTEST_MINIMUM_FOLDS = 2
BASELINE_METHOD = "seasonal_naive_7_days"
EVALUATION_STRATEGY = "rolling_origin_selected_method"
MINIMUM_EVALUATION_HISTORY_DAYS = 28
RELIABILITY_HIGH_MINIMUM_FOLDS = 6

Reliability = Literal["high", "medium", "low", "unavailable"]


def build_selected_evaluation(
    revenue_by_date: list[dict[str, Any]],
    selection: ModelSelection,
    *,
    forecast_available: bool,
) -> dict[str, Any]:
    if not forecast_available:
        return _unavailable_evaluation("FORECAST_UNAVAILABLE")

    selected = selection.selected_candidate
    if selected is None:
        return _unavailable_evaluation(
            "INSUFFICIENT_SELECTION_HISTORY",
            fold_count=len(selection.fold_origins),
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
                    revenue_by_date[
                        origin + FORECAST_HORIZON_DAYS - 1
                    ]["date"]
                ),
                "model_metrics": calculate_error_metrics(
                    np.array(selected_fold.actual, dtype=float),
                    np.array(selected_fold.predictions, dtype=float),
                ),
                "baseline_metrics": calculate_error_metrics(
                    np.array(baseline_fold.actual, dtype=float),
                    np.array(baseline_fold.predictions, dtype=float),
                ),
            }
        )

    model_metrics = selected.metrics
    baseline_metrics = baseline.metrics
    return {
        **_evaluation_metadata(),
        "available": True,
        "reason": None,
        "evaluated_method": selected.method,
        "fold_count": len(selection.fold_origins),
        "evaluation_points": (
            len(selection.fold_origins) * FORECAST_HORIZON_DAYS
        ),
        "model_metrics": model_metrics,
        "baseline_metrics": baseline_metrics,
        "mae_improvement_vs_baseline_percent": (
            calculate_mae_improvement(
                model_mae=model_metrics["mae"],
                baseline_mae=baseline_metrics["mae"],
            )
        ),
        "reliability": classify_reliability(
            fold_count=len(selection.fold_origins),
            model_metrics=model_metrics,
            baseline_metrics=baseline_metrics,
        ),
        "folds": folds,
    }


def recent_fold_origins(
    *,
    history_days: int,
    minimum_training: int,
    maximum_folds: int = BACKTEST_MAX_FOLDS,
) -> list[int]:
    latest_origin = history_days - FORECAST_HORIZON_DAYS
    descending_origins = list(
        range(
            latest_origin,
            minimum_training - 1,
            -FORECAST_HORIZON_DAYS,
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
    reason: Literal[
        "FORECAST_UNAVAILABLE",
        "INSUFFICIENT_SELECTION_HISTORY",
    ],
    *,
    fold_count: int = 0,
) -> dict[str, Any]:
    return {
        **_evaluation_metadata(),
        "available": False,
        "reason": reason,
        "evaluated_method": None,
        "fold_count": fold_count,
        "evaluation_points": fold_count * FORECAST_HORIZON_DAYS,
        "model_metrics": None,
        "baseline_metrics": None,
        "mae_improvement_vs_baseline_percent": None,
        "reliability": "unavailable",
        "folds": [],
    }


def _evaluation_metadata() -> dict[str, Any]:
    return {
        "strategy": EVALUATION_STRATEGY,
        "baseline_method": BASELINE_METHOD,
        "horizon_days": FORECAST_HORIZON_DAYS,
        "minimum_fold_count": BACKTEST_MINIMUM_FOLDS,
        "maximum_fold_count": BACKTEST_MAX_FOLDS,
        "minimum_history_days": MINIMUM_EVALUATION_HISTORY_DAYS,
    }


def _date_value(value: object) -> str:
    if isinstance(value, date):
        return value.isoformat()
    return str(value)
