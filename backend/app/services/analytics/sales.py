from math import ceil
from typing import Any

import pandas as pd

from backend.app.services.analytics.common import number, percent
from backend.app.services.analytics.product_intelligence import (
    calculate_discount_analysis,
    calculate_product_intelligence,
)


WEEKDAYS = (
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
)


def revenue_by_date(completed: pd.DataFrame) -> list[dict[str, Any]]:
    daily = completed.groupby("order_date")["line_revenue"].sum().sort_index()
    full_range = pd.date_range(daily.index.min(), daily.index.max(), freq="D")
    daily = daily.reindex(full_range, fill_value=0)
    return [
        {
            "date": timestamp.date().isoformat(),
            "revenue": number(revenue),
        }
        for timestamp, revenue in daily.items()
    ]


def revenue_by_month(completed: pd.DataFrame) -> list[dict[str, Any]]:
    month_periods = completed["order_date"].dt.to_period("M")
    if month_periods.nunique() < 2:
        return []

    monthly = (
        completed.assign(_month=month_periods.astype(str))
        .groupby("_month")["line_revenue"]
        .sum()
        .sort_index()
    )
    return [
        {"month": str(month), "revenue": number(revenue)}
        for month, revenue in monthly.items()
    ]


def product_analytics(completed: pd.DataFrame) -> list[dict[str, Any]]:
    grouped = (
        completed.groupby(
            ["product_id", "product_name", "category"],
            as_index=False,
        )
        .agg(
            revenue=("line_revenue", "sum"),
            quantity=("quantity", "sum"),
            order_count=("order_id", "nunique"),
        )
    )
    return [
        {
            "product_id": str(row.product_id),
            "product_name": str(row.product_name),
            "category": str(row.category),
            "revenue": number(row.revenue),
            "quantity": int(row.quantity),
            "order_count": int(row.order_count),
        }
        for row in grouped.itertuples(index=False)
    ]


def category_analytics(completed: pd.DataFrame) -> list[dict[str, Any]]:
    total_revenue = float(completed["line_revenue"].sum())
    grouped = (
        completed.groupby("category", as_index=False)
        .agg(
            revenue=("line_revenue", "sum"),
            quantity=("quantity", "sum"),
        )
        .sort_values(["revenue", "category"], ascending=[False, True])
    )
    return [
        {
            "category": str(row.category),
            "revenue": number(row.revenue),
            "quantity": int(row.quantity),
            "revenue_share_percent": percent(row.revenue, total_revenue),
        }
        for row in grouped.itertuples(index=False)
    ]


def revenue_by_weekday(completed: pd.DataFrame) -> list[dict[str, Any]]:
    grouped = (
        completed.assign(_weekday=completed["order_date"].dt.dayofweek)
        .groupby("_weekday")
        .agg(
            revenue=("line_revenue", "sum"),
            order_count=("order_id", "nunique"),
        )
    )
    total_revenue = float(completed["line_revenue"].sum())
    return [
        {
            "weekday": WEEKDAYS[index],
            "weekday_index": index,
            "revenue": number(
                grouped.at[index, "revenue"]
                if index in grouped.index
                else 0
            ),
            "order_count": int(
                grouped.at[index, "order_count"]
                if index in grouped.index
                else 0
            ),
            "revenue_share_percent": percent(
                grouped.at[index, "revenue"]
                if index in grouped.index
                else 0,
                total_revenue,
            ),
        }
        for index in range(7)
    ]


def build_sales_result(
    *,
    completed: pd.DataFrame,
    daily_revenue: list[dict[str, Any]],
    product_rows: list[dict[str, Any]],
    category_rows: list[dict[str, Any]],
) -> dict[str, Any]:
    net_revenue = float(completed["line_revenue"].sum())
    gross_revenue = float(
        (completed["quantity"] * completed["unit_price"]).sum()
    )
    total_discount = float(completed["discount"].sum())
    sorted_products = sorted(
        product_rows,
        key=lambda item: (-item["revenue"], item["product_id"]),
    )
    pareto_product_count = max(1, ceil(len(sorted_products) * 0.20))
    pareto_revenue = sum(
        float(item["revenue"])
        for item in sorted_products[:pareto_product_count]
    )

    return {
        "gross_revenue": number(gross_revenue),
        "total_discount": number(total_discount),
        "discount_rate_percent": percent(total_discount, gross_revenue),
        "revenue_by_month": revenue_by_month(completed),
        "revenue_by_weekday": revenue_by_weekday(completed),
        "revenue_by_category": category_rows,
        "top_products_by_revenue": sorted_products[:5],
        "top_products_by_quantity": sorted(
            product_rows,
            key=lambda item: (-item["quantity"], item["product_id"]),
        )[:5],
        "lowest_quantity_products": sorted(
            product_rows,
            key=lambda item: (item["quantity"], item["product_id"]),
        )[:5],
        "peak_revenue_day": _extreme_revenue_day(
            daily_revenue,
            highest=True,
        ),
        "lowest_nonzero_revenue_day": _extreme_revenue_day(
            daily_revenue,
            highest=False,
        ),
        "concentration": {
            "top_product_revenue_share_percent": percent(
                sorted_products[0]["revenue"] if sorted_products else 0,
                net_revenue,
            ),
            "top_category_revenue_share_percent": percent(
                category_rows[0]["revenue"] if category_rows else 0,
                net_revenue,
            ),
            "top_20_percent_product_count": pareto_product_count,
            "top_20_percent_products_revenue_share_percent": percent(
                pareto_revenue,
                net_revenue,
            ),
        },
        "product_intelligence": calculate_product_intelligence(
            completed,
            product_rows,
        ),
        "discount_analysis": calculate_discount_analysis(completed),
    }


def _extreme_revenue_day(
    daily_revenue: list[dict[str, Any]],
    *,
    highest: bool,
) -> dict[str, Any] | None:
    candidates = daily_revenue
    if not highest:
        candidates = [
            item
            for item in daily_revenue
            if float(item["revenue"]) > 0
        ]
    if not candidates:
        return None

    return dict(
        min(
            candidates,
            key=lambda item: (
                -float(item["revenue"])
                if highest
                else float(item["revenue"]),
                item["date"],
            ),
        )
    )
