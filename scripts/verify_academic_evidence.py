"""Reproduce the compact DS evidence used in the academic documentation."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parents[1]
EVIDENCE_PATH = PROJECT_ROOT / "sample_data" / "ACADEMIC_EVIDENCE.json"

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.services.analytics import calculate_analytics
from backend.app.services.file_reader import read_sales_file
from backend.app.services.forecast import calculate_forecast
from backend.app.services.validator import validate_sales_data


def build_academic_evidence() -> dict[str, Any]:
    regression = _analyze("sample_data/sample_sales_demo_60_days.csv")
    integrated = _analyze("sample_data/marketlens_ds_demo_365_days.csv")
    weekly = _analyze(
        "sample_data/ds_scenarios/forecast_weekly_84_days.csv"
    )
    association = _analyze(
        "sample_data/ds_scenarios/association_known_lift.csv"
    )
    cohort = _analyze(
        "sample_data/ds_scenarios/cohort_known_retention.csv"
    )

    known_rule = next(
        rule
        for rule in association["analytics"]["sales"][
            "product_intelligence"
        ]["associations"]["rules"]
        if rule["source_product_id"] == "P001"
        and rule["target_product_id"] == "P002"
    )
    january = next(
        item
        for item in cohort["analytics"]["customers"]["cohort_analysis"][
            "cohorts"
        ]
        if item["cohort_month"] == "2026-01"
    )

    return {
        "evidence_version": "1.0",
        "analysis_contract_version": "3.0",
        "datasets": {
            "regression_60_days": _forecast_evidence(regression),
            "integrated_365_days": {
                **_forecast_evidence(integrated),
                "total_revenue": integrated["analytics"]["summary"][
                    "total_revenue"
                ],
                "top_association_lift": integrated["analytics"]["sales"][
                    "product_intelligence"
                ]["associations"]["rules"][0]["lift"],
                "cohort_count": integrated["analytics"]["customers"][
                    "cohort_analysis"
                ]["cohort_count"],
            },
            "weekly_ground_truth": _forecast_evidence(weekly),
            "association_ground_truth": {
                "input_rows": association["input_rows"],
                "eligible_completed_orders": association["analytics"][
                    "sales"
                ]["product_intelligence"]["associations"][
                    "eligible_completed_order_count"
                ],
                "pair_order_count": known_rule["pair_order_count"],
                "support_percent": known_rule["support_percent"],
                "confidence_p001_to_p002_percent": known_rule[
                    "confidence_percent"
                ],
                "lift": known_rule["lift"],
            },
            "cohort_ground_truth": {
                "input_rows": cohort["input_rows"],
                "january_cohort_size": january["cohort_size"],
                "january_retention_percent": [
                    period["retention_percent"]
                    for period in january["periods"]
                ],
            },
        },
    }


def _analyze(relative_path: str) -> dict[str, Any]:
    path = PROJECT_ROOT / relative_path
    frame = validate_sales_data(
        read_sales_file(
            file_name=path.name,
            content=path.read_bytes(),
        ),
        max_rows=50_000,
    )
    analytics = calculate_analytics(frame)
    forecast, _ = calculate_forecast(analytics["revenue_by_date"])
    return {
        "input_rows": len(frame),
        "analytics": analytics,
        "forecast": forecast,
    }


def _forecast_evidence(result: dict[str, Any]) -> dict[str, Any]:
    forecast = result["forecast"]
    evaluation = forecast["evaluation"]
    uncertainty = forecast["uncertainty"]
    return {
        "input_rows": result["input_rows"],
        "history_days": forecast["history_days"],
        "selected_method": forecast["method"],
        "selection_reason": forecast["selection"]["selection_reason"],
        "fold_count": forecast["selection"]["fold_count"],
        "candidate_mae": {
            item["method"]: item["metrics"]["mae"]
            for item in forecast["selection"]["candidates"]
        },
        "model_mae": (
            evaluation["model_metrics"]["mae"]
            if evaluation["available"]
            else None
        ),
        "model_smape_percent": (
            evaluation["model_metrics"]["smape_percent"]
            if evaluation["available"]
            else None
        ),
        "reliability": evaluation["reliability"],
        "uncertainty_absolute_error_quantile": uncertainty[
            "absolute_error_quantile"
        ],
        "observed_backtest_coverage_percent": uncertainty[
            "observed_backtest_coverage_percent"
        ],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--check",
        action="store_true",
        help="Fail unless the committed evidence matches production code.",
    )
    args = parser.parse_args()
    actual = build_academic_evidence()

    if args.check:
        expected = json.loads(EVIDENCE_PATH.read_text(encoding="utf-8"))
        if actual != expected:
            raise SystemExit(
                "Academic evidence is stale. Review the DS contract and "
                "update sample_data/ACADEMIC_EVIDENCE.json intentionally."
            )
        print("Academic evidence: PASS.")
        return

    print(json.dumps(actual, ensure_ascii=False, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
