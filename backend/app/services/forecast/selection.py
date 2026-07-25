from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal

import numpy as np

from .evaluation import calculate_error_metrics, recent_fold_origins
from .methods import (
    FORECAST_CANDIDATES,
    FORECAST_HORIZON_DAYS,
    METHOD_COMPLEXITY,
    ForecastMethod,
    minimum_training_days,
    predict_revenue,
    round_predictions,
)


MODEL_SELECTION_MAX_FOLDS = 8
MODEL_SELECTION_MINIMUM_FOLDS = 2
SIMPLICITY_TOLERANCE_PERCENT = 5.0
MINIMUM_SELECTION_HISTORY_DAYS = 28

SelectionReason = Literal[
    "LOWEST_MAE",
    "SIMPLER_WITHIN_FIVE_PERCENT",
]


@dataclass(frozen=True)
class BacktestFold:
    origin: int
    actual: tuple[float, ...]
    predictions: tuple[float, ...]


@dataclass(frozen=True)
class CandidateEvaluation:
    method: ForecastMethod
    metrics: dict[str, float]
    folds: tuple[BacktestFold, ...]
    residuals: tuple[float, ...]

    def to_contract(self, *, rank: int) -> dict[str, Any]:
        return {
            "rank": rank,
            "method": self.method,
            "minimum_training_days": minimum_training_days(self.method),
            "metrics": self.metrics,
        }


@dataclass(frozen=True)
class ModelSelection:
    available: bool
    reason: Literal["INSUFFICIENT_SELECTION_HISTORY"] | None
    fold_origins: tuple[int, ...]
    candidates: tuple[CandidateEvaluation, ...]
    selected_method: ForecastMethod | None
    selection_reason: SelectionReason | None

    @property
    def selected_candidate(self) -> CandidateEvaluation | None:
        if self.selected_method is None:
            return None
        return next(
            candidate
            for candidate in self.candidates
            if candidate.method == self.selected_method
        )

    def to_contract(self) -> dict[str, Any]:
        ranked = sorted(
            self.candidates,
            key=_candidate_ranking_key,
        )
        ranks = {
            candidate.method: rank
            for rank, candidate in enumerate(ranked, start=1)
        }
        return {
            "available": self.available,
            "reason": self.reason,
            "strategy": "rolling_origin_candidate_comparison",
            "primary_metric": "mae",
            "simplicity_tolerance_percent": (
                SIMPLICITY_TOLERANCE_PERCENT
            ),
            "minimum_fold_count": MODEL_SELECTION_MINIMUM_FOLDS,
            "maximum_fold_count": MODEL_SELECTION_MAX_FOLDS,
            "minimum_history_days": MINIMUM_SELECTION_HISTORY_DAYS,
            "fold_count": len(self.fold_origins),
            "evaluation_points": (
                len(self.fold_origins) * FORECAST_HORIZON_DAYS
            ),
            "selected_method": self.selected_method,
            "selection_reason": self.selection_reason,
            "candidates": [
                candidate.to_contract(rank=ranks[candidate.method])
                for candidate in ranked
            ],
        }


def select_forecast_model(
    revenue_by_date: list[dict[str, Any]],
) -> ModelSelection:
    values = np.array(
        [float(item["revenue"]) for item in revenue_by_date],
        dtype=float,
    )
    eligible_methods = [
        method
        for method in FORECAST_CANDIDATES
        if len(values)
        >= minimum_training_days(method)
        + MODEL_SELECTION_MINIMUM_FOLDS * FORECAST_HORIZON_DAYS
    ]
    if not eligible_methods:
        return ModelSelection(
            available=False,
            reason="INSUFFICIENT_SELECTION_HISTORY",
            fold_origins=(),
            candidates=(),
            selected_method=None,
            selection_reason=None,
        )

    common_minimum_training = max(
        minimum_training_days(method)
        for method in eligible_methods
    )
    origins = recent_fold_origins(
        history_days=len(values),
        minimum_training=common_minimum_training,
        maximum_folds=MODEL_SELECTION_MAX_FOLDS,
    )
    if len(origins) < MODEL_SELECTION_MINIMUM_FOLDS:
        return ModelSelection(
            available=False,
            reason="INSUFFICIENT_SELECTION_HISTORY",
            fold_origins=tuple(origins),
            candidates=(),
            selected_method=None,
            selection_reason=None,
        )

    candidates = tuple(
        _evaluate_candidate(
            values=values,
            method=method,
            origins=origins,
        )
        for method in eligible_methods
    )
    best_by_mae = min(candidates, key=_candidate_ranking_key)
    tolerance_limit = best_by_mae.metrics["mae"] * (
        1 + SIMPLICITY_TOLERANCE_PERCENT / 100
    )
    within_tolerance = [
        candidate
        for candidate in candidates
        if candidate.metrics["mae"] <= tolerance_limit
    ]
    selected = min(
        within_tolerance,
        key=lambda candidate: (
            METHOD_COMPLEXITY[candidate.method],
            candidate.method,
        ),
    )
    reason: SelectionReason = (
        "LOWEST_MAE"
        if selected.method == best_by_mae.method
        else "SIMPLER_WITHIN_FIVE_PERCENT"
    )
    return ModelSelection(
        available=True,
        reason=None,
        fold_origins=tuple(origins),
        candidates=candidates,
        selected_method=selected.method,
        selection_reason=reason,
    )


def _evaluate_candidate(
    *,
    values: np.ndarray,
    method: ForecastMethod,
    origins: list[int],
) -> CandidateEvaluation:
    folds = []
    actual_values: list[float] = []
    predicted_values: list[float] = []
    residuals: list[float] = []
    for origin in origins:
        actual = values[origin : origin + FORECAST_HORIZON_DAYS]
        predictions = round_predictions(
            predict_revenue(method, values[:origin])
        ).astype(float)
        folds.append(
            BacktestFold(
                origin=origin,
                actual=tuple(actual.tolist()),
                predictions=tuple(predictions.tolist()),
            )
        )
        actual_values.extend(actual.tolist())
        predicted_values.extend(predictions.tolist())
        residuals.extend((actual - predictions).tolist())

    return CandidateEvaluation(
        method=method,
        metrics=calculate_error_metrics(
            np.array(actual_values, dtype=float),
            np.array(predicted_values, dtype=float),
        ),
        folds=tuple(folds),
        residuals=tuple(residuals),
    )


def _candidate_ranking_key(
    candidate: CandidateEvaluation,
) -> tuple[float, float, int, str]:
    return (
        candidate.metrics["mae"],
        candidate.metrics["smape_percent"],
        METHOD_COMPLEXITY[candidate.method],
        candidate.method,
    )
