"""Benchmark the deterministic core pipeline at the 50,000-row limit."""

from __future__ import annotations

import argparse
import json
import resource
import sys
from pathlib import Path
from time import perf_counter
from typing import Any

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SOURCE_PATH = (
    PROJECT_ROOT / "sample_data" / "marketlens_ds_demo_365_days.csv"
)
TARGET_ROWS = 50_000

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.schemas.analysis import ReportContent
from backend.app.services.analytics import calculate_analytics
from backend.app.services.file_reader import read_sales_file
from backend.app.services.forecast import calculate_forecast
from backend.app.services.report import build_rule_based_report
from backend.app.services.validator import (
    REQUIRED_COLUMNS,
    validate_sales_data,
)


def build_benchmark_csv() -> bytes:
    source = pd.read_csv(SOURCE_PATH, dtype=object)
    copies = []
    remaining = TARGET_ROWS
    batch = 1
    while remaining > 0:
        clone = source.iloc[:remaining].copy()
        clone["order_id"] = (
            f"BENCH-{batch}-" + clone["order_id"].astype(str)
        )
        copies.append(clone)
        remaining -= len(clone)
        batch += 1
    expanded = pd.concat(copies, ignore_index=True)[REQUIRED_COLUMNS]
    content = expanded.to_csv(index=False).encode("utf-8")
    if len(expanded) != TARGET_ROWS:
        raise RuntimeError("Benchmark fixture does not contain 50,000 rows.")
    if len(content) > 10 * 1024 * 1024:
        raise RuntimeError("Benchmark fixture exceeds the 10 MB upload limit.")
    return content


def run_benchmark() -> dict[str, Any]:
    content = build_benchmark_csv()
    started = perf_counter()

    stage_started = perf_counter()
    raw = read_sales_file(
        file_name="marketlens_benchmark_50000.csv",
        content=content,
    )
    read_seconds = perf_counter() - stage_started

    stage_started = perf_counter()
    validated = validate_sales_data(raw, max_rows=TARGET_ROWS)
    validation_seconds = perf_counter() - stage_started

    stage_started = perf_counter()
    analytics = calculate_analytics(validated)
    analytics_seconds = perf_counter() - stage_started

    stage_started = perf_counter()
    forecast, warnings = calculate_forecast(analytics["revenue_by_date"])
    analytics["forecast"] = forecast
    analytics["warnings"] = [*analytics["warnings"], *warnings]
    forecast_seconds = perf_counter() - stage_started

    stage_started = perf_counter()
    report = build_rule_based_report(analytics)
    ReportContent.model_validate(report)
    report_seconds = perf_counter() - stage_started

    return {
        "fixture": {
            "rows": len(validated),
            "csv_bytes": len(content),
            "history_days": len(analytics["revenue_by_date"]),
        },
        "result": {
            "contract_version": analytics["contract_version"],
            "completed_orders": analytics["summary"]["total_orders"],
            "forecast_method": forecast["method"],
            "forecast_days": forecast["forecast_days"],
            "report_version": report["report_version"],
        },
        "timing_seconds": {
            "read": round(read_seconds, 6),
            "validation": round(validation_seconds, 6),
            "analytics": round(analytics_seconds, 6),
            "forecast": round(forecast_seconds, 6),
            "report": round(report_seconds, 6),
            "total": round(perf_counter() - started, 6),
        },
        "peak_rss_mb": round(
            resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024,
            2,
        ),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--max-seconds",
        type=float,
        default=30.0,
        help="Fail if the measured core pipeline exceeds this duration.",
    )
    args = parser.parse_args()
    if args.max_seconds <= 0:
        raise SystemExit("--max-seconds must be greater than zero.")

    result = run_benchmark()
    print(json.dumps(result, indent=2, sort_keys=True))
    total = result["timing_seconds"]["total"]
    if total > args.max_seconds:
        raise SystemExit(
            f"Performance gate failed: {total}s > {args.max_seconds}s."
        )
    print(
        "Analysis benchmark: PASS "
        f"({total}s <= {args.max_seconds}s)."
    )


if __name__ == "__main__":
    main()
