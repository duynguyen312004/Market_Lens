"""Generate deterministic, privacy-safe datasets for MarketLens DS Core.

The generated data is synthetic. It exists to exercise known seasonality,
association and retention patterns; it is never used to train a shared model.
"""

from __future__ import annotations

import argparse
import csv
from dataclasses import dataclass
from datetime import date, timedelta
from io import StringIO
from pathlib import Path
from random import Random
from typing import Iterable


SEED = 20_260_725
DEMO_START_DATE = date(2025, 8, 1)
DEMO_DAYS = 365
DEMO_CUSTOMERS = 800
ZERO_SALES_DAY_INDEXES = frozenset({45, 123, 274})
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
                customer_id=f"C{customer_number:03d}",
                product_id="P001",
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
            product_ids = ("P001", "P002")
        elif order_index < 50:
            product_ids = ("P001",)
        elif order_index < 60:
            product_ids = ("P002",)
        else:
            product_ids = ("P003",)

        order_id = f"AS{order_index + 1:04d}"
        order_date = start + timedelta(days=order_index % 60)
        customer_number = order_index % 25 + 1
        for product_id in product_ids:
            rows.append(
                _scenario_row(
                    order_id=order_id,
                    order_date=order_date,
                    customer_id=f"C{customer_number:03d}",
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
                    customer_id=f"C{customer_number:03d}",
                    product_id="P001",
                    product_name="San pham cohort",
                    unit_price=100_000,
                )
            )
    return rows


def render_csv(rows: Iterable[dict[str, str | int]]) -> str:
    buffer = StringIO(newline="")
    writer = csv.DictWriter(
        buffer,
        fieldnames=FIELD_NAMES,
        lineterminator="\n",
    )
    writer.writeheader()
    writer.writerows(rows)
    return buffer.getvalue()


def dataset_output_paths(project_root: Path) -> dict[str, Path]:
    return {
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
    }


def build_all_datasets() -> dict[str, list[dict[str, str | int]]]:
    return {
        "rich_demo": build_rich_demo_rows(),
        "public_rich_demo": build_rich_demo_rows(),
        "weekly_forecast": build_weekly_forecast_rows(),
        "known_association": build_known_association_rows(),
        "known_cohort": build_known_cohort_rows(),
    }


def write_datasets(project_root: Path) -> dict[str, Path]:
    outputs = dataset_output_paths(project_root)
    datasets = build_all_datasets()
    for name, output_path in outputs.items():
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(
            render_csv(datasets[name]),
            encoding="utf-8",
        )
    return outputs


def find_dataset_mismatches(project_root: Path) -> list[Path]:
    outputs = dataset_output_paths(project_root)
    datasets = build_all_datasets()
    return [
        output_path
        for name, output_path in outputs.items()
        if not output_path.is_file()
        or output_path.read_text(encoding="utf-8")
        != render_csv(datasets[name])
    ]


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
