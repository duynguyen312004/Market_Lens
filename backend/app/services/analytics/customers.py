from math import ceil
from typing import Any

import pandas as pd

from backend.app.services.analytics.common import number, percent
from backend.app.services.analytics.cohorts import (
    calculate_customer_cohorts,
)
from backend.app.services.analytics.rfm import calculate_rfm


CUSTOMER_SEGMENTS = ("new", "returning", "vip")


def calculate_customer_analytics(
    completed: pd.DataFrame,
    *,
    available: bool = True,
) -> dict[str, Any]:
    if not available:
        snapshot = (
            completed["order_date"].max().normalize()
            + pd.Timedelta(days=1)
        )
        order_months = completed["order_date"].dt.to_period("M")
        period_from = str(order_months.min())
        period_to = str(order_months.max())
        return {
            "available": False,
            "reason": "MISSING_CUSTOMER_IDENTIFIERS",
            "segments": {segment: 0 for segment in CUSTOMER_SEGMENTS},
            "repeat_customer_count": 0,
            "repeat_customer_rate_percent": 0.0,
            "revenue_by_segment": [
                {
                    "segment": segment,
                    "customer_count": 0,
                    "revenue": 0,
                    "revenue_share_percent": 0.0,
                }
                for segment in CUSTOMER_SEGMENTS
            ],
            "potential_count": 0,
            "potential_customers": [],
            "top_customers": [],
            "rfm": {
                "available": False,
                "reason": "MISSING_CUSTOMER_IDENTIFIERS",
                "snapshot_date": snapshot.date().isoformat(),
                "customer_count": 0,
                "minimum_customers": 5,
                "score_scale": 5,
                "scoring_method": "empirical_quintile_average_rank",
                "segment_rules_version": "rfm_v1",
                "segments": {
                    segment: 0
                    for segment in (
                        "new",
                        "champion",
                        "loyal",
                        "at_risk",
                        "regular",
                    )
                },
                "segment_revenue": [],
                "top_customers": [],
                "at_risk_customers": [],
            },
            "cohort_analysis": {
                "available": False,
                "reason": "MISSING_CUSTOMER_IDENTIFIERS",
                "method": "acquisition_month_completed_orders",
                "period_from": period_from,
                "period_to": period_to,
                "observed_month_count": 0,
                "minimum_month_count": 3,
                "customer_count": 0,
                "cohort_count": 0,
                "maximum_observed_month_index": 0,
                "cohorts": [],
            },
        }

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
        .sort_values(
            ["revenue", "customer_id"],
            ascending=[False, True],
        )
        .reset_index(drop=True)
    )

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
                "revenue": number(row.revenue),
                "order_count": int(row.order_count),
                "quantity": int(row.quantity),
                "first_order_date": row.first_order_date.date().isoformat(),
                "last_order_date": row.last_order_date.date().isoformat(),
                "segment": segment,
            }
        )

    segments = {
        segment: sum(
            item["segment"] == segment for item in customers
        )
        for segment in CUSTOMER_SEGMENTS
    }
    repeat_customer_count = sum(
        customer["order_count"] >= 2 for customer in customers
    )
    total_revenue = sum(float(customer["revenue"]) for customer in customers)
    revenue_by_segment = []
    for segment in CUSTOMER_SEGMENTS:
        segment_customers = [
            customer
            for customer in customers
            if customer["segment"] == segment
        ]
        segment_revenue = sum(
            float(customer["revenue"])
            for customer in segment_customers
        )
        revenue_by_segment.append(
            {
                "segment": segment,
                "customer_count": len(segment_customers),
                "revenue": number(segment_revenue),
                "revenue_share_percent": percent(
                    segment_revenue,
                    total_revenue,
                ),
            }
        )

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
        "available": True,
        "reason": None,
        "segments": segments,
        "repeat_customer_count": repeat_customer_count,
        "repeat_customer_rate_percent": percent(
            repeat_customer_count,
            customer_count,
        ),
        "revenue_by_segment": revenue_by_segment,
        "potential_count": len(potential_customers),
        "potential_customers": potential_customers,
        "top_customers": customers[:5],
        "rfm": calculate_rfm(completed),
        "cohort_analysis": calculate_customer_cohorts(completed),
    }
