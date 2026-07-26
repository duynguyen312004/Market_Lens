from math import sqrt
from typing import Any

import pandas as pd

from backend.app.services.analytics.common import number, percent


MINIMUM_PRODUCT_ORDER_COUNT = 10
MAX_PRODUCT_ISSUE_RESULTS = 10
_WILSON_Z_SCORE = 1.96
_ISSUE_STATUSES = {"cancelled", "returned"}


def calculate_product_order_issues(
    frame: pd.DataFrame,
) -> dict[str, Any]:
    """Rank products with notable cancelled or returned order rates.

    Counts use distinct order-product pairs, so repeated line items for the
    same product do not inflate the denominator. The displayed rate remains
    the observed rate, while ranking uses a Wilson lower bound to reduce the
    influence of small samples.
    """

    order_products = frame[
        [
            "order_id",
            "product_id",
            "product_name",
            "category",
            "order_status",
        ]
    ].drop_duplicates(subset=["order_id", "product_id"])
    affected_rows = frame.loc[frame["order_status"].isin(_ISSUE_STATUSES)]
    affected_value_by_product = (
        affected_rows.groupby("product_id")["line_revenue"].sum().to_dict()
    )

    products: list[dict[str, Any]] = []
    qualified_product_count = 0
    for keys, product_orders in order_products.groupby(
        ["product_id", "product_name", "category"],
        sort=False,
    ):
        product_id, product_name, category = keys
        status_counts = product_orders["order_status"].value_counts()
        total_order_count = int(len(product_orders))
        completed_order_count = int(status_counts.get("completed", 0))
        cancelled_order_count = int(status_counts.get("cancelled", 0))
        returned_order_count = int(status_counts.get("returned", 0))
        issue_order_count = cancelled_order_count + returned_order_count

        if total_order_count < MINIMUM_PRODUCT_ORDER_COUNT:
            continue
        qualified_product_count += 1
        if issue_order_count == 0:
            continue

        products.append(
            {
                "product_id": str(product_id),
                "product_name": str(product_name),
                "category": str(category),
                "total_order_count": total_order_count,
                "completed_order_count": completed_order_count,
                "cancelled_order_count": cancelled_order_count,
                "returned_order_count": returned_order_count,
                "issue_order_count": issue_order_count,
                "cancellation_rate_percent": percent(
                    cancelled_order_count,
                    total_order_count,
                ),
                "return_rate_percent": percent(
                    returned_order_count,
                    total_order_count,
                ),
                "issue_rate_percent": percent(
                    issue_order_count,
                    total_order_count,
                ),
                "ranking_score_percent": round(
                    _wilson_lower_bound(
                        successes=issue_order_count,
                        observations=total_order_count,
                    )
                    * 100,
                    6,
                ),
                "affected_product_value": number(
                    affected_value_by_product.get(product_id, 0)
                ),
            }
        )

    ranked_products = sorted(
        products,
        key=lambda item: (
            -item["ranking_score_percent"],
            -item["issue_order_count"],
            -item["issue_rate_percent"],
            -item["total_order_count"],
            item["product_id"],
        ),
    )[:MAX_PRODUCT_ISSUE_RESULTS]
    affected_order_count = int(
        affected_rows["order_id"].nunique()
    )

    if qualified_product_count == 0:
        reason = "INSUFFICIENT_PRODUCT_ORDERS"
    elif not ranked_products:
        reason = "NO_CANCELLED_OR_RETURNED_ORDERS"
    else:
        reason = None

    return {
        "available": bool(ranked_products),
        "reason": reason,
        "minimum_order_count": MINIMUM_PRODUCT_ORDER_COUNT,
        "ranking_method": "adjusted_issue_rate_lower_bound",
        "evaluated_product_count": int(
            order_products["product_id"].nunique()
        ),
        "qualified_product_count": qualified_product_count,
        "affected_order_count": affected_order_count,
        "affected_product_value": number(
            affected_rows["line_revenue"].sum()
        ),
        "products": ranked_products,
    }


def _wilson_lower_bound(
    *,
    successes: int,
    observations: int,
) -> float:
    if observations <= 0:
        return 0.0

    proportion = successes / observations
    z_squared = _WILSON_Z_SCORE**2
    numerator = (
        proportion
        + z_squared / (2 * observations)
        - _WILSON_Z_SCORE
        * sqrt(
            proportion * (1 - proportion) / observations
            + z_squared / (4 * observations**2)
        )
    )
    denominator = 1 + z_squared / observations
    return max(0.0, numerator / denominator)
