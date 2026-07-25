from datetime import date, timedelta
from typing import Any

import numpy as np

from .evaluation import build_selected_evaluation
from .methods import (
    FORECAST_HORIZON_DAYS,
    MINIMUM_FORECAST_HISTORY_DAYS,
    ForecastMethod,
    predict_revenue,
    round_predictions,
)
from .selection import select_forecast_model
from .uncertainty import calculate_forecast_uncertainty


FORECAST_DISCLAIMER = (
    "Forecasts are based on historical data and are provided for reference only."
)


def calculate_forecast(
    revenue_by_date: list[dict[str, Any]],
) -> tuple[dict[str, Any], list[str]]:
    history_days = len(revenue_by_date)
    forecast_available = history_days >= MINIMUM_FORECAST_HISTORY_DAYS
    selection = select_forecast_model(revenue_by_date)
    evaluation = build_selected_evaluation(
        revenue_by_date,
        selection,
        forecast_available=forecast_available,
    )
    if not forecast_available:
        uncertainty_result = calculate_forecast_uncertainty(selection, [])
        uncertainty = {
            key: value
            for key, value in uncertainty_result.items()
            if key != "intervals"
        }
        return (
            {
                "available": False,
                "method": None,
                "history_days": history_days,
                "forecast_days": 0,
                "forecast_total": None,
                "change_vs_last_7_days_percent": None,
                "points": [],
                "selection": selection.to_contract(),
                "evaluation": evaluation,
                "uncertainty": uncertainty,
                "disclaimer": FORECAST_DISCLAIMER,
            },
            ["INSUFFICIENT_HISTORY"],
        )

    values = np.array(
        [float(item["revenue"]) for item in revenue_by_date],
        dtype=float,
    )
    method: ForecastMethod = (
        selection.selected_method or "moving_average_7_days"
    )
    rounded_predictions = round_predictions(
        predict_revenue(method, values)
    ).tolist()
    uncertainty_result = calculate_forecast_uncertainty(
        selection,
        rounded_predictions,
    )
    intervals = uncertainty_result["intervals"]
    uncertainty = {
        key: value
        for key, value in uncertainty_result.items()
        if key != "intervals"
    }
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
    last_7_total = float(values[-FORECAST_HORIZON_DAYS:].sum())
    if last_7_total > 0:
        change_percent = round(
            (forecast_total - last_7_total) / last_7_total * 100,
            6,
        )
    elif forecast_total == 0:
        change_percent = 0.0
    else:
        change_percent = None

    return (
        {
            "available": True,
            "method": method,
            "history_days": history_days,
            "forecast_days": FORECAST_HORIZON_DAYS,
            "forecast_total": forecast_total,
            "change_vs_last_7_days_percent": change_percent,
            "points": points,
            "selection": selection.to_contract(),
            "evaluation": evaluation,
            "uncertainty": uncertainty,
            "disclaimer": FORECAST_DISCLAIMER,
        },
        [],
    )
