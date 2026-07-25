from typing import Any

import pandas as pd

from backend.app.services.analytics.common import number, percent


MINIMUM_COHORT_MONTHS = 3


def calculate_customer_cohorts(
    completed: pd.DataFrame,
) -> dict[str, Any]:
    order_months = completed["order_date"].dt.to_period("M")
    first_month_by_customer = (
        completed.assign(order_month=order_months)
        .groupby("customer_id")["order_month"]
        .min()
    )
    period_from = order_months.min()
    period_to = order_months.max()
    observed_month_count = _month_distance(period_from, period_to) + 1
    base_result = {
        "available": observed_month_count >= MINIMUM_COHORT_MONTHS,
        "reason": (
            None
            if observed_month_count >= MINIMUM_COHORT_MONTHS
            else "INSUFFICIENT_COHORT_HISTORY"
        ),
        "method": "acquisition_month_completed_orders",
        "period_from": str(period_from),
        "period_to": str(period_to),
        "observed_month_count": observed_month_count,
        "minimum_month_count": MINIMUM_COHORT_MONTHS,
        "customer_count": int(completed["customer_id"].nunique()),
        "cohort_count": 0,
        "maximum_observed_month_index": max(
            0,
            observed_month_count - 1,
        ),
        "cohorts": [],
    }
    if observed_month_count < MINIMUM_COHORT_MONTHS:
        return base_result

    working = completed.assign(
        activity_month=order_months,
        cohort_month=completed["customer_id"].map(
            first_month_by_customer
        ),
    )
    cohort_sizes = (
        first_month_by_customer.value_counts()
        .sort_index()
        .astype(int)
        .to_dict()
    )
    monthly_metrics = (
        working.groupby(
            ["cohort_month", "activity_month"],
            as_index=False,
        )
        .agg(
            active_customers=("customer_id", "nunique"),
            revenue=("line_revenue", "sum"),
            order_count=("order_id", "nunique"),
        )
    )
    metrics_by_cell = {
        (row.cohort_month, row.activity_month): row
        for row in monthly_metrics.itertuples(index=False)
    }

    cohorts = []
    for cohort_month, cohort_size in cohort_sizes.items():
        maximum_index = _month_distance(cohort_month, period_to)
        periods = []
        for month_index in range(maximum_index + 1):
            activity_month = cohort_month + month_index
            cell = metrics_by_cell.get(
                (cohort_month, activity_month)
            )
            active_customers = (
                int(cell.active_customers) if cell is not None else 0
            )
            periods.append(
                {
                    "month_index": month_index,
                    "activity_month": str(activity_month),
                    "active_customers": active_customers,
                    "retention_percent": percent(
                        active_customers,
                        cohort_size,
                    ),
                    "revenue": (
                        number(cell.revenue) if cell is not None else 0
                    ),
                    "order_count": (
                        int(cell.order_count) if cell is not None else 0
                    ),
                }
            )
        cohorts.append(
            {
                "cohort_month": str(cohort_month),
                "cohort_size": int(cohort_size),
                "periods": periods,
            }
        )

    return {
        **base_result,
        "cohort_count": len(cohorts),
        "cohorts": cohorts,
    }


def _month_distance(
    start: pd.Period,
    end: pd.Period,
) -> int:
    return (end.year - start.year) * 12 + end.month - start.month
