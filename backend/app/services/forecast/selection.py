from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal

import numpy as np

from .evaluation import calculate_error_metrics, recent_fold_origins
from .methods import (
    FORECAST_CANDIDATES,
    METHOD_COMPLEXITY,
    ForecastMethod,
    minimum_training_days,
    predict_revenue,
    round_predictions,
)


MODEL_SELECTION_MAX_FOLDS = 8
MODEL_SELECTION_MINIMUM_FOLDS = 2
SIMPLICITY_TOLERANCE_PERCENT = 5.0

SelectionReason = Literal[
    "LOWEST_PRIMARY_ERROR",
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
    daily_metrics: dict[str, float]
    total_metrics: dict[str, float]
    folds: tuple[BacktestFold, ...]
    residuals: tuple[float, ...]
    total_residuals: tuple[float, ...]

    def to_contract(self, *, rank: int) -> dict[str, Any]:
        return {
            "rank": rank,
            "method": self.method,
            "minimum_training_days": minimum_training_days(self.method),
            "daily_metrics": self.daily_metrics,
            "total_metrics": self.total_metrics,
        }


@dataclass(frozen=True)
class ModelSelection:
    available: bool
    reason: Literal["INSUFFICIENT_SELECTION_HISTORY"] | None
    horizon_days: int
    fold_origins: tuple[int, ...]
    candidates: tuple[CandidateEvaluation, ...]
    selected_method: ForecastMethod | None
    selection_reason: SelectionReason | None

    @property
    def primary_metric(self) -> Literal["daily_mae", "total_mae"]:
        return "daily_mae" if self.horizon_days == 7 else "total_mae"

    @property
    def selected_candidate(self) -> CandidateEvaluation | None:
        if self.selected_method is None:
            return None
        return next(
            candidate
            for candidate in self.candidates
            if candidate.method == self.selected_method
        )

    @property
    def minimum_history_days(self) -> int:
        return (
            min(minimum_training_days(method) for method in FORECAST_CANDIDATES)
            + MODEL_SELECTION_MINIMUM_FOLDS * self.horizon_days
        )

    def primary_error(self, candidate: CandidateEvaluation) -> float:
        metrics = (
            candidate.daily_metrics
            if self.primary_metric == "daily_mae"
            else candidate.total_metrics
        )
        return metrics["mae"]

    def ranking_key(
        self,
        candidate: CandidateEvaluation,
    ) -> tuple[float, float, int, str]:
        metrics = (
            candidate.daily_metrics
            if self.primary_metric == "daily_mae"
            else candidate.total_metrics
        )
        return (
            metrics["mae"],
            metrics["smape_percent"],
            METHOD_COMPLEXITY[candidate.method],
            candidate.method,
        )

    def to_contract(self) -> dict[str, Any]:
        ranked = sorted(self.candidates, key=self.ranking_key)
        ranks = {
            candidate.method: rank
            for rank, candidate in enumerate(ranked, start=1)
        }
        return {
            "available": self.available,
            "reason": self.reason,
            "strategy": "rolling_origin_candidate_comparison",
            "primary_metric": self.primary_metric,
            "simplicity_tolerance_percent": SIMPLICITY_TOLERANCE_PERCENT,
            "minimum_fold_count": MODEL_SELECTION_MINIMUM_FOLDS,
            "maximum_fold_count": MODEL_SELECTION_MAX_FOLDS,
            "minimum_history_days": self.minimum_history_days,
            "fold_count": len(self.fold_origins),
            "evaluation_points": (
                len(self.fold_origins) * self.horizon_days
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
    *,
    horizon_days: int = 7,
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
        + MODEL_SELECTION_MINIMUM_FOLDS * horizon_days
    ]
    if not eligible_methods:
        return _unavailable_selection(horizon_days=horizon_days)

    common_minimum_training = max(
        minimum_training_days(method) for method in eligible_methods
    )
    origins = recent_fold_origins(
        history_days=len(values),
        minimum_training=common_minimum_training,
        horizon_days=horizon_days,
        maximum_folds=MODEL_SELECTION_MAX_FOLDS,
    )
    if len(origins) < MODEL_SELECTION_MINIMUM_FOLDS:
        return _unavailable_selection(
            horizon_days=horizon_days,
            origins=origins,
        )

    candidates = tuple(
        _evaluate_candidate(
            values=values,
            method=method,
            origins=origins,
            horizon_days=horizon_days,
        )
        for method in eligible_methods
    )
    provisional = ModelSelection(
        available=True,
        reason=None,
        horizon_days=horizon_days,
        fold_origins=tuple(origins),
        candidates=candidates,
        selected_method=None,
        selection_reason=None,
    )
    best = min(candidates, key=provisional.ranking_key)
    tolerance_limit = provisional.primary_error(best) * (
        1 + SIMPLICITY_TOLERANCE_PERCENT / 100
    )
    within_tolerance = [
        candidate
        for candidate in candidates
        if provisional.primary_error(candidate) <= tolerance_limit
    ]
    selected = min(
        within_tolerance,
        key=lambda candidate: (
            METHOD_COMPLEXITY[candidate.method],
            candidate.method,
        ),
    )
    reason: SelectionReason = (
        "LOWEST_PRIMARY_ERROR"
        if selected.method == best.method
        else "SIMPLER_WITHIN_FIVE_PERCENT"
    )
    return ModelSelection(
        available=True,
        reason=None,
        horizon_days=horizon_days,
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
    horizon_days: int,
) -> CandidateEvaluation:
    folds = []
    actual_values: list[float] = []
    predicted_values: list[float] = []
    residuals: list[float] = []
    actual_totals: list[float] = []
    predicted_totals: list[float] = []
    total_residuals: list[float] = []
    for origin in origins:
        actual = values[origin : origin + horizon_days]
        predictions = round_predictions(
            predict_revenue(
                method,
                values[:origin],
                horizon_days=horizon_days,
            )
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
        actual_total = float(actual.sum())
        predicted_total = float(predictions.sum())
        actual_totals.append(actual_total)
        predicted_totals.append(predicted_total)
        total_residuals.append(actual_total - predicted_total)

    return CandidateEvaluation(
        method=method,
        daily_metrics=calculate_error_metrics(
            np.array(actual_values, dtype=float),
            np.array(predicted_values, dtype=float),
        ),
        total_metrics=calculate_error_metrics(
            np.array(actual_totals, dtype=float),
            np.array(predicted_totals, dtype=float),
        ),
        folds=tuple(folds),
        residuals=tuple(residuals),
        total_residuals=tuple(total_residuals),
    )


def _unavailable_selection(
    *,
    horizon_days: int,
    origins: list[int] | None = None,
) -> ModelSelection:
    return ModelSelection(
        available=False,
        reason="INSUFFICIENT_SELECTION_HISTORY",
        horizon_days=horizon_days,
        fold_origins=tuple(origins or []),
        candidates=(),
        selected_method=None,
        selection_reason=None,
    )
