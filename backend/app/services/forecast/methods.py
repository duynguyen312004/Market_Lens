from typing import Literal

import numpy as np


FORECAST_HORIZON_DAYS = 7
LINEAR_TRAINING_DAYS = 30
MOVING_AVERAGE_DAYS = 7
MINIMUM_FORECAST_HISTORY_DAYS = 14
WEEKDAY_AVERAGE_WEEKS = 4

ForecastMethod = Literal[
    "seasonal_naive_7_days",
    "moving_average_7_days",
    "weekday_average_4_weeks",
    "linear_trend_30_days",
]
FORECAST_CANDIDATES: tuple[ForecastMethod, ...] = (
    "seasonal_naive_7_days",
    "moving_average_7_days",
    "weekday_average_4_weeks",
    "linear_trend_30_days",
)
METHOD_COMPLEXITY: dict[ForecastMethod, int] = {
    "seasonal_naive_7_days": 0,
    "moving_average_7_days": 1,
    "weekday_average_4_weeks": 2,
    "linear_trend_30_days": 3,
}


def minimum_training_days(method: ForecastMethod) -> int:
    if method in (
        "seasonal_naive_7_days",
        "moving_average_7_days",
    ):
        return MINIMUM_FORECAST_HISTORY_DAYS
    if method == "weekday_average_4_weeks":
        return FORECAST_HORIZON_DAYS * WEEKDAY_AVERAGE_WEEKS
    return LINEAR_TRAINING_DAYS


def predict_revenue(
    method: ForecastMethod,
    training_values: np.ndarray,
    *,
    horizon_days: int = FORECAST_HORIZON_DAYS,
) -> np.ndarray:
    if method == "seasonal_naive_7_days":
        recent_week = training_values[-FORECAST_HORIZON_DAYS:]
        repetitions = int(np.ceil(horizon_days / len(recent_week)))
        return np.tile(recent_week, repetitions)[:horizon_days]

    if method == "moving_average_7_days":
        prediction = max(
            0.0,
            float(training_values[-MOVING_AVERAGE_DAYS:].mean()),
        )
        return np.repeat(prediction, horizon_days)

    if method == "weekday_average_4_weeks":
        predictions = []
        training_days = len(training_values)
        for offset in range(horizon_days):
            weekday_history = [
                training_values[
                    training_days
                    + offset
                    - FORECAST_HORIZON_DAYS * week
                ]
                for week in range(1, WEEKDAY_AVERAGE_WEEKS + 1)
            ]
            predictions.append(max(0.0, float(np.mean(weekday_history))))
        return np.array(predictions, dtype=float)

    recent_values = training_values[-LINEAR_TRAINING_DAYS:]
    x = np.arange(len(recent_values), dtype=float)
    slope, intercept = np.polyfit(x, recent_values, 1)
    future_x = np.arange(
        len(recent_values),
        len(recent_values) + horizon_days,
        dtype=float,
    )
    return np.maximum(0.0, slope * future_x + intercept)


def round_predictions(predictions: np.ndarray) -> np.ndarray:
    return np.rint(predictions).astype(int)
