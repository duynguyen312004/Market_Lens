from math import ceil
from typing import Any, Literal

import pandas as pd

from backend.app.services.analytics.common import number, percent


MIN_RFM_CUSTOMERS = 5
RFM_SEGMENTS = ("new", "champion", "loyal", "at_risk", "regular")
RFMSegment = Literal["new", "champion", "loyal", "at_risk", "regular"]


def calculate_rfm(completed: pd.DataFrame) -> dict[str, Any]:
    snapshot = completed["order_date"].max().normalize() + pd.Timedelta(days=1)
    grouped = (
        completed.groupby(
            ["customer_id", "customer_name"],
            as_index=False,
        )
        .agg(
            last_order_date=("order_date", "max"),
            frequency=("order_id", "nunique"),
            monetary=("line_revenue", "sum"),
        )
        .sort_values("customer_id")
        .reset_index(drop=True)
    )
    customer_count = len(grouped)
    base_result = {
        "available": customer_count >= MIN_RFM_CUSTOMERS,
        "reason": (
            None
            if customer_count >= MIN_RFM_CUSTOMERS
            else "INSUFFICIENT_CUSTOMERS"
        ),
        "snapshot_date": snapshot.date().isoformat(),
        "customer_count": customer_count,
        "minimum_customers": MIN_RFM_CUSTOMERS,
        "score_scale": 5,
        "scoring_method": "empirical_quintile_average_rank",
        "segment_rules_version": "rfm_v1",
        "segments": {segment: 0 for segment in RFM_SEGMENTS},
        "segment_revenue": [],
        "top_customers": [],
        "at_risk_customers": [],
    }
    if customer_count < MIN_RFM_CUSTOMERS:
        return base_result

    grouped["recency_days"] = (
        snapshot - grouped["last_order_date"]
    ).dt.days.astype(int)
    grouped["recency_score"] = _quintile_score(
        grouped["recency_days"],
        higher_is_better=False,
    )
    grouped["frequency_score"] = _quintile_score(
        grouped["frequency"],
        higher_is_better=True,
    )
    grouped["monetary_score"] = _quintile_score(
        grouped["monetary"],
        higher_is_better=True,
    )

    customers: list[dict[str, Any]] = []
    for row in grouped.itertuples(index=False):
        segment = _rfm_segment(
            recency_score=int(row.recency_score),
            frequency_score=int(row.frequency_score),
            monetary_score=int(row.monetary_score),
            frequency=int(row.frequency),
        )
        customers.append(
            {
                "customer_id": str(row.customer_id),
                "customer_name": str(row.customer_name),
                "recency_days": int(row.recency_days),
                "frequency": int(row.frequency),
                "monetary": number(row.monetary),
                "recency_score": int(row.recency_score),
                "frequency_score": int(row.frequency_score),
                "monetary_score": int(row.monetary_score),
                "total_score": int(
                    row.recency_score
                    + row.frequency_score
                    + row.monetary_score
                ),
                "segment": segment,
            }
        )

    total_revenue = sum(float(item["monetary"]) for item in customers)
    segments = {
        segment: sum(item["segment"] == segment for item in customers)
        for segment in RFM_SEGMENTS
    }
    segment_revenue = []
    for segment in RFM_SEGMENTS:
        revenue = sum(
            float(item["monetary"])
            for item in customers
            if item["segment"] == segment
        )
        segment_revenue.append(
            {
                "segment": segment,
                "customer_count": segments[segment],
                "revenue": number(revenue),
                "revenue_share_percent": percent(revenue, total_revenue),
            }
        )

    top_customers = sorted(
        customers,
        key=lambda item: (
            -item["total_score"],
            -item["monetary"],
            item["customer_id"],
        ),
    )[:10]
    at_risk_customers = sorted(
        (
            item
            for item in customers
            if item["segment"] == "at_risk"
        ),
        key=lambda item: (
            -item["monetary"],
            -item["recency_days"],
            item["customer_id"],
        ),
    )[:10]

    return {
        **base_result,
        "segments": segments,
        "segment_revenue": segment_revenue,
        "top_customers": top_customers,
        "at_risk_customers": at_risk_customers,
    }


def _quintile_score(
    values: pd.Series,
    *,
    higher_is_better: bool,
) -> pd.Series:
    percentile_rank = values.rank(
        method="average",
        pct=True,
        ascending=higher_is_better,
    )
    return percentile_rank.mul(5).map(ceil).clip(lower=1, upper=5).astype(int)


def _rfm_segment(
    *,
    recency_score: int,
    frequency_score: int,
    monetary_score: int,
    frequency: int,
) -> RFMSegment:
    if frequency == 1 and recency_score >= 4:
        return "new"
    if (
        recency_score >= 4
        and frequency_score >= 4
        and monetary_score >= 4
    ):
        return "champion"
    if (
        recency_score <= 2
        and (frequency_score >= 3 or monetary_score >= 3)
    ):
        return "at_risk"
    if recency_score >= 3 and frequency_score >= 3:
        return "loyal"
    return "regular"
