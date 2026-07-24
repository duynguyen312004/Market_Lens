from datetime import date, timedelta
from typing import Any

import numpy as np


FORECAST_DISCLAIMER = (
    "Dự báo dựa trên dữ liệu lịch sử và chỉ mang tính tham khảo."
)


def calculate_forecast(
    revenue_by_date: list[dict[str, Any]],
) -> tuple[dict[str, Any], list[str]]:
    history_days = len(revenue_by_date)
    if history_days < 14:
        return (
            {
                "available": False,
                "method": None,
                "history_days": history_days,
                "forecast_days": 0,
                "forecast_total": None,
                "change_vs_last_7_days_percent": None,
                "points": [],
                "disclaimer": FORECAST_DISCLAIMER,
            },
            ["INSUFFICIENT_HISTORY"],
        )

    values = np.array(
        [float(item["revenue"]) for item in revenue_by_date],
        dtype=float,
    )

    if history_days < 30:
        method = "moving_average_7_days"
        prediction = max(0.0, float(values[-7:].mean()))
        predictions = np.repeat(prediction, 7)
    else:
        method = "linear_trend_30_days"
        training_values = values[-30:]
        x = np.arange(len(training_values), dtype=float)
        slope, intercept = np.polyfit(x, training_values, 1)
        future_x = np.arange(
            len(training_values),
            len(training_values) + 7,
            dtype=float,
        )
        predictions = np.maximum(0.0, slope * future_x + intercept)

    rounded_predictions = [int(round(value)) for value in predictions]
    last_date = date.fromisoformat(revenue_by_date[-1]["date"])
    points = [
        {
            "date": (last_date + timedelta(days=index + 1)).isoformat(),
            "predicted_revenue": predicted,
        }
        for index, predicted in enumerate(rounded_predictions)
    ]
    forecast_total = sum(rounded_predictions)
    last_7_total = float(values[-7:].sum())
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
            "forecast_days": 7,
            "forecast_total": forecast_total,
            "change_vs_last_7_days_percent": change_percent,
            "points": points,
            "disclaimer": FORECAST_DISCLAIMER,
        },
        [],
    )
