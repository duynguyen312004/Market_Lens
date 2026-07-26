from __future__ import annotations

from typing import Any, Literal

import pandas as pd

from backend.app.services.analytics.common import (
    growth_rate,
    number,
    percent,
)


PeriodType = Literal["month", "year"]


def calculate_period_summaries(
    completed: pd.DataFrame,
) -> dict[str, list[dict[str, Any]]]:
    """Build compact, backend-owned KPI summaries for calendar filters."""
    data_from = completed["order_date"].min().normalize()
    data_to = completed["order_date"].max().normalize()
    return {
        "months": _summaries_for_type(
            completed=completed,
            data_from=data_from,
            data_to=data_to,
            period_type="month",
        ),
        "years": _summaries_for_type(
            completed=completed,
            data_from=data_from,
            data_to=data_to,
            period_type="year",
        ),
    }


def _summaries_for_type(
    *,
    completed: pd.DataFrame,
    data_from: pd.Timestamp,
    data_to: pd.Timestamp,
    period_type: PeriodType,
) -> list[dict[str, Any]]:
    frequency = "M" if period_type == "month" else "Y"
    calendar_periods = pd.period_range(
        data_from.to_period(frequency),
        data_to.to_period(frequency),
        freq=frequency,
    )
    return [
        _period_summary(
            completed=completed,
            data_from=data_from,
            data_to=data_to,
            calendar_period=calendar_period,
            period_type=period_type,
        )
        for calendar_period in calendar_periods
    ]


def _period_summary(
    *,
    completed: pd.DataFrame,
    data_from: pd.Timestamp,
    data_to: pd.Timestamp,
    calendar_period: pd.Period,
    period_type: PeriodType,
) -> dict[str, Any]:
    calendar_from = calendar_period.start_time.normalize()
    calendar_to = calendar_period.end_time.normalize()
    current_from = max(calendar_from, data_from)
    current_to = min(calendar_to, data_to)
    current = completed.loc[
        completed["order_date"].between(current_from, current_to)
    ]
    metrics = _metrics(current)

    offset = (
        pd.DateOffset(months=1)
        if period_type == "month"
        else pd.DateOffset(years=1)
    )
    previous_from = current_from - offset
    previous_to = current_to - offset
    comparison_available = previous_from >= data_from

    previous_metrics: dict[str, Any] | None = None
    if comparison_available:
        previous = completed.loc[
            completed["order_date"].between(previous_from, previous_to)
        ]
        previous_metrics = _metrics(previous)

    previous_revenue = (
        float(previous_metrics["total_revenue"])
        if previous_metrics is not None
        else None
    )
    current_revenue = float(metrics["total_revenue"])

    return {
        "key": (
            calendar_period.strftime("%Y-%m")
            if period_type == "month"
            else calendar_period.strftime("%Y")
        ),
        "period_type": period_type,
        "period": _date_range(current_from, current_to),
        "is_complete": (
            current_from == calendar_from and current_to == calendar_to
        ),
        **metrics,
        "comparison": {
            "available": comparison_available,
            "reason": (
                None
                if comparison_available
                else "INSUFFICIENT_COMPARISON_HISTORY"
            ),
            "previous_period": _date_range(
                previous_from,
                previous_to,
            ),
            "previous_revenue": (
                number(previous_revenue)
                if previous_revenue is not None
                else None
            ),
            "revenue_change": (
                number(current_revenue - previous_revenue)
                if previous_revenue is not None
                else None
            ),
            "growth_rate_percent": (
                growth_rate(
                    current_revenue,
                    previous_revenue,
                )
                if previous_revenue is not None
                else None
            ),
        },
    }


def _metrics(frame: pd.DataFrame) -> dict[str, Any]:
    total_revenue = float(frame["line_revenue"].sum())
    total_orders = int(frame["order_id"].nunique())
    total_quantity = int(frame["quantity"].sum())
    gross_revenue = float(
        (frame["quantity"] * frame["unit_price"]).sum()
    )
    total_discount = float(frame["discount"].sum())
    return {
        "total_revenue": number(total_revenue),
        "total_orders": total_orders,
        "total_quantity_sold": total_quantity,
        "average_order_value": number(
            total_revenue / total_orders if total_orders else 0
        ),
        "gross_revenue": number(gross_revenue),
        "total_discount": number(total_discount),
        "discount_rate_percent": percent(
            total_discount,
            gross_revenue,
        ),
    }


def _date_range(
    date_from: pd.Timestamp,
    date_to: pd.Timestamp,
) -> dict[str, str]:
    return {
        "from": date_from.date().isoformat(),
        "to": date_to.date().isoformat(),
    }
