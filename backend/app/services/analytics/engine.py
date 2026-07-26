from typing import Any

import pandas as pd

from backend.app.core.errors import AppError
from backend.app.services.analytics.common import growth_rate, number
from backend.app.services.analytics.customers import (
    calculate_customer_analytics,
)
from backend.app.services.analytics.orders import calculate_order_analytics
from backend.app.services.analytics.sales import (
    build_sales_result,
    category_analytics,
    product_analytics,
    revenue_by_date,
)


ANALYSIS_CONTRACT_VERSION = "5.0"


def calculate_analytics(
    frame: pd.DataFrame,
    *,
    customer_data_available: bool = True,
) -> dict[str, Any]:
    completed = frame.loc[frame["order_status"] == "completed"].copy()
    if completed.empty:
        raise AppError(
            code="NO_COMPLETED_ORDERS",
            message="The file has no completed orders to analyze.",
            status_code=400,
        )

    completed["order_date"] = pd.to_datetime(
        completed["order_date"]
    ).dt.normalize()
    daily_revenue = revenue_by_date(completed)
    growth_rate, growth_warnings = _growth_rate(daily_revenue)
    product_rows = product_analytics(completed)
    category_rows = category_analytics(completed)
    customer_result = calculate_customer_analytics(
        completed,
        available=customer_data_available,
    )

    completed_orders = int(completed["order_id"].nunique())
    completed_customers = (
        int(completed["customer_id"].nunique())
        if customer_data_available
        else 0
    )
    total_revenue = float(completed["line_revenue"].sum())
    date_from = completed["order_date"].min().date().isoformat()
    date_to = completed["order_date"].max().date().isoformat()

    return {
        "contract_version": ANALYSIS_CONTRACT_VERSION,
        "period": {
            "from": date_from,
            "to": date_to,
            "history_days": len(daily_revenue),
        },
        "summary": {
            "total_revenue": number(total_revenue),
            "total_orders": completed_orders,
            "total_customers": completed_customers,
            "total_quantity_sold": int(completed["quantity"].sum()),
            "growth_rate_percent": growth_rate,
            "average_order_value": number(
                total_revenue / completed_orders
            ),
            "average_revenue_per_customer": number(
                total_revenue / completed_customers
                if completed_customers
                else 0
            ),
        },
        "orders": calculate_order_analytics(frame, completed),
        "revenue_by_date": daily_revenue,
        "sales": build_sales_result(
            frame=frame,
            completed=completed,
            daily_revenue=daily_revenue,
            product_rows=product_rows,
            category_rows=category_rows,
        ),
        "customers": customer_result,
        "warnings": growth_warnings,
    }


def _growth_rate(
    daily_revenue: list[dict[str, Any]],
) -> tuple[float | None, list[str]]:
    if len(daily_revenue) < 14:
        return None, []

    recent = sum(float(item["revenue"]) for item in daily_revenue[-7:])
    previous = sum(float(item["revenue"]) for item in daily_revenue[-14:-7])

    rate = growth_rate(recent, previous)
    warnings = (
        ["NO_COMPARABLE_PREVIOUS_REVENUE"]
        if rate is None
        else []
    )
    return rate, warnings
