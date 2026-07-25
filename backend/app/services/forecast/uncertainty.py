from typing import Any

import numpy as np

from .selection import ModelSelection


TARGET_COVERAGE_PERCENT = 80
MINIMUM_RESIDUAL_COUNT = 28


def calculate_forecast_uncertainty(
    selection: ModelSelection,
    predictions: list[int],
) -> dict[str, Any]:
    selected = selection.selected_candidate
    if selected is None:
        return _unavailable("MODEL_SELECTION_UNAVAILABLE")

    absolute_residuals = np.abs(
        np.array(selected.residuals, dtype=float)
    )
    residual_count = len(absolute_residuals)
    if residual_count < MINIMUM_RESIDUAL_COUNT:
        return _unavailable(
            "INSUFFICIENT_RESIDUALS",
            residual_count=residual_count,
        )

    quantile = float(
        np.quantile(
            absolute_residuals,
            TARGET_COVERAGE_PERCENT / 100,
            method="higher",
        )
    )
    rounded_quantile = int(round(quantile))
    observed_coverage = round(
        float((absolute_residuals <= quantile).mean()) * 100,
        6,
    )
    return {
        "available": True,
        "reason": None,
        "method": "empirical_absolute_error_quantile",
        "target_coverage_percent": TARGET_COVERAGE_PERCENT,
        "residual_count": residual_count,
        "absolute_error_quantile": rounded_quantile,
        "observed_backtest_coverage_percent": observed_coverage,
        "intervals": [
            {
                "lower_bound": max(0, prediction - rounded_quantile),
                "upper_bound": prediction + rounded_quantile,
            }
            for prediction in predictions
        ],
    }


def _unavailable(
    reason: str,
    *,
    residual_count: int = 0,
) -> dict[str, Any]:
    return {
        "available": False,
        "reason": reason,
        "method": "empirical_absolute_error_quantile",
        "target_coverage_percent": TARGET_COVERAGE_PERCENT,
        "residual_count": residual_count,
        "absolute_error_quantile": None,
        "observed_backtest_coverage_percent": None,
        "intervals": [],
    }
