from datetime import date, timedelta
from typing import Any

import numpy as np

from .evaluation import build_selected_evaluation
from .methods import ForecastMethod, predict_revenue, round_predictions
from .selection import select_forecast_model
from .uncertainty import calculate_forecast_uncertainty


FORECAST_HORIZONS = (7, 30)
MINIMUM_HISTORY_BY_HORIZON = {7: 14, 30: 60}
FORECAST_DISCLAIMER = (
    "Forecasts are based on historical data and are provided for reference only."
)


def calculate_forecast(
    revenue_by_date: list[dict[str, Any]],
) -> tuple[dict[str, Any], list[str]]:
    horizons = [
        _calculate_horizon(
            revenue_by_date=revenue_by_date,
            horizon_days=horizon_days,
        )
        for horizon_days in FORECAST_HORIZONS
    ]
    warnings = (
        []
        if horizons[0]["available"]
        else ["INSUFFICIENT_HISTORY"]
    )
    return (
        {
            "default_horizon_days": 7,
            "horizons": horizons,
        },
        warnings,
    )


def _calculate_horizon(
    *,
    revenue_by_date: list[dict[str, Any]],
    horizon_days: int,
) -> dict[str, Any]:
    history_days = len(revenue_by_date)
    minimum_history_days = MINIMUM_HISTORY_BY_HORIZON[horizon_days]
    forecast_available = history_days >= minimum_history_days
    selection = select_forecast_model(
        revenue_by_date,
        horizon_days=horizon_days,
    )
    evaluation = build_selected_evaluation(
        revenue_by_date,
        selection,
        forecast_available=forecast_available,
    )
    if not forecast_available:
        uncertainty = _public_uncertainty(
            calculate_forecast_uncertainty(selection, [])
        )
        return {
            "available": False,
            "reason": "INSUFFICIENT_HISTORY",
            "horizon_days": horizon_days,
            "minimum_history_days": minimum_history_days,
            "method": None,
            "history_days": history_days,
            "forecast_total": None,
            "previous_period_total": None,
            "change_vs_previous_period_percent": None,
            "total_lower_bound": None,
            "total_upper_bound": None,
            "points": [],
            "selection": selection.to_contract(),
            "evaluation": evaluation,
            "uncertainty": uncertainty,
            "disclaimer": FORECAST_DISCLAIMER,
        }

    values = np.array(
        [float(item["revenue"]) for item in revenue_by_date],
        dtype=float,
    )
    method: ForecastMethod = (
        selection.selected_method or "moving_average_7_days"
    )
    rounded_predictions = round_predictions(
        predict_revenue(
            method,
            values,
            horizon_days=horizon_days,
        )
    ).tolist()
    uncertainty_result = calculate_forecast_uncertainty(
        selection,
        rounded_predictions,
    )
    intervals = uncertainty_result["intervals"]
    last_date = date.fromisoformat(str(revenue_by_date[-1]["date"]))
    points = [
        {
            "date": (last_date + timedelta(days=index + 1)).isoformat(),
            "predicted_revenue": predicted,
            "lower_bound": (
                intervals[index]["lower_bound"]
                if intervals
                else None
            ),
            "upper_bound": (
                intervals[index]["upper_bound"]
                if intervals
                else None
            ),
        }
        for index, predicted in enumerate(rounded_predictions)
    ]
    forecast_total = sum(rounded_predictions)
    previous_period_total = float(values[-horizon_days:].sum())

    return {
        "available": True,
        "reason": None,
        "horizon_days": horizon_days,
        "minimum_history_days": minimum_history_days,
        "method": method,
        "history_days": history_days,
        "forecast_total": forecast_total,
        "previous_period_total": int(round(previous_period_total)),
        "change_vs_previous_period_percent": _change_percent(
            current=float(forecast_total),
            previous=previous_period_total,
        ),
        "total_lower_bound": uncertainty_result["total_lower_bound"],
        "total_upper_bound": uncertainty_result["total_upper_bound"],
        "points": points,
        "selection": selection.to_contract(),
        "evaluation": evaluation,
        "uncertainty": _public_uncertainty(uncertainty_result),
        "disclaimer": FORECAST_DISCLAIMER,
    }


def _change_percent(
    *,
    current: float,
    previous: float,
) -> float | None:
    if previous > 0:
        result = round((current - previous) / previous * 100, 6)
        return 0.0 if abs(result) < 0.0001 else result
    if current == 0:
        return 0.0
    return None


def _public_uncertainty(result: dict[str, Any]) -> dict[str, Any]:
    return {
        key: value
        for key, value in result.items()
        if key
        not in {
            "intervals",
            "total_lower_bound",
            "total_upper_bound",
        }
    }
