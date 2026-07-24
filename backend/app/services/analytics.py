from math import ceil
from typing import Any

import pandas as pd

from backend.app.core.errors import AppError


def calculate_analytics(frame: pd.DataFrame) -> dict[str, Any]:
    completed = frame.loc[frame["order_status"] == "completed"].copy()
    if completed.empty:
        raise AppError(
            code="NO_COMPLETED_ORDERS",
            message="File không có đơn hàng completed để phân tích.",
            status_code=400,
        )

    completed["order_date"] = pd.to_datetime(completed["order_date"]).dt.normalize()
    revenue_by_date = _revenue_by_date(completed)
    history_days = len(revenue_by_date)
    growth_rate, growth_warnings = _growth_rate(revenue_by_date)

    product_rows = _product_analytics(completed)
    category_rows = _category_analytics(completed)
    customer_result = _customer_analytics(completed)
    revenue_by_month = _revenue_by_month(completed)

    date_from = completed["order_date"].min().date().isoformat()
    date_to = completed["order_date"].max().date().isoformat()

    return {
        "period": {
            "from": date_from,
            "to": date_to,
            "history_days": history_days,
        },
        "summary": {
            "total_revenue": _number(completed["line_revenue"].sum()),
            "total_orders": int(completed["order_id"].nunique()),
            "total_customers": int(completed["customer_id"].nunique()),
            "total_quantity_sold": int(completed["quantity"].sum()),
            "growth_rate_percent": growth_rate,
        },
        "revenue_by_date": revenue_by_date,
        "sales": {
            "revenue_by_month": revenue_by_month,
            "revenue_by_category": category_rows,
            "top_products_by_revenue": sorted(
                product_rows,
                key=lambda item: (-item["revenue"], item["product_id"]),
            )[:5],
            "top_products_by_quantity": sorted(
                product_rows,
                key=lambda item: (-item["quantity"], item["product_id"]),
            )[:5],
            "lowest_quantity_products": sorted(
                product_rows,
                key=lambda item: (item["quantity"], item["product_id"]),
            )[:5],
        },
        "customers": customer_result,
        "warnings": growth_warnings,
    }


def _revenue_by_date(completed: pd.DataFrame) -> list[dict[str, Any]]:
    daily = completed.groupby("order_date")["line_revenue"].sum().sort_index()
    full_range = pd.date_range(daily.index.min(), daily.index.max(), freq="D")
    daily = daily.reindex(full_range, fill_value=0)
    return [
        {
            "date": timestamp.date().isoformat(),
            "revenue": _number(revenue),
        }
        for timestamp, revenue in daily.items()
    ]


def _revenue_by_month(completed: pd.DataFrame) -> list[dict[str, Any]]:
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
        {"month": str(month), "revenue": _number(revenue)}
        for month, revenue in monthly.items()
    ]


def _product_analytics(completed: pd.DataFrame) -> list[dict[str, Any]]:
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
            "revenue": _number(row.revenue),
            "quantity": int(row.quantity),
            "order_count": int(row.order_count),
        }
        for row in grouped.itertuples(index=False)
    ]


def _category_analytics(completed: pd.DataFrame) -> list[dict[str, Any]]:
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
            "revenue": _number(row.revenue),
            "quantity": int(row.quantity),
            "revenue_share_percent": (
                round(float(row.revenue) / total_revenue * 100, 6)
                if total_revenue > 0
                else 0.0
            ),
        }
        for row in grouped.itertuples(index=False)
    ]


def _customer_analytics(completed: pd.DataFrame) -> dict[str, Any]:
    grouped = (
        completed.groupby(
            ["customer_id", "customer_name"],
            as_index=False,
        )
        .agg(
            revenue=("line_revenue", "sum"),
            order_count=("order_id", "nunique"),
            quantity=("quantity", "sum"),
            first_order_date=("order_date", "min"),
            last_order_date=("order_date", "max"),
        )
    )
    grouped = grouped.sort_values(
        ["revenue", "customer_id"],
        ascending=[False, True],
    ).reset_index(drop=True)

    customer_count = len(grouped)
    vip_count = max(1, ceil(customer_count * 0.10))
    vip_ids = set(grouped.head(vip_count)["customer_id"].astype(str))

    customers: list[dict[str, Any]] = []
    for row in grouped.itertuples(index=False):
        customer_id = str(row.customer_id)
        if customer_id in vip_ids:
            segment = "vip"
        elif int(row.order_count) >= 2:
            segment = "returning"
        else:
            segment = "new"

        customers.append(
            {
                "customer_id": customer_id,
                "customer_name": str(row.customer_name),
                "revenue": _number(row.revenue),
                "order_count": int(row.order_count),
                "quantity": int(row.quantity),
                "first_order_date": row.first_order_date.date().isoformat(),
                "last_order_date": row.last_order_date.date().isoformat(),
                "segment": segment,
            }
        )

    segments = {
        "new": sum(item["segment"] == "new" for item in customers),
        "returning": sum(item["segment"] == "returning" for item in customers),
        "vip": sum(item["segment"] == "vip" for item in customers),
    }

    non_vip_count = customer_count - vip_count
    potential_limit = max(1, ceil(non_vip_count * 0.20))
    potential_candidates = [
        customer
        for customer in customers
        if customer["segment"] != "vip" and customer["order_count"] >= 2
    ]
    potential_customers = sorted(
        potential_candidates,
        key=lambda item: (
            -item["revenue"],
            -item["order_count"],
            -pd.Timestamp(item["last_order_date"]).value,
            item["customer_id"],
        ),
    )[:potential_limit]

    return {
        "segments": segments,
        "potential_count": len(potential_customers),
        "potential_customers": potential_customers,
        "top_customers": customers[:5],
    }


def _growth_rate(
    revenue_by_date: list[dict[str, Any]],
) -> tuple[float | None, list[str]]:
    if len(revenue_by_date) < 14:
        return None, []

    recent = sum(float(item["revenue"]) for item in revenue_by_date[-7:])
    previous = sum(float(item["revenue"]) for item in revenue_by_date[-14:-7])

    if previous > 0:
        return round((recent - previous) / previous * 100, 6), []
    if recent == 0:
        return 0.0, []
    return None, ["NO_COMPARABLE_PREVIOUS_REVENUE"]


def _number(value: Any) -> int | float:
    numeric = float(value)
    if numeric.is_integer():
        return int(numeric)
    return round(numeric, 2)
