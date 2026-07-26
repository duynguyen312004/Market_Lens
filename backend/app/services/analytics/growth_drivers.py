from __future__ import annotations

from typing import Any, Literal

import pandas as pd

from backend.app.services.analytics.common import (
    growth_rate,
    number,
    percent,
)


GROWTH_COMPARISON_TYPES = ("month", "year")
MAX_GROWTH_DRIVERS = 5

GrowthComparisonType = Literal["month", "year"]

GrowthChangeType = Literal[
    "new",
    "growing",
    "stable",
    "declining",
    "inactive",
]


def calculate_growth_drivers(completed: pd.DataFrame) -> dict[str, Any]:
    data_from = completed["order_date"].min().normalize()
    data_to = completed["order_date"].max().normalize()
    periods = [
        _compare_periods(
            completed=completed,
            data_from=data_from,
            data_to=data_to,
            comparison_type=comparison_type,
        )
        for comparison_type in GROWTH_COMPARISON_TYPES
    ]
    return {
        "default_comparison_type": "month",
        "periods": periods,
    }


def _compare_periods(
    *,
    completed: pd.DataFrame,
    data_from: pd.Timestamp,
    data_to: pd.Timestamp,
    comparison_type: GrowthComparisonType,
) -> dict[str, Any]:
    current_from, previous_from, previous_to = _comparison_ranges(
        data_to=data_to,
        comparison_type=comparison_type,
    )
    current_period = _date_range(current_from, data_to)
    previous_period = _date_range(previous_from, previous_to)

    if data_from > previous_from:
        return _unavailable_period(
            comparison_type=comparison_type,
            required_history_from=previous_from,
            current_period=current_period,
            previous_period=previous_period,
        )

    current = completed.loc[
        completed["order_date"].between(current_from, data_to)
    ]
    previous = completed.loc[
        completed["order_date"].between(previous_from, previous_to)
    ]

    product_rows = _entity_changes(
        current=current,
        previous=previous,
        group_columns=["product_id", "product_name", "category"],
        comparison_type=comparison_type,
    )
    category_rows = _entity_changes(
        current=current,
        previous=previous,
        group_columns=["category"],
        comparison_type=comparison_type,
    )
    current_revenue = float(current["line_revenue"].sum())
    previous_revenue = float(previous["line_revenue"].sum())
    net_change = current_revenue - previous_revenue

    return {
        "available": True,
        "reason": None,
        "comparison_type": comparison_type,
        "required_history_from": previous_from.date().isoformat(),
        "current_period": current_period,
        "previous_period": previous_period,
        "current_revenue": number(current_revenue),
        "previous_revenue": number(previous_revenue),
        "net_revenue_change": number(net_change),
        "growth_rate_percent": growth_rate(
            current_revenue,
            previous_revenue,
        ),
        "positive_revenue_change": number(
            sum(
                max(0.0, float(row["revenue_change"]))
                for row in product_rows
            )
        ),
        "negative_revenue_change": number(
            sum(
                abs(min(0.0, float(row["revenue_change"])))
                for row in product_rows
            )
        ),
        "evaluated_product_count": len(product_rows),
        "evaluated_category_count": len(category_rows),
        "product_growth_drivers": _rank_changes(
            product_rows,
            positive=True,
        ),
        "product_decline_drivers": _rank_changes(
            product_rows,
            positive=False,
        ),
        "category_growth_drivers": _rank_changes(
            category_rows,
            positive=True,
        ),
        "category_decline_drivers": _rank_changes(
            category_rows,
            positive=False,
        ),
    }


def _entity_changes(
    *,
    current: pd.DataFrame,
    previous: pd.DataFrame,
    group_columns: list[str],
    comparison_type: GrowthComparisonType,
) -> list[dict[str, Any]]:
    current_metrics = _aggregate(current, group_columns)
    previous_metrics = _aggregate(previous, group_columns)
    merged = current_metrics.merge(
        previous_metrics,
        how="outer",
        on=group_columns,
        suffixes=("_current", "_previous"),
    ).fillna(0)

    raw_rows = []
    for row in merged.to_dict("records"):
        current_revenue = float(row["revenue_current"])
        previous_revenue = float(row["revenue_previous"])
        revenue_change = current_revenue - previous_revenue
        raw_rows.append(
            {
                **{
                    column: str(row[column])
                    for column in group_columns
                },
                "comparison_type": comparison_type,
                "current_revenue": number(current_revenue),
                "previous_revenue": number(previous_revenue),
                "revenue_change": number(revenue_change),
                "growth_rate_percent": growth_rate(
                    current_revenue,
                    previous_revenue,
                ),
                "current_order_count": int(row["order_count_current"]),
                "previous_order_count": int(row["order_count_previous"]),
                "order_count_change": int(
                    row["order_count_current"]
                    - row["order_count_previous"]
                ),
                "current_quantity": int(row["quantity_current"]),
                "previous_quantity": int(row["quantity_previous"]),
                "quantity_change": int(
                    row["quantity_current"]
                    - row["quantity_previous"]
                ),
                "change_type": _change_type(
                    current_revenue=current_revenue,
                    previous_revenue=previous_revenue,
                ),
            }
        )

    positive_total = sum(
        max(0.0, float(row["revenue_change"])) for row in raw_rows
    )
    negative_total = sum(
        abs(min(0.0, float(row["revenue_change"]))) for row in raw_rows
    )
    for row in raw_rows:
        revenue_change = float(row["revenue_change"])
        contribution_base = (
            positive_total if revenue_change > 0 else negative_total
        )
        row["contribution_to_direction_percent"] = percent(
            abs(revenue_change),
            contribution_base,
        )
    return raw_rows


def _aggregate(
    frame: pd.DataFrame,
    group_columns: list[str],
) -> pd.DataFrame:
    if frame.empty:
        return pd.DataFrame(
            columns=[
                *group_columns,
                "revenue",
                "order_count",
                "quantity",
            ]
        )
    return (
        frame.groupby(group_columns, as_index=False)
        .agg(
            revenue=("line_revenue", "sum"),
            order_count=("order_id", "nunique"),
            quantity=("quantity", "sum"),
        )
    )


def _change_type(
    *,
    current_revenue: float,
    previous_revenue: float,
) -> GrowthChangeType:
    if previous_revenue == 0 and current_revenue > 0:
        return "new"
    if previous_revenue > 0 and current_revenue == 0:
        return "inactive"
    if current_revenue > previous_revenue:
        return "growing"
    if current_revenue < previous_revenue:
        return "declining"
    return "stable"


def _rank_changes(
    rows: list[dict[str, Any]],
    *,
    positive: bool,
) -> list[dict[str, Any]]:
    candidates = [
        row
        for row in rows
        if (
            float(row["revenue_change"]) > 0
            if positive
            else float(row["revenue_change"]) < 0
        )
    ]
    return sorted(
        candidates,
        key=lambda row: (
            -abs(float(row["revenue_change"])),
            str(row.get("product_id") or row.get("category") or ""),
        ),
    )[:MAX_GROWTH_DRIVERS]


def _unavailable_period(
    *,
    comparison_type: GrowthComparisonType,
    required_history_from: pd.Timestamp,
    current_period: dict[str, str],
    previous_period: dict[str, str],
) -> dict[str, Any]:
    return {
        "available": False,
        "reason": "INSUFFICIENT_COMPARISON_HISTORY",
        "comparison_type": comparison_type,
        "required_history_from": required_history_from.date().isoformat(),
        "current_period": current_period,
        "previous_period": previous_period,
        "current_revenue": None,
        "previous_revenue": None,
        "net_revenue_change": None,
        "growth_rate_percent": None,
        "positive_revenue_change": None,
        "negative_revenue_change": None,
        "evaluated_product_count": 0,
        "evaluated_category_count": 0,
        "product_growth_drivers": [],
        "product_decline_drivers": [],
        "category_growth_drivers": [],
        "category_decline_drivers": [],
    }


def _comparison_ranges(
    *,
    data_to: pd.Timestamp,
    comparison_type: GrowthComparisonType,
) -> tuple[pd.Timestamp, pd.Timestamp, pd.Timestamp]:
    if comparison_type == "month":
        current_from = data_to.to_period("M").start_time.normalize()
        offset = pd.DateOffset(months=1)
    else:
        current_from = data_to.to_period("Y").start_time.normalize()
        offset = pd.DateOffset(years=1)

    return (
        current_from,
        current_from - offset,
        data_to - offset,
    )


def _date_range(
    date_from: pd.Timestamp,
    date_to: pd.Timestamp,
) -> dict[str, str]:
    return {
        "from": date_from.date().isoformat(),
        "to": date_to.date().isoformat(),
    }
