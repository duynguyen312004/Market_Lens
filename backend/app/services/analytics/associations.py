from collections import Counter
from itertools import combinations
from typing import Any

import pandas as pd

from backend.app.services.analytics.common import percent


MAX_PRODUCTS_PER_BASKET = 50
MAX_ASSOCIATION_RULES = 20
MINIMUM_PAIR_ORDER_COUNT = 3
MINIMUM_SUPPORT_PERCENT = 1.0


def calculate_product_associations(
    completed: pd.DataFrame,
) -> dict[str, Any]:
    product_names = (
        completed.sort_values(["product_id", "product_name"])
        .drop_duplicates("product_id")
        .set_index("product_id")["product_name"]
        .astype(str)
        .to_dict()
    )
    pair_counts: Counter[tuple[str, str]] = Counter()
    product_order_counts: Counter[str] = Counter()
    total_completed_orders = int(completed["order_id"].nunique())
    eligible_completed_order_count = 0
    basket_order_count = 0
    eligible_basket_order_count = 0
    skipped_oversized_order_count = 0

    for _, order_rows in completed.groupby("order_id", sort=True):
        product_ids = sorted(
            set(order_rows["product_id"].astype(str).tolist())
        )
        if len(product_ids) >= 2:
            basket_order_count += 1
        if len(product_ids) > MAX_PRODUCTS_PER_BASKET:
            skipped_oversized_order_count += 1
            continue

        eligible_completed_order_count += 1
        product_order_counts.update(product_ids)
        if len(product_ids) < 2:
            continue
        eligible_basket_order_count += 1
        pair_counts.update(combinations(product_ids, 2))

    qualified_pairs = [
        (pair, count)
        for pair, count in pair_counts.items()
        if count >= MINIMUM_PAIR_ORDER_COUNT
        and percent(count, eligible_completed_order_count)
        >= MINIMUM_SUPPORT_PERCENT
    ]
    rules = []
    for (product_a_id, product_b_id), pair_order_count in qualified_pairs:
        for source_id, target_id in (
            (product_a_id, product_b_id),
            (product_b_id, product_a_id),
        ):
            source_order_count = product_order_counts[source_id]
            target_order_count = product_order_counts[target_id]
            confidence_percent = percent(
                pair_order_count,
                source_order_count,
            )
            target_support = (
                target_order_count / eligible_completed_order_count
                if eligible_completed_order_count > 0
                else 0.0
            )
            confidence_ratio = confidence_percent / 100
            lift = (
                round(confidence_ratio / target_support, 6)
                if target_support > 0
                else 0.0
            )
            rules.append(
                {
                    "source_product_id": source_id,
                    "source_product_name": product_names.get(
                        source_id,
                        source_id,
                    ),
                    "target_product_id": target_id,
                    "target_product_name": product_names.get(
                        target_id,
                        target_id,
                    ),
                    "pair_order_count": pair_order_count,
                    "source_order_count": source_order_count,
                    "target_order_count": target_order_count,
                    "support_percent": percent(
                        pair_order_count,
                        eligible_completed_order_count,
                    ),
                    "confidence_percent": confidence_percent,
                    "lift": lift,
                }
            )

    sorted_rules = sorted(
        rules,
        key=lambda item: (
            -item["lift"],
            -item["confidence_percent"],
            -item["pair_order_count"],
            item["source_product_id"],
            item["target_product_id"],
        ),
    )
    if sorted_rules:
        reason = None
    elif pair_counts:
        reason = "INSUFFICIENT_ASSOCIATION_SUPPORT"
    else:
        reason = "NO_MULTI_PRODUCT_ORDERS"

    return {
        "available": bool(sorted_rules),
        "reason": reason,
        "total_completed_orders": total_completed_orders,
        "eligible_completed_order_count": (
            eligible_completed_order_count
        ),
        "basket_order_count": basket_order_count,
        "eligible_basket_order_count": eligible_basket_order_count,
        "skipped_oversized_order_count": skipped_oversized_order_count,
        "max_products_per_basket": MAX_PRODUCTS_PER_BASKET,
        "minimum_pair_order_count": MINIMUM_PAIR_ORDER_COUNT,
        "minimum_support_percent": MINIMUM_SUPPORT_PERCENT,
        "observed_pair_count": len(pair_counts),
        "qualified_pair_count": len(qualified_pairs),
        "rules": sorted_rules[:MAX_ASSOCIATION_RULES],
    }
