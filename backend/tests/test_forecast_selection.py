from datetime import date, timedelta
from pathlib import Path
from random import Random

import numpy as np
import pytest

from backend.app.services.analytics import calculate_analytics
from backend.app.services.file_reader import read_sales_file
from backend.app.services.forecast.methods import (
    predict_revenue,
    round_predictions,
)
from backend.app.services.validator import validate_sales_data


PROJECT_ROOT = Path(__file__).resolve().parents[2]
from backend.app.services.forecast.selection import (
    select_forecast_model,
)
from backend.app.services.forecast.uncertainty import (
    calculate_forecast_uncertainty,
)


def test_constant_series_selects_simplest_candidate_on_exact_tie() -> None:
    selection = select_forecast_model(_daily_points([100.0] * 91))

    assert selection.available is True
    assert selection.selected_method == "seasonal_naive_7_days"
    assert selection.selection_reason == "LOWEST_MAE"
    assert len(selection.fold_origins) == 8
    assert all(
        candidate.metrics["mae"] == 0
        for candidate in selection.candidates
    )


def test_linear_series_selects_linear_trend() -> None:
    values = [100_000 + index * 25_000 for index in range(84)]

    selection = select_forecast_model(_daily_points(values))

    assert selection.selected_method == "linear_trend_30_days"
    selected = selection.selected_candidate
    assert selected is not None
    assert selected.metrics["mae"] == 0
    assert selection.selection_reason == "LOWEST_MAE"


def test_weekday_average_reconstructs_four_week_pattern() -> None:
    weekly_pattern = np.array(
        [100_000, 120_000, 140_000, 160_000, 180_000, 240_000, 220_000],
        dtype=float,
    )
    training = np.tile(weekly_pattern, 4)

    predictions = predict_revenue(
        "weekday_average_4_weeks",
        training,
    )

    assert predictions.tolist() == weekly_pattern.tolist()


def test_candidates_use_identical_validation_origins() -> None:
    values = [100_000 + (index % 7) * 10_000 for index in range(84)]

    selection = select_forecast_model(_daily_points(values))

    assert len(selection.candidates) == 4
    assert all(
        tuple(fold.origin for fold in candidate.folds)
        == selection.fold_origins
        for candidate in selection.candidates
    )


def test_validation_actuals_do_not_leak_into_fold_predictions() -> None:
    original = [100_000 + index * 1_000 for index in range(84)]
    modified = original.copy()
    modified[-7:] = [9_000_000] * 7

    before = select_forecast_model(_daily_points(original))
    after = select_forecast_model(_daily_points(modified))

    for method in (
        "seasonal_naive_7_days",
        "moving_average_7_days",
        "weekday_average_4_weeks",
        "linear_trend_30_days",
    ):
        before_candidate = next(
            item for item in before.candidates if item.method == method
        )
        after_candidate = next(
            item for item in after.candidates if item.method == method
        )
        assert (
            before_candidate.folds[-1].predictions
            == after_candidate.folds[-1].predictions
        )
        assert (
            before_candidate.folds[-1].actual
            != after_candidate.folds[-1].actual
        )


@pytest.mark.parametrize("days", [0, 13, 14, 27])
def test_selection_is_unavailable_before_two_folds(days: int) -> None:
    selection = select_forecast_model(
        _daily_points([100.0] * days)
    )

    assert selection.available is False
    assert selection.reason == "INSUFFICIENT_SELECTION_HISTORY"
    assert selection.selected_method is None


def test_selection_contract_has_deterministic_candidate_ranks() -> None:
    selection = select_forecast_model(
        _daily_points([100.0] * 91)
    )

    contract = selection.to_contract()

    assert contract["fold_count"] == 8
    assert contract["evaluation_points"] == 56
    assert contract["selected_method"] == "seasonal_naive_7_days"
    assert [
        candidate["method"] for candidate in contract["candidates"]
    ] == [
        "seasonal_naive_7_days",
        "moving_average_7_days",
        "weekday_average_4_weeks",
        "linear_trend_30_days",
    ]
    assert [
        candidate["rank"] for candidate in contract["candidates"]
    ] == [1, 2, 3, 4]


def test_simplicity_rule_can_select_a_candidate_ranked_second() -> None:
    random = Random(1)
    values = [
        100_000 + random.randint(-30_000, 30_000)
        for _ in range(91)
    ]

    selection = select_forecast_model(_daily_points(values))
    contract = selection.to_contract()

    assert contract["candidates"][0]["method"] == (
        "weekday_average_4_weeks"
    )
    assert selection.selected_method == "moving_average_7_days"
    assert selection.selection_reason == "SIMPLER_WITHIN_FIVE_PERCENT"


def test_uncertainty_uses_selected_candidate_residuals() -> None:
    values = [
        100_000 + index * 2_000 + (5_000 if index % 2 else -5_000)
        for index in range(91)
    ]
    selection = select_forecast_model(_daily_points(values))
    selected_method = selection.selected_method
    assert selected_method is not None
    predictions = round_predictions(
        predict_revenue(
            selected_method,
            _as_array(values),
        )
    ).tolist()

    uncertainty = calculate_forecast_uncertainty(
        selection,
        predictions,
    )

    assert uncertainty["available"] is True
    assert uncertainty["residual_count"] == 56
    assert uncertainty["absolute_error_quantile"] is not None
    assert len(uncertainty["intervals"]) == 7
    assert all(
        interval["lower_bound"] >= 0
        and interval["lower_bound"] <= prediction
        and interval["upper_bound"] >= prediction
        for interval, prediction in zip(
            uncertainty["intervals"],
            predictions,
            strict=True,
        )
    )


def test_uncertainty_requires_four_folds() -> None:
    selection = select_forecast_model(
        _daily_points([100.0] * 44)
    )
    uncertainty = calculate_forecast_uncertainty(
        selection,
        [100] * 7,
    )

    assert selection.available is True
    assert len(selection.fold_origins) == 2
    assert uncertainty["available"] is False
    assert uncertainty["reason"] == "INSUFFICIENT_RESIDUALS"
    assert uncertainty["residual_count"] == 14


def test_rich_demo_forecast_selection_matches_oracle() -> None:
    path = (
        PROJECT_ROOT
        / "sample_data"
        / "marketlens_ds_demo_365_days.csv"
    )
    frame = validate_sales_data(
        read_sales_file(
            file_name=path.name,
            content=path.read_bytes(),
        ),
        max_rows=50_000,
    )
    analytics = calculate_analytics(frame)

    selection = select_forecast_model(analytics["revenue_by_date"])
    contract = selection.to_contract()

    assert contract["fold_count"] == 8
    assert contract["candidates"][0]["method"] == "moving_average_7_days"
    assert contract["candidates"][0]["metrics"]["mae"] == pytest.approx(
        5_659_224.61
    )
    assert selection.selected_method == "moving_average_7_days"
    assert selection.selection_reason == "LOWEST_MAE"


def _daily_points(values: list[float]) -> list[dict[str, str | float]]:
    start = date(2026, 1, 1)
    return [
        {
            "date": (start + timedelta(days=index)).isoformat(),
            "revenue": value,
        }
        for index, value in enumerate(values)
    ]


def _as_array(values: list[float]) -> np.ndarray:
    return np.array(values, dtype=float)
