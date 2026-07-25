from typing import Any

import pandas as pd

from backend.app.services.analytics.common import percent


ORDER_STATUSES = ("completed", "cancelled", "returned")


def calculate_order_analytics(
    frame: pd.DataFrame,
    completed: pd.DataFrame,
) -> dict[str, Any]:
    status_counts = frame.groupby("order_status")["order_id"].nunique().to_dict()
    by_status = {
        status: int(status_counts.get(status, 0))
        for status in ORDER_STATUSES
    }
    total_orders = sum(by_status.values())
    completed_orders = by_status["completed"]

    return {
        "total_orders_all_statuses": total_orders,
        "by_status": by_status,
        "status_rates_percent": {
            status: percent(count, total_orders)
            for status, count in by_status.items()
        },
        "average_items_per_completed_order": round(
            float(completed["quantity"].sum()) / completed_orders
            if completed_orders
            else 0,
            6,
        ),
    }
