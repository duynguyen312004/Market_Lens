from typing import Any, Literal

import pandas as pd

from backend.app.services.analytics.associations import (
    calculate_product_associations,
)
from backend.app.services.analytics.common import number, percent


ABC_CLASSES = ("A", "B", "C")
ABCClass = Literal["A", "B", "C"]
MAX_PRODUCTS_PER_ABC_CLASS = 5
MAX_DISCOUNT_RESULTS = 10


def calculate_product_intelligence(
    completed: pd.DataFrame,
    product_rows: list[dict[str, Any]],
) -> dict[str, Any]:
    return {
        "abc": _calculate_abc(product_rows),
        "associations": calculate_product_associations(completed),
    }


def calculate_discount_analysis(
    completed: pd.DataFrame,
) -> dict[str, Any]:
    working = completed.assign(
        _gross=completed["quantity"] * completed["unit_price"]
    )
    gross_revenue = float(working["_gross"].sum())
    discount_amount = float(working["discount"].sum())
    net_revenue = float(working["line_revenue"].sum())
    order_discounts = working.groupby("order_id")["discount"].sum()
    discounted_order_count = int((order_discounts > 0).sum())
    total_orders = int(working["order_id"].nunique())

    by_product = (
        working.groupby(
            ["product_id", "product_name", "category"],
            as_index=False,
        )
        .agg(
            gross_revenue=("_gross", "sum"),
            discount_amount=("discount", "sum"),
            net_revenue=("line_revenue", "sum"),
            order_count=("order_id", "nunique"),
        )
    )
    by_category = (
        working.groupby("category", as_index=False)
        .agg(
            gross_revenue=("_gross", "sum"),
            discount_amount=("discount", "sum"),
            net_revenue=("line_revenue", "sum"),
            order_count=("order_id", "nunique"),
        )
    )

    product_items = [
        {
            "product_id": str(row.product_id),
            "product_name": str(row.product_name),
            "category": str(row.category),
            "gross_revenue": number(row.gross_revenue),
            "discount_amount": number(row.discount_amount),
            "net_revenue": number(row.net_revenue),
            "discount_rate_percent": percent(
                row.discount_amount,
                row.gross_revenue,
            ),
            "order_count": int(row.order_count),
        }
        for row in by_product.itertuples(index=False)
        if float(row.discount_amount) > 0
    ]
    category_items = [
        {
            "category": str(row.category),
            "gross_revenue": number(row.gross_revenue),
            "discount_amount": number(row.discount_amount),
            "net_revenue": number(row.net_revenue),
            "discount_rate_percent": percent(
                row.discount_amount,
                row.gross_revenue,
            ),
            "order_count": int(row.order_count),
        }
        for row in by_category.itertuples(index=False)
        if float(row.discount_amount) > 0
    ]

    return {
        "available": discount_amount > 0,
        "reason": None if discount_amount > 0 else "NO_DISCOUNT_DATA",
        "gross_revenue": number(gross_revenue),
        "discount_amount": number(discount_amount),
        "net_revenue": number(net_revenue),
        "discount_rate_percent": percent(
            discount_amount,
            gross_revenue,
        ),
        "discounted_order_count": discounted_order_count,
        "discounted_order_rate_percent": percent(
            discounted_order_count,
            total_orders,
        ),
        "by_product": sorted(
            product_items,
            key=lambda item: (
                -item["discount_amount"],
                item["product_id"],
            ),
        )[:MAX_DISCOUNT_RESULTS],
        "by_category": sorted(
            category_items,
            key=lambda item: (
                -item["discount_amount"],
                item["category"],
            ),
        ),
    }


def _calculate_abc(
    product_rows: list[dict[str, Any]],
) -> dict[str, Any]:
    sorted_products = sorted(
        product_rows,
        key=lambda item: (-item["revenue"], item["product_id"]),
    )
    total_revenue = sum(float(item["revenue"]) for item in sorted_products)
    cumulative_revenue = 0.0
    classified: list[dict[str, Any]] = []
    for product in sorted_products:
        cumulative_before_percent = (
            cumulative_revenue / total_revenue * 100
            if total_revenue > 0
            else 0.0
        )
        abc_class = _abc_class(cumulative_before_percent)
        cumulative_revenue += float(product["revenue"])
        classified.append(
            {
                **product,
                "abc_class": abc_class,
                "revenue_share_percent": percent(
                    product["revenue"],
                    total_revenue,
                ),
                "cumulative_revenue_share_percent": percent(
                    cumulative_revenue,
                    total_revenue,
                ),
            }
        )

    classes = {}
    representative_products: list[dict[str, Any]] = []
    for abc_class in ABC_CLASSES:
        class_products = [
            item for item in classified if item["abc_class"] == abc_class
        ]
        class_revenue = sum(
            float(item["revenue"]) for item in class_products
        )
        classes[abc_class] = {
            "product_count": len(class_products),
            "revenue": number(class_revenue),
            "revenue_share_percent": percent(
                class_revenue,
                total_revenue,
            ),
        }
        representative_products.extend(
            class_products[:MAX_PRODUCTS_PER_ABC_CLASS]
        )

    return {
        "method": "cumulative_revenue_80_95",
        "classified_product_count": len(classified),
        "classes": classes,
        "representative_products": representative_products,
    }


def _abc_class(cumulative_before_percent: float) -> ABCClass:
    if cumulative_before_percent < 80:
        return "A"
    if cumulative_before_percent < 95:
        return "B"
    return "C"
