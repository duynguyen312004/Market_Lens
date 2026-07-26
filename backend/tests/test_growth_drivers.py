import pandas as pd

from backend.app.services.analytics.growth_drivers import (
    calculate_growth_drivers,
)


def test_growth_drivers_rank_by_revenue_change_not_percentage() -> None:
    frame = pd.DataFrame(
        [
            _row("PREV-P1", "2026-01-01", "P1", "Small", "A", 100),
            _row("PREV-P2", "2026-01-14", "P2", "Core", "A", 1_000),
            _row("PREV-P4", "2026-01-14", "P4", "Old", "B", 300),
            _row("CURR-P1", "2026-02-01", "P1", "Small", "A", 200),
            _row("CURR-P2", "2026-02-14", "P2", "Core", "A", 1_200),
            _row("CURR-P3", "2026-02-14", "P3", "New", "B", 50),
        ]
    )

    result = calculate_growth_drivers(frame)
    period = _period(result, "month")

    assert period["available"] is True
    assert period["current_period"] == {
        "from": "2026-02-01",
        "to": "2026-02-14",
    }
    assert period["previous_period"] == {
        "from": "2026-01-01",
        "to": "2026-01-14",
    }
    assert [
        row["product_id"] for row in period["product_growth_drivers"]
    ] == ["P2", "P1", "P3"]
    assert period["product_growth_drivers"][0]["growth_rate_percent"] == 20
    assert period["product_growth_drivers"][1]["growth_rate_percent"] == 100
    assert period["product_growth_drivers"][2]["change_type"] == "new"
    assert period["product_growth_drivers"][2][
        "growth_rate_percent"
    ] is None
    assert period["product_decline_drivers"][0]["product_id"] == "P4"
    assert period["product_decline_drivers"][0]["change_type"] == "inactive"
    assert period["net_revenue_change"] == 50


def test_growth_driver_contributions_sum_within_each_direction() -> None:
    frame = pd.DataFrame(
        [
            _row("PREV-P1", "2026-01-01", "P1", "One", "A", 100),
            _row("PREV-P2", "2026-01-14", "P2", "Two", "B", 200),
            _row("CURR-P1", "2026-02-01", "P1", "One", "A", 200),
            _row("CURR-P3", "2026-02-14", "P3", "Three", "C", 100),
        ]
    )

    period = _period(calculate_growth_drivers(frame), "month")

    assert sum(
        row["contribution_to_direction_percent"]
        for row in period["product_growth_drivers"]
    ) == 100
    assert sum(
        row["contribution_to_direction_percent"]
        for row in period["product_decline_drivers"]
    ) == 100


def test_year_comparison_requires_the_same_period_last_year() -> None:
    frame = pd.DataFrame(
        [
            _row("FIRST", "2026-01-01", "P1", "One", "A", 100),
            _row("LAST", "2026-12-31", "P1", "One", "A", 100),
        ]
    )

    result = calculate_growth_drivers(frame)

    assert result["default_comparison_type"] == "month"
    assert _period(result, "year")["available"] is False
    assert _period(result, "year")["required_history_from"] == (
        "2025-01-01"
    )


def _row(
    order_id: str,
    order_date: str,
    product_id: str,
    product_name: str,
    category: str,
    revenue: int,
) -> dict:
    return {
        "order_id": order_id,
        "order_date": pd.Timestamp(order_date),
        "product_id": product_id,
        "product_name": product_name,
        "category": category,
        "line_revenue": revenue,
        "quantity": 1,
    }


def _period(result: dict, comparison_type: str) -> dict:
    return next(
        period
        for period in result["periods"]
        if period["comparison_type"] == comparison_type
    )
