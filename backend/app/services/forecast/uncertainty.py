from typing import Any

import numpy as np

from .selection import ModelSelection


TARGET_COVERAGE_PERCENT = 80
MINIMUM_RESIDUAL_FOLDS = 4


def calculate_forecast_uncertainty(
    selection: ModelSelection,
    predictions: list[int],
) -> dict[str, Any]:
    selected = selection.selected_candidate
    if selected is None:
        return _unavailable("MODEL_SELECTION_UNAVAILABLE")

    fold_count = len(selected.folds)
    if fold_count < MINIMUM_RESIDUAL_FOLDS:
        return _unavailable(
            "INSUFFICIENT_RESIDUALS",
            residual_count=len(selected.residuals),
            total_residual_count=len(selected.total_residuals),
        )

    absolute_residuals = np.abs(
        np.array(selected.residuals, dtype=float)
    )
    absolute_total_residuals = np.abs(
        np.array(selected.total_residuals, dtype=float)
    )
    daily_quantile = _quantile(absolute_residuals)
    total_quantile = _quantile(absolute_total_residuals)
    rounded_daily_quantile = int(round(daily_quantile))
    rounded_total_quantile = int(round(total_quantile))
    forecast_total = sum(predictions)
    return {
        "available": True,
        "reason": None,
        "method": "empirical_absolute_error_quantile",
        "target_coverage_percent": TARGET_COVERAGE_PERCENT,
        "residual_count": len(absolute_residuals),
        "absolute_error_quantile": rounded_daily_quantile,
        "observed_backtest_coverage_percent": _coverage(
            absolute_residuals,
            daily_quantile,
        ),
        "total_interval_available": True,
        "total_interval_reason": None,
        "total_residual_count": len(absolute_total_residuals),
        "total_absolute_error_quantile": rounded_total_quantile,
        "observed_total_backtest_coverage_percent": _coverage(
            absolute_total_residuals,
            total_quantile,
        ),
        "total_lower_bound": max(
            0,
            forecast_total - rounded_total_quantile,
        ),
        "total_upper_bound": forecast_total + rounded_total_quantile,
        "intervals": [
            {
                "lower_bound": max(
                    0,
                    prediction - rounded_daily_quantile,
                ),
                "upper_bound": prediction + rounded_daily_quantile,
            }
            for prediction in predictions
        ],
    }


def _quantile(values: np.ndarray) -> float:
    return float(
        np.quantile(
            values,
            TARGET_COVERAGE_PERCENT / 100,
            method="higher",
        )
    )


def _coverage(values: np.ndarray, quantile: float) -> float:
    return round(float((values <= quantile).mean()) * 100, 6)


def _unavailable(
    reason: str,
    *,
    residual_count: int = 0,
    total_residual_count: int = 0,
) -> dict[str, Any]:
    return {
        "available": False,
        "reason": reason,
        "method": "empirical_absolute_error_quantile",
        "target_coverage_percent": TARGET_COVERAGE_PERCENT,
        "residual_count": residual_count,
        "absolute_error_quantile": None,
        "observed_backtest_coverage_percent": None,
        "total_interval_available": False,
        "total_interval_reason": reason,
        "total_residual_count": total_residual_count,
        "total_absolute_error_quantile": None,
        "observed_total_backtest_coverage_percent": None,
        "total_lower_bound": None,
        "total_upper_bound": None,
        "intervals": [],
    }
