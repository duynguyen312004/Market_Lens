"""Generate deterministic, privacy-safe datasets for MarketLens DS Core.

The generated data is synthetic. It exists to exercise known seasonality,
association and retention patterns; it is never used to train a shared model.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
from dataclasses import dataclass
from datetime import date, timedelta
from io import StringIO
from pathlib import Path
from random import Random
from typing import Iterable


DATASET_SUITE_VERSION = "2.1"
SEED = 20_260_725
DATASET_CUTOFF_DATE = date(2026, 6, 30)
DEMO_START_DATE = date(2025, 7, 1)
DEMO_DAYS = 365
DEMO_CUSTOMERS = 800
ZERO_SALES_DAY_INDEXES = frozenset({45, 123, 274})
REGRESSION_START_DATE = date(2026, 5, 1)
REGRESSION_DAYS = 60
REGRESSION_CUSTOMERS = 30
FIELD_NAMES = (
    "order_id",
    "order_date",
    "customer_id",
    "customer_name",
    "product_id",
    "product_name",
    "category",
    "quantity",
    "unit_price",
    "discount",
    "order_status",
)
TIKTOK_FIELD_NAMES = (
    "Order ID",
    "Order Status",
    "Order Substatus",
    "Cancellation/Return Type",
    "Normal or Pre-order Type",
    "SKU ID",
    "Seller SKU",
    "Product Name",
    "Variation",
    "Quantity",
    "Sku Quantity of return",
    "SKU Unit Original Price",
    "SKU Subtotal Before Discount",
    "SKU Platform Discount",
    "SKU Seller Discount",
    "SKU Subtotal After Discount",
    "Shipping Fee After Discount",
    "Original Shipping Fee",
    "Order Amount",
    "Created Time",
    "Paid Time",
    "Buyer Username",
    "Product Category",
)
SHOPEE_FIELD_NAMES = (
    "Mã đơn hàng",
    "Trạng Thái Đơn Hàng",
    "Trạng thái Trả hàng/Hoàn tiền",
    "Ngày đặt hàng",
    "Người Mua",
    "SKU phân loại hàng",
    "Tên sản phẩm",
    "Tên phân loại hàng",
    "Số lượng",
    "Giá gốc",
    "Tổng giá bán (sản phẩm)",
    "Người bán trợ giá",
    "Shopee trợ giá",
    "Phí vận chuyển",
    "Tổng số tiền được người mua thanh toán",
)


@dataclass(frozen=True)
class Product:
    product_id: str
    name: str
    category: str
    unit_price: int
    popularity: int


@dataclass(frozen=True)
class Customer:
    customer_id: str
    name: str
    acquisition_day: int
    activity_weight: float


PRODUCTS = (
    Product("P001", "Ao thun basic", "Thoi trang", 159_000, 12),
    Product("P002", "Quan jean slim", "Thoi trang", 389_000, 8),
    Product("P003", "Ao khoac nhe", "Thoi trang", 449_000, 5),
    Product("P004", "Vay midi", "Thoi trang", 429_000, 5),
    Product("P005", "Tui tote canvas", "Phu kien", 119_000, 10),
    Product("P006", "Mu luoi trai", "Phu kien", 139_000, 7),
    Product("P007", "Kinh mat thoi trang", "Phu kien", 259_000, 5),
    Product("P008", "Vi mini", "Phu kien", 189_000, 6),
    Product("P009", "Op lung dien thoai", "Dien tu", 149_000, 11),
    Product("P010", "Cap sac nhanh", "Dien tu", 179_000, 8),
    Product("P011", "Tai nghe Bluetooth", "Dien tu", 549_000, 7),
    Product("P012", "Loa mini", "Dien tu", 479_000, 5),
    Product("P013", "Den ban LED", "Gia dung", 329_000, 7),
    Product("P014", "Hop dung do", "Gia dung", 169_000, 6),
    Product("P015", "Binh nuoc giu nhiet", "Gia dung", 249_000, 9),
    Product("P016", "Khay de ban", "Gia dung", 129_000, 5),
    Product("P017", "Ca phe rang xay", "Thuc pham", 189_000, 8),
    Product("P018", "Giay loc ca phe", "Thuc pham", 79_000, 5),
    Product("P019", "Tra trai cay", "Thuc pham", 139_000, 7),
    Product("P020", "Hat dinh duong", "Thuc pham", 219_000, 5),
    Product("P021", "So tay planner", "Van phong", 109_000, 7),
    Product("P022", "But gel", "Van phong", 39_000, 9),
    Product("P023", "Gia do laptop", "Van phong", 359_000, 5),
    Product("P024", "Lot chuot lon", "Van phong", 159_000, 6),
)
PRODUCT_BY_ID = {product.product_id: product for product in PRODUCTS}
ASSOCIATION_COMPLEMENTS = {
    "P001": ("P002", 0.58),
    "P009": ("P010", 0.64),
    "P017": ("P018", 0.61),
    "P021": ("P022", 0.55),
}

REGRESSION_PRODUCTS = (
    Product("R60P001", "Ao thun co ban", "Thoi trang", 159_000, 12),
    Product("R60P002", "Quan jean", "Thoi trang", 389_000, 8),
    Product("R60P003", "Binh nuoc giu nhiet", "Gia dung", 249_000, 9),
    Product("R60P004", "Tai nghe Bluetooth", "Dien tu", 549_000, 7),
    Product("R60P005", "Tui tote", "Phu kien", 119_000, 10),
    Product("R60P006", "Den ban LED", "Gia dung", 329_000, 7),
    Product("R60P007", "Cap sac nhanh", "Dien tu", 179_000, 8),
    Product("R60P008", "So tay planner", "Van phong", 109_000, 6),
)
REGRESSION_PRODUCT_BY_ID = {
    product.product_id: product for product in REGRESSION_PRODUCTS
}


def build_rich_demo_rows(
    *,
    seed: int = SEED,
    days: int = DEMO_DAYS,
    customer_count: int = DEMO_CUSTOMERS,
) -> list[dict[str, str | int]]:
    if days < 365:
        raise ValueError("The rich demo requires at least 365 days.")
    if customer_count < 100:
        raise ValueError("The rich demo requires at least 100 customers.")

    random = Random(seed)
    customers = _build_customers(
        random=random,
        days=days,
        customer_count=customer_count,
    )
    customers_by_day: dict[int, list[Customer]] = {}
    for customer in customers:
        customers_by_day.setdefault(
            customer.acquisition_day,
            [],
        ).append(customer)

    rows: list[dict[str, str | int]] = []
    last_order_day: dict[str, int] = {}
    order_number = 0

    for day_index in range(days):
        if day_index in ZERO_SALES_DAY_INDEXES:
            continue

        order_date = DEMO_START_DATE + timedelta(days=day_index)
        campaign = _is_campaign_day(day_index)
        acquisition_customers = customers_by_day.get(day_index, [])

        for customer in acquisition_customers:
            order_number += 1
            rows.extend(
                _build_order_rows(
                    random=random,
                    order_number=order_number,
                    order_date=order_date,
                    customer=customer,
                    campaign=campaign,
                    force_completed=True,
                )
            )
            last_order_day[customer.customer_id] = day_index

        active_customers = [
            customer
            for customer in customers
            if customer.acquisition_day <= day_index
        ]
        if not active_customers:
            continue

        base_orders = 20 + int(day_index * 0.035)
        weekday_multiplier = {
            0: 0.90,
            1: 0.94,
            2: 0.98,
            3: 1.03,
            4: 1.18,
            5: 1.38,
            6: 1.28,
        }[order_date.weekday()]
        campaign_multiplier = 2.1 if campaign else 1.0
        random_noise = random.randint(-3, 3)
        extra_order_count = max(
            1,
            round(
                base_orders
                * weekday_multiplier
                * campaign_multiplier
                + random_noise
            ),
        )

        weights = [
            _customer_order_weight(
                customer=customer,
                day_index=day_index,
                last_order_day=last_order_day,
            )
            for customer in active_customers
        ]
        selected_customers = random.choices(
            active_customers,
            weights=weights,
            k=extra_order_count,
        )
        for customer in selected_customers:
            order_number += 1
            order_rows = _build_order_rows(
                random=random,
                order_number=order_number,
                order_date=order_date,
                customer=customer,
                campaign=campaign,
            )
            rows.extend(order_rows)
            if order_rows[0]["order_status"] == "completed":
                last_order_day[customer.customer_id] = day_index

    return rows


def build_regression_60_day_rows(
    *,
    seed: int = SEED + 60,
) -> list[dict[str, str | int]]:
    """Build the compact end-to-end oracle used by API and browser tests."""

    random = Random(seed)
    customers = [
        Customer(
            customer_id=f"R60C{customer_number:03d}",
            name=f"Khach hang regression {customer_number:03d}",
            acquisition_day=customer_number - 1,
            activity_weight=(
                2.4
                if customer_number <= 6
                else 1.2
                if customer_number <= 24
                else 0.55
            ),
        )
        for customer_number in range(1, REGRESSION_CUSTOMERS + 1)
    ]
    rows: list[dict[str, str | int]] = []
    order_number = 0

    for day_index in range(REGRESSION_DAYS):
        order_date = REGRESSION_START_DATE + timedelta(days=day_index)
        acquired_today = [
            customer
            for customer in customers
            if customer.acquisition_day == day_index
        ]
        for customer in acquired_today:
            order_number += 1
            rows.extend(
                _build_regression_order_rows(
                    random=random,
                    order_number=order_number,
                    order_date=order_date,
                    customer=customer,
                    force_completed=True,
                )
            )

        eligible = [
            customer
            for customer in customers
            if customer.acquisition_day <= day_index
        ]
        weekday_bonus = 2 if order_date.weekday() in (4, 5, 6) else 0
        trend_bonus = day_index // 20
        campaign_bonus = 4 if day_index in range(42, 47) else 0
        order_count = 4 + weekday_bonus + trend_bonus + campaign_bonus
        weights = [customer.activity_weight for customer in eligible]
        selected = random.choices(
            eligible,
            weights=weights,
            k=order_count,
        )
        for customer in selected:
            order_number += 1
            rows.extend(
                _build_regression_order_rows(
                    random=random,
                    order_number=order_number,
                    order_date=order_date,
                    customer=customer,
                )
            )

    return rows


def build_template_rows() -> list[dict[str, str | int]]:
    return [
        {
            "order_id": "TPL-O001",
            "order_date": "2026-06-01",
            "customer_id": "TPL-C001",
            "customer_name": "Khach hang mau 001",
            "product_id": "TPL-P001",
            "product_name": "Ao thun co ban",
            "category": "Thoi trang",
            "quantity": 2,
            "unit_price": 159_000,
            "discount": 20_000,
            "order_status": "completed",
        },
        {
            "order_id": "TPL-O001",
            "order_date": "2026-06-01",
            "customer_id": "TPL-C001",
            "customer_name": "Khach hang mau 001",
            "product_id": "TPL-P002",
            "product_name": "Quan jean",
            "category": "Thoi trang",
            "quantity": 1,
            "unit_price": 389_000,
            "discount": 0,
            "order_status": "completed",
        },
        {
            "order_id": "TPL-O002",
            "order_date": "2026-06-02",
            "customer_id": "TPL-C002",
            "customer_name": "Khach hang mau 002",
            "product_id": "TPL-P003",
            "product_name": "Binh nuoc giu nhiet",
            "category": "Gia dung",
            "quantity": 1,
            "unit_price": 249_000,
            "discount": 10_000,
            "order_status": "completed",
        },
        {
            "order_id": "TPL-O003",
            "order_date": "2026-06-03",
            "customer_id": "TPL-C003",
            "customer_name": "Khach hang mau 003",
            "product_id": "TPL-P001",
            "product_name": "Ao thun co ban",
            "category": "Thoi trang",
            "quantity": 1,
            "unit_price": 159_000,
            "discount": 0,
            "order_status": "cancelled",
        },
    ]


def build_combined_demo_parts() -> tuple[
    list[dict[str, str | int]],
    list[dict[str, str | int]],
]:
    products = (
        ("CB-P001", "Ao thun co ban", "Thoi trang", 180_000),
        ("CB-P002", "Tui tote canvas", "Phu kien", 220_000),
        ("CB-P003", "Binh nuoc the thao", "Gia dung", 150_000),
        ("CB-P004", "Tai nghe Bluetooth", "Dien tu", 590_000),
        ("CB-P005", "Giay chay bo", "The thao", 850_000),
    )
    rows: list[dict[str, str | int]] = []
    for order_number in range(1, 21):
        product = products[(order_number - 1) % len(products)]
        order_date = date(2026, 6, 1) + timedelta(days=order_number - 1)
        customer_number = (order_number - 1) % 11 + 1
        rows.append(
            {
                "order_id": f"CB-O{order_number:03d}",
                "order_date": order_date.isoformat(),
                "customer_id": f"CB-C{customer_number:03d}",
                "customer_name": (
                    f"Khach hang gop {customer_number:03d}"
                ),
                "product_id": product[0],
                "product_name": product[1],
                "category": product[2],
                "quantity": 2 if order_number % 5 == 0 else 1,
                "unit_price": product[3],
                "discount": 50_000 if order_number % 6 == 0 else 0,
                "order_status": (
                    "cancelled" if order_number == 8 else "completed"
                ),
            }
        )

    first = rows[:10]
    second = [rows[9], *rows[10:]]
    return first, second


def build_insufficient_history_rows(
    *,
    days: int,
    dataset_prefix: str,
) -> list[dict[str, str | int]]:
    return [
        _scenario_row(
            order_id=f"{dataset_prefix}-O{day_index + 1:03d}",
            order_date=date(2026, 6, 1) + timedelta(days=day_index),
            customer_id=f"{dataset_prefix}-C{day_index % 5 + 1:03d}",
            product_id=f"{dataset_prefix}-P001",
            product_name="San pham lich su ngan",
            unit_price=100_000 + day_index * 1_000,
        )
        for day_index in range(days)
    ]


def build_no_order_issues_rows() -> list[dict[str, str | int]]:
    return [
        _scenario_row(
            order_id=f"NOI-O{day_index + 1:03d}",
            order_date=date(2026, 5, 1) + timedelta(days=day_index),
            customer_id=f"NOI-C{day_index % 8 + 1:03d}",
            product_id=f"NOI-P{day_index % 3 + 1:03d}",
            product_name=f"San pham hoan tat {day_index % 3 + 1}",
            unit_price=120_000 + (day_index % 3) * 20_000,
        )
        for day_index in range(30)
    ]


def build_single_product_order_rows() -> list[dict[str, str | int]]:
    return [
        _scenario_row(
            order_id=f"SPO-O{day_index + 1:03d}",
            order_date=date(2026, 5, 1) + timedelta(days=day_index),
            customer_id=f"SPO-C{day_index % 10 + 1:03d}",
            product_id=f"SPO-P{day_index % 4 + 1:03d}",
            product_name=f"San pham don {day_index % 4 + 1}",
            unit_price=150_000 + (day_index % 4) * 25_000,
        )
        for day_index in range(40)
    ]


def build_conflicting_customer_parts() -> tuple[
    list[dict[str, str | int]],
    list[dict[str, str | int]],
]:
    first = [
        _scenario_row(
            order_id="CC-A-O001",
            order_date=date(2026, 6, 1),
            customer_id="CC-C001",
            product_id="CC-P001",
            product_name="San pham xung dot",
            unit_price=100_000,
        )
    ]
    second = [
        {
            **_scenario_row(
                order_id="CC-B-O001",
                order_date=date(2026, 6, 2),
                customer_id="CC-C001",
                product_id="CC-P001",
                product_name="San pham xung dot",
                unit_price=100_000,
            ),
            "customer_name": "Ten khach hang khong nhat quan",
        }
    ]
    return first, second


def build_conflicting_product_parts() -> tuple[
    list[dict[str, str | int]],
    list[dict[str, str | int]],
]:
    first = [
        _scenario_row(
            order_id="CP-A-O001",
            order_date=date(2026, 6, 1),
            customer_id="CP-C001",
            product_id="CP-P001",
            product_name="Ten san pham dung",
            unit_price=100_000,
        )
    ]
    second = [
        _scenario_row(
            order_id="CP-B-O001",
            order_date=date(2026, 6, 2),
            customer_id="CP-C002",
            product_id="CP-P001",
            product_name="Ten san pham khong nhat quan",
            unit_price=100_000,
        )
    ]
    return first, second


def build_conflicting_order_parts() -> tuple[
    list[dict[str, str | int]],
    list[dict[str, str | int]],
]:
    first = [
        _scenario_row(
            order_id="CO-O001",
            order_date=date(2026, 6, 1),
            customer_id="CO-C001",
            product_id="CO-P001",
            product_name="San pham xung dot don",
            unit_price=100_000,
        )
    ]
    second = [{**first[0], "quantity": 2}]
    return first, second


def build_weekly_forecast_rows(
    *,
    days: int = 84,
) -> list[dict[str, str | int]]:
    weekday_revenue = (
        100_000,
        115_000,
        120_000,
        135_000,
        170_000,
        250_000,
        220_000,
    )
    rows = []
    for day_index in range(days):
        order_date = date(2026, 1, 1) + timedelta(days=day_index)
        customer_number = day_index % 20 + 1
        rows.append(
            _scenario_row(
                order_id=f"WF{day_index + 1:04d}",
                order_date=order_date,
                customer_id=f"WF-C{customer_number:03d}",
                product_id="WF-P001",
                product_name="San pham forecast",
                unit_price=weekday_revenue[order_date.weekday()],
            )
        )
    return rows


def build_known_association_rows() -> list[dict[str, str | int]]:
    rows: list[dict[str, str | int]] = []
    start = date(2026, 1, 1)
    for order_index in range(100):
        if order_index < 30:
            product_ids = ("AS-P001", "AS-P002")
        elif order_index < 50:
            product_ids = ("AS-P001",)
        elif order_index < 60:
            product_ids = ("AS-P002",)
        else:
            product_ids = ("AS-P003",)

        order_id = f"AS{order_index + 1:04d}"
        order_date = start + timedelta(days=order_index % 60)
        customer_number = order_index % 25 + 1
        for product_id in product_ids:
            rows.append(
                _scenario_row(
                    order_id=order_id,
                    order_date=order_date,
                    customer_id=f"AS-C{customer_number:03d}",
                    product_id=product_id,
                    product_name=f"San pham {product_id}",
                    unit_price=100_000,
                )
            )
    return rows


def build_known_cohort_rows() -> list[dict[str, str | int]]:
    cohort_plan = {
        "2026-01-05": range(1, 11),
        "2026-02-05": range(1, 7),
        "2026-03-05": range(1, 5),
        "2026-04-05": range(1, 3),
        "2026-05-05": range(1, 2),
        "2026-02-10": range(11, 19),
        "2026-03-10": range(11, 15),
        "2026-04-10": range(11, 13),
        "2026-05-10": range(11, 12),
        "2026-03-15": range(19, 25),
        "2026-04-15": range(19, 22),
        "2026-05-15": range(19, 21),
        "2026-06-15": range(19, 20),
        "2026-04-20": range(25, 29),
        "2026-05-20": range(25, 27),
        "2026-06-20": range(25, 26),
    }
    rows: list[dict[str, str | int]] = []
    order_number = 0
    for order_date_value, customer_numbers in cohort_plan.items():
        order_date = date.fromisoformat(order_date_value)
        for customer_number in customer_numbers:
            order_number += 1
            rows.append(
                _scenario_row(
                    order_id=f"CH{order_number:04d}",
                    order_date=order_date,
                    customer_id=f"CH-C{customer_number:03d}",
                    product_id="CH-P001",
                    product_name="San pham cohort",
                    unit_price=100_000,
                )
            )
    return rows


def build_tiktok_platform_rows() -> list[dict[str, str | int]]:
    values = (
        (
            "TT-DEMO-001", "Completed", "Delivered", "", "Normal",
            "TT-SKU-001", "SHOP-TS-001", "Áo thun cotton", "Xanh - M",
            2, 0, 150_000, 300_000, 20_000, 10_000, 270_000, 0,
            22_000, 270_000, "01/07/2026 09:15", "01/07/2026 09:16",
            "buyer_demo_001", "Thời trang",
        ),
        (
            "TT-DEMO-002", "Completed", "Delivered", "", "Normal",
            "TT-SKU-002", "SHOP-TS-002", "Bình giữ nhiệt", "Đen", 1, 0,
            320_000, 320_000, 20_000, 0, 300_000, 15_000, 30_000,
            315_000, "02/07/2026 14:20", "02/07/2026 14:21",
            "buyer_demo_002", "Gia dụng",
        ),
        (
            "TT-DEMO-003", "Cancelled", "Cancelled", "Buyer cancellation",
            "Normal", "TT-SKU-001", "SHOP-TS-001", "Áo thun cotton",
            "Xanh - M", 1, 0, 150_000, 150_000, 0, 0, 150_000, 0,
            22_000, 150_000, "03/07/2026 08:10", "03/07/2026 08:11",
            "buyer_demo_003", "Thời trang",
        ),
        (
            "TT-DEMO-004", "Completed", "Delivered", "Return/Refund",
            "Normal", "TT-SKU-003", "SHOP-TS-003", "Túi tote",
            "Vải canvas", 1, 1, 180_000, 180_000, 10_000, 10_000,
            160_000, 0, 18_000, 160_000, "04/07/2026 18:30",
            "04/07/2026 18:31", "buyer_demo_004", "Phụ kiện",
        ),
        (
            "TT-DEMO-005", "Awaiting Collection", "Ready to ship", "",
            "Normal", "TT-SKU-002", "SHOP-TS-002", "Bình giữ nhiệt",
            "Đen", 1, 0, 320_000, 320_000, 0, 0, 320_000, 0, 30_000,
            320_000, "05/07/2026 11:00", "05/07/2026 11:01",
            "buyer_demo_005", "Gia dụng",
        ),
    )
    return [
        dict(zip(TIKTOK_FIELD_NAMES, row, strict=True))
        for row in values
    ]


def build_shopee_platform_rows() -> list[dict[str, str | int]]:
    values = (
        (
            "SP-DEMO-001", "Hoàn thành", "", "01/07/2026 10:30",
            "shopee_demo_001", "SP-SKU-001", "Áo sơ mi linen",
            "Trắng - M", 2, 245_000, 450_000, 20_000, 20_000, 15_000,
            465_000,
        ),
        (
            "SP-DEMO-002", "Hoàn thành", "", "02/07/2026 12:10",
            "shopee_demo_002", "SP-SKU-002", "Đèn bàn học", "Màu trắng",
            1, 380_000, 350_000, 30_000, 0, 18_000, 368_000,
        ),
        (
            "SP-DEMO-003", "Đã hủy", "", "03/07/2026 09:05",
            "shopee_demo_003", "SP-SKU-001", "Áo sơ mi linen",
            "Trắng - M", 1, 245_000, 245_000, 0, 0, 15_000, 260_000,
        ),
        (
            "SP-DEMO-004", "Hoàn thành", "Trả hàng thành công",
            "04/07/2026 16:45", "shopee_demo_004", "SP-SKU-003",
            "Kệ để bàn", "Gỗ sáng", 1, 290_000, 260_000, 30_000, 0,
            22_000, 282_000,
        ),
        (
            "SP-DEMO-005", "Chờ lấy hàng", "", "05/07/2026 08:00",
            "shopee_demo_005", "SP-SKU-002", "Đèn bàn học", "Màu trắng",
            1, 380_000, 380_000, 0, 0, 18_000, 398_000,
        ),
    )
    return [
        dict(zip(SHOPEE_FIELD_NAMES, row, strict=True))
        for row in values
    ]


def render_csv(rows: Iterable[dict[str, str | int]]) -> str:
    return render_csv_with_fields(rows, FIELD_NAMES)


def render_csv_with_fields(
    rows: Iterable[dict[str, str | int]],
    field_names: Iterable[str],
) -> str:
    buffer = StringIO(newline="")
    writer = csv.DictWriter(
        buffer,
        fieldnames=field_names,
        lineterminator="\n",
    )
    writer.writeheader()
    writer.writerows(rows)
    return buffer.getvalue()


def dataset_output_paths(project_root: Path) -> dict[str, Path]:
    return {
        "regression_60_days": (
            project_root
            / "sample_data"
            / "sample_sales_demo_60_days.csv"
        ),
        "template": (
            project_root / "sample_data" / "sample_sales_template.csv"
        ),
        "rich_demo": (
            project_root
            / "sample_data"
            / "marketlens_ds_demo_365_days.csv"
        ),
        "public_rich_demo": (
            project_root
            / "frontend"
            / "public"
            / "marketlens_ds_demo_365_days.csv"
        ),
        "public_template": (
            project_root / "frontend" / "public" / "sample_sales_template.csv"
        ),
        "tiktok_platform_sample": (
            project_root
            / "sample_data"
            / "platform_samples"
            / "tiktok_shop_orders_sample.csv"
        ),
        "public_tiktok_platform_sample": (
            project_root
            / "frontend"
            / "public"
            / "tiktok_shop_orders_sample.csv"
        ),
        "shopee_platform_sample": (
            project_root
            / "sample_data"
            / "platform_samples"
            / "shopee_orders_sample.csv"
        ),
        "public_shopee_platform_sample": (
            project_root
            / "frontend"
            / "public"
            / "shopee_orders_sample.csv"
        ),
        "combined_part_1": (
            project_root
            / "frontend"
            / "public"
            / "marketlens_combined_demo_part_1.csv"
        ),
        "combined_part_2": (
            project_root
            / "frontend"
            / "public"
            / "marketlens_combined_demo_part_2.csv"
        ),
        "weekly_forecast": (
            project_root
            / "sample_data"
            / "ds_scenarios"
            / "forecast_weekly_84_days.csv"
        ),
        "known_association": (
            project_root
            / "sample_data"
            / "ds_scenarios"
            / "association_known_lift.csv"
        ),
        "known_cohort": (
            project_root
            / "sample_data"
            / "ds_scenarios"
            / "cohort_known_retention.csv"
        ),
        "insufficient_history_13_days": (
            project_root
            / "sample_data"
            / "test_cases"
            / "insufficient_history_13_days.csv"
        ),
        "forecast_7_only_30_days": (
            project_root
            / "sample_data"
            / "test_cases"
            / "forecast_7_only_30_days.csv"
        ),
        "no_cancelled_or_returned": (
            project_root
            / "sample_data"
            / "test_cases"
            / "no_cancelled_or_returned.csv"
        ),
        "single_product_orders": (
            project_root
            / "sample_data"
            / "test_cases"
            / "single_product_orders.csv"
        ),
        "conflicting_customer_part_1": (
            project_root
            / "sample_data"
            / "test_cases"
            / "conflicting_customer_part_1.csv"
        ),
        "conflicting_customer_part_2": (
            project_root
            / "sample_data"
            / "test_cases"
            / "conflicting_customer_part_2.csv"
        ),
        "conflicting_product_part_1": (
            project_root
            / "sample_data"
            / "test_cases"
            / "conflicting_product_part_1.csv"
        ),
        "conflicting_product_part_2": (
            project_root
            / "sample_data"
            / "test_cases"
            / "conflicting_product_part_2.csv"
        ),
        "conflicting_order_part_1": (
            project_root
            / "sample_data"
            / "test_cases"
            / "conflicting_order_part_1.csv"
        ),
        "conflicting_order_part_2": (
            project_root
            / "sample_data"
            / "test_cases"
            / "conflicting_order_part_2.csv"
        ),
        "invalid_missing_discount_column": (
            project_root
            / "sample_data"
            / "test_cases"
            / "invalid_missing_discount_column.csv"
        ),
        "invalid_row_values": (
            project_root
            / "sample_data"
            / "test_cases"
            / "invalid_row_values.csv"
        ),
    }


def build_all_datasets() -> dict[str, list[dict[str, str | int]]]:
    combined_part_1, combined_part_2 = build_combined_demo_parts()
    conflict_part_1, conflict_part_2 = build_conflicting_customer_parts()
    product_conflict_part_1, product_conflict_part_2 = (
        build_conflicting_product_parts()
    )
    order_conflict_part_1, order_conflict_part_2 = (
        build_conflicting_order_parts()
    )
    return {
        "regression_60_days": build_regression_60_day_rows(),
        "template": build_template_rows(),
        "rich_demo": build_rich_demo_rows(),
        "public_rich_demo": build_rich_demo_rows(),
        "public_template": build_template_rows(),
        "combined_part_1": combined_part_1,
        "combined_part_2": combined_part_2,
        "weekly_forecast": build_weekly_forecast_rows(),
        "known_association": build_known_association_rows(),
        "known_cohort": build_known_cohort_rows(),
        "insufficient_history_13_days": (
            build_insufficient_history_rows(
                days=13,
                dataset_prefix="H13",
            )
        ),
        "forecast_7_only_30_days": build_insufficient_history_rows(
            days=30,
            dataset_prefix="H30",
        ),
        "no_cancelled_or_returned": build_no_order_issues_rows(),
        "single_product_orders": build_single_product_order_rows(),
        "conflicting_customer_part_1": conflict_part_1,
        "conflicting_customer_part_2": conflict_part_2,
        "conflicting_product_part_1": product_conflict_part_1,
        "conflicting_product_part_2": product_conflict_part_2,
        "conflicting_order_part_1": order_conflict_part_1,
        "conflicting_order_part_2": order_conflict_part_2,
        "invalid_missing_discount_column": [
            _scenario_row(
                order_id="IMC-O001",
                order_date=date(2026, 6, 1),
                customer_id="IMC-C001",
                product_id="IMC-P001",
                product_name="San pham thieu cot",
                unit_price=100_000,
            )
        ],
        "invalid_row_values": [
            {
                **_scenario_row(
                    order_id="IRV-O001",
                    order_date=date(2026, 6, 1),
                    customer_id="IRV-C001",
                    product_id="IRV-P001",
                    product_name="San pham sai du lieu",
                    unit_price=100_000,
                ),
                "order_date": "01/06/2026",
                "quantity": 0,
                "unit_price": "khong-phai-so",
                "order_status": "shipping",
            }
        ],
    }


def build_dataset_contents() -> dict[str, str]:
    datasets = build_all_datasets()
    contents = {
        name: render_csv(rows)
        for name, rows in datasets.items()
    }
    missing_discount_fields = tuple(
        field for field in FIELD_NAMES if field != "discount"
    )
    contents["invalid_missing_discount_column"] = render_csv_with_fields(
        [
            {
                field: row[field]
                for field in missing_discount_fields
            }
            for row in datasets["invalid_missing_discount_column"]
        ],
        missing_discount_fields,
    )
    tiktok_content = render_csv_with_fields(
        build_tiktok_platform_rows(),
        TIKTOK_FIELD_NAMES,
    )
    shopee_content = render_csv_with_fields(
        build_shopee_platform_rows(),
        SHOPEE_FIELD_NAMES,
    )
    contents["tiktok_platform_sample"] = tiktok_content
    contents["public_tiktok_platform_sample"] = tiktok_content
    contents["shopee_platform_sample"] = shopee_content
    contents["public_shopee_platform_sample"] = shopee_content
    return contents


def write_datasets(project_root: Path) -> dict[str, Path]:
    outputs = dataset_output_paths(project_root)
    contents = build_dataset_contents()
    for name, output_path in outputs.items():
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(
            contents[name],
            encoding="utf-8",
        )
    _manifest_path(project_root).write_text(
        _render_manifest(project_root, contents),
        encoding="utf-8",
    )
    return outputs


def find_dataset_mismatches(project_root: Path) -> list[Path]:
    outputs = dataset_output_paths(project_root)
    contents = build_dataset_contents()
    mismatches = [
        output_path
        for name, output_path in outputs.items()
        if not output_path.is_file()
        or output_path.read_text(encoding="utf-8")
        != contents[name]
    ]
    manifest_path = _manifest_path(project_root)
    if (
        not manifest_path.is_file()
        or manifest_path.read_text(encoding="utf-8")
        != _render_manifest(project_root, contents)
    ):
        mismatches.append(manifest_path)
    return mismatches


def _manifest_path(project_root: Path) -> Path:
    return project_root / "sample_data" / "DATASET_MANIFEST.json"


def _render_manifest(
    project_root: Path,
    contents: dict[str, str],
) -> str:
    outputs = dataset_output_paths(project_root)
    expected_invalid = {
        "invalid_missing_discount_column": "INVALID_FILE_COLUMNS",
        "invalid_row_values": "INVALID_ROW_DATA",
    }
    purposes = {
        "regression_60_days": "Compact end-to-end regression oracle",
        "template": "Minimal valid upload template",
        "rich_demo": "Integrated 365-day DS demonstration",
        "public_rich_demo": "Download copy of integrated demonstration",
        "public_template": "Download copy of upload template",
        "tiktok_platform_sample": (
            "Synthetic TikTok Shop export-header regression fixture"
        ),
        "public_tiktok_platform_sample": (
            "Download copy of synthetic TikTok Shop fixture"
        ),
        "shopee_platform_sample": (
            "Synthetic Shopee export-header regression fixture"
        ),
        "public_shopee_platform_sample": (
            "Download copy of synthetic Shopee fixture"
        ),
        "combined_part_1": "Valid combined-analysis first part",
        "combined_part_2": "Valid second part with one exact duplicate order",
        "weekly_forecast": "Exact weekly seasonality oracle",
        "known_association": "Known support, confidence and lift oracle",
        "known_cohort": "Known monthly retention oracle",
        "insufficient_history_13_days": "Forecast unavailable boundary",
        "forecast_7_only_30_days": "Seven-day-only forecast boundary",
        "no_cancelled_or_returned": "Empty order-issue state",
        "single_product_orders": "No product-association state",
        "conflicting_customer_part_1": (
            "Cross-file customer-conflict first part"
        ),
        "conflicting_customer_part_2": (
            "Cross-file customer-conflict second part"
        ),
        "conflicting_product_part_1": (
            "Cross-file product-conflict first part"
        ),
        "conflicting_product_part_2": (
            "Cross-file product-conflict second part"
        ),
        "conflicting_order_part_1": (
            "Cross-file order-conflict first part"
        ),
        "conflicting_order_part_2": (
            "Cross-file order-conflict second part"
        ),
        "invalid_missing_discount_column": (
            "Missing required-column validation error"
        ),
        "invalid_row_values": "Invalid row-value validation errors",
    }
    files = {}
    for name, content in contents.items():
        reader = csv.DictReader(StringIO(content))
        rows = list(reader)
        dates = sorted(
            str(row["order_date"])
            for row in rows
            if row.get("order_date")
            and len(str(row["order_date"])) == 10
            and str(row["order_date"])[4:5] == "-"
        )
        files[str(outputs[name].relative_to(project_root))] = {
            "dataset_key": name,
            "purpose": purposes[name],
            "expected_valid": name not in expected_invalid,
            "expected_error_code": expected_invalid.get(name),
            "row_count": len(rows),
            "date_from": dates[0] if dates else None,
            "date_to": dates[-1] if dates else None,
            "sha256": hashlib.sha256(content.encode("utf-8")).hexdigest(),
        }
    manifest = {
        "suite_version": DATASET_SUITE_VERSION,
        "seed": SEED,
        "cutoff_date": DATASET_CUTOFF_DATE.isoformat(),
        "synthetic_data_only": True,
        "files": dict(sorted(files.items())),
        "combined_cases": {
            "valid_with_exact_duplicate": [
                "frontend/public/marketlens_combined_demo_part_1.csv",
                "frontend/public/marketlens_combined_demo_part_2.csv",
            ],
            "invalid_customer_conflict": [
                "sample_data/test_cases/conflicting_customer_part_1.csv",
                "sample_data/test_cases/conflicting_customer_part_2.csv",
            ],
            "invalid_product_conflict": [
                "sample_data/test_cases/conflicting_product_part_1.csv",
                "sample_data/test_cases/conflicting_product_part_2.csv",
            ],
            "invalid_order_conflict": [
                "sample_data/test_cases/conflicting_order_part_1.csv",
                "sample_data/test_cases/conflicting_order_part_2.csv",
            ],
        },
    }
    return (
        json.dumps(
            manifest,
            ensure_ascii=False,
            indent=2,
            sort_keys=True,
        )
        + "\n"
    )


def _build_customers(
    *,
    random: Random,
    days: int,
    customer_count: int,
) -> list[Customer]:
    latest_acquisition_day = min(days - 65, 300)
    valid_days = [
        day_index
        for day_index in range(latest_acquisition_day + 1)
        if day_index not in ZERO_SALES_DAY_INDEXES
    ]
    customers = []
    for customer_number in range(1, customer_count + 1):
        acquisition_index = min(
            int(random.random() ** 2 * len(valid_days)),
            len(valid_days) - 1,
        )
        acquisition_day = valid_days[acquisition_index]
        tier = random.random()
        if tier < 0.20:
            activity_weight = 2.8
        elif tier < 0.75:
            activity_weight = 1.2
        else:
            activity_weight = 0.42
        customers.append(
            Customer(
                customer_id=f"C{customer_number:04d}",
                name=f"Khach hang synthetic {customer_number:04d}",
                acquisition_day=acquisition_day,
                activity_weight=activity_weight,
            )
        )
    return sorted(
        customers,
        key=lambda customer: (
            customer.acquisition_day,
            customer.customer_id,
        ),
    )


def _customer_order_weight(
    *,
    customer: Customer,
    day_index: int,
    last_order_day: dict[str, int],
) -> float:
    previous_day = last_order_day.get(
        customer.customer_id,
        customer.acquisition_day,
    )
    days_since_order = day_index - previous_day
    recency_weight = max(0.18, 1 - days_since_order / 240)
    tenure_weight = 1 + min(
        0.35,
        (day_index - customer.acquisition_day) / 720,
    )
    return customer.activity_weight * recency_weight * tenure_weight


def _build_order_rows(
    *,
    random: Random,
    order_number: int,
    order_date: date,
    customer: Customer,
    campaign: bool,
    force_completed: bool = False,
) -> list[dict[str, str | int]]:
    status = (
        "completed"
        if force_completed
        else random.choices(
            ("completed", "cancelled", "returned"),
            weights=(90, 6, 4),
            k=1,
        )[0]
    )
    basket_size = random.choices(
        (1, 2, 3, 4),
        weights=(48, 32, 16, 4),
        k=1,
    )[0]
    product_ids = _select_product_ids(
        random=random,
        basket_size=basket_size,
    )
    rows = []
    for product_id in product_ids:
        product = PRODUCT_BY_ID[product_id]
        quantity = random.choices((1, 2, 3), weights=(78, 18, 4), k=1)[0]
        discount_probability = 0.42 if campaign else 0.18
        discount_rate = (
            random.choice((0.05, 0.10, 0.15))
            if random.random() < discount_probability
            else 0.0
        )
        gross_revenue = quantity * product.unit_price
        discount = int(gross_revenue * discount_rate // 1_000 * 1_000)
        rows.append(
            {
                "order_id": f"DS{order_number:06d}",
                "order_date": order_date.isoformat(),
                "customer_id": customer.customer_id,
                "customer_name": customer.name,
                "product_id": product.product_id,
                "product_name": product.name,
                "category": product.category,
                "quantity": quantity,
                "unit_price": product.unit_price,
                "discount": discount,
                "order_status": status,
            }
        )
    return rows


def _build_regression_order_rows(
    *,
    random: Random,
    order_number: int,
    order_date: date,
    customer: Customer,
    force_completed: bool = False,
) -> list[dict[str, str | int]]:
    status = (
        "completed"
        if force_completed
        else random.choices(
            ("completed", "cancelled", "returned"),
            weights=(88, 8, 4),
            k=1,
        )[0]
    )
    basket_size = random.choices(
        (1, 2, 3),
        weights=(58, 34, 8),
        k=1,
    )[0]
    primary = random.choices(
        REGRESSION_PRODUCTS,
        weights=[
            product.popularity for product in REGRESSION_PRODUCTS
        ],
        k=1,
    )[0]
    product_ids = [primary.product_id]
    if (
        primary.product_id == "R60P001"
        and basket_size > 1
        and random.random() < 0.72
    ):
        product_ids.append("R60P002")
    while len(product_ids) < basket_size:
        candidate = random.choices(
            REGRESSION_PRODUCTS,
            weights=[
                product.popularity for product in REGRESSION_PRODUCTS
            ],
            k=1,
        )[0].product_id
        if candidate not in product_ids:
            product_ids.append(candidate)

    rows = []
    for product_id in product_ids:
        product = REGRESSION_PRODUCT_BY_ID[product_id]
        quantity = random.choices(
            (1, 2, 3),
            weights=(76, 20, 4),
            k=1,
        )[0]
        discount_rate = (
            random.choice((0.05, 0.10, 0.15))
            if random.random() < 0.28
            else 0
        )
        gross_revenue = quantity * product.unit_price
        discount = int(gross_revenue * discount_rate // 1_000 * 1_000)
        rows.append(
            {
                "order_id": f"R60O{order_number:05d}",
                "order_date": order_date.isoformat(),
                "customer_id": customer.customer_id,
                "customer_name": customer.name,
                "product_id": product.product_id,
                "product_name": product.name,
                "category": product.category,
                "quantity": quantity,
                "unit_price": product.unit_price,
                "discount": discount,
                "order_status": status,
            }
        )
    return rows


def _select_product_ids(
    *,
    random: Random,
    basket_size: int,
) -> list[str]:
    primary = random.choices(
        PRODUCTS,
        weights=[product.popularity for product in PRODUCTS],
        k=1,
    )[0]
    selected = [primary.product_id]
    complement = ASSOCIATION_COMPLEMENTS.get(primary.product_id)
    if complement and basket_size > 1 and random.random() < complement[1]:
        selected.append(complement[0])

    while len(selected) < basket_size:
        candidate = random.choices(
            PRODUCTS,
            weights=[product.popularity for product in PRODUCTS],
            k=1,
        )[0].product_id
        if candidate not in selected:
            selected.append(candidate)
    return selected


def _is_campaign_day(day_index: int) -> bool:
    return (
        98 <= day_index <= 105
        or 198 <= day_index <= 205
        or 318 <= day_index <= 329
    )


def _scenario_row(
    *,
    order_id: str,
    order_date: date,
    customer_id: str,
    product_id: str,
    product_name: str,
    unit_price: int,
) -> dict[str, str | int]:
    return {
        "order_id": order_id,
        "order_date": order_date.isoformat(),
        "customer_id": customer_id,
        "customer_name": f"Khach hang {customer_id}",
        "product_id": product_id,
        "product_name": product_name,
        "category": "Danh muc synthetic",
        "quantity": 1,
        "unit_price": unit_price,
        "discount": 0,
        "order_status": "completed",
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate deterministic MarketLens DS datasets.",
    )
    parser.add_argument(
        "--project-root",
        type=Path,
        default=Path(__file__).resolve().parents[1],
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Verify committed datasets without modifying them.",
    )
    args = parser.parse_args()
    project_root = args.project_root.resolve()
    if args.check:
        mismatches = find_dataset_mismatches(project_root)
        if mismatches:
            relative_paths = ", ".join(
                str(path.relative_to(project_root))
                for path in mismatches
            )
            raise SystemExit(
                f"Dataset check failed: {relative_paths}"
            )
        print("Dataset check: PASS")
        return

    outputs = write_datasets(project_root)
    for name, path in outputs.items():
        print(f"{name}: {path}")


if __name__ == "__main__":
    main()
