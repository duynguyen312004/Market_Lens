import pandas as pd
import pytest

from backend.app.services.analytics.period_summaries import (
    calculate_period_summaries,
)


def test_period_summaries_calculate_month_kpis_and_comparison() -> None:
    frame = pd.DataFrame(
        [
            _row("JAN-1", "2026-01-01", 1, 100, 10),
            _row("JAN-2", "2026-01-15", 2, 200, 20),
            _row("FEB-1", "2026-02-01", 3, 100, 15),
            _row("FEB-2", "2026-02-15", 1, 500, 25),
        ]
    )

    result = calculate_period_summaries(frame)
    february = result["months"][1]

    assert february["key"] == "2026-02"
    assert february["period"] == {
        "from": "2026-02-01",
        "to": "2026-02-15",
    }
    assert february["is_complete"] is False
    assert february["total_revenue"] == 760
    assert february["total_orders"] == 2
    assert february["total_quantity_sold"] == 4
    assert february["average_order_value"] == 380
    assert february["gross_revenue"] == 800
    assert february["total_discount"] == 40
    assert february["comparison"] == {
        "available": True,
        "reason": None,
        "previous_period": {
            "from": "2026-01-01",
            "to": "2026-01-15",
        },
        "previous_revenue": 470,
        "revenue_change": 290,
        "growth_rate_percent": pytest.approx(61.702128),
    }


def test_first_period_has_kpis_without_an_unsafe_comparison() -> None:
    frame = pd.DataFrame(
        [_row("ONLY", "2026-03-10", 1, 100, 0)]
    )

    march = calculate_period_summaries(frame)["months"][0]

    assert march["total_revenue"] == 100
    assert march["comparison"]["available"] is False
    assert march["comparison"]["previous_revenue"] is None
    assert march["comparison"]["previous_period"] == {
        "from": "2026-02-10",
        "to": "2026-02-10",
    }


def _row(
    order_id: str,
    order_date: str,
    quantity: int,
    unit_price: int,
    discount: int,
) -> dict:
    return {
        "order_id": order_id,
        "order_date": pd.Timestamp(order_date),
        "quantity": quantity,
        "unit_price": unit_price,
        "discount": discount,
        "line_revenue": quantity * unit_price - discount,
    }
