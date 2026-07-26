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
from scripts.generate_ds_demo_data import (
    DATASET_CUTOFF_DATE,
    DATASET_SUITE_VERSION,
)


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
        if rule["source_product_id"] == "AS-P001"
        and rule["target_product_id"] == "AS-P002"
    )
    january = next(
        item
        for item in cohort["analytics"]["customers"]["cohort_analysis"][
            "cohorts"
        ]
        if item["cohort_month"] == "2026-01"
    )

    return {
        "evidence_version": "2.2",
        "analysis_contract_version": "5.0",
        "dataset_suite_version": DATASET_SUITE_VERSION,
        "dataset_cutoff_date": DATASET_CUTOFF_DATE.isoformat(),
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
                "growth_drivers": _growth_evidence(
                    integrated["analytics"]
                ),
            },
            "weekly_ground_truth": _forecast_evidence(weekly),
            "association_ground_truth": {
                "input_rows": association["input_rows"],
                "source_product_id": known_rule[
                    "source_product_id"
                ],
                "target_product_id": known_rule[
                    "target_product_id"
                ],
                "eligible_completed_orders": association["analytics"][
                    "sales"
                ]["product_intelligence"]["associations"][
                    "eligible_completed_order_count"
                ],
                "pair_order_count": known_rule["pair_order_count"],
                "support_percent": known_rule["support_percent"],
                "confidence_percent": known_rule["confidence_percent"],
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
    return {
        "input_rows": result["input_rows"],
        "history_days": result["analytics"]["period"]["history_days"],
        "horizons": {
            str(horizon["horizon_days"]): _horizon_evidence(horizon)
            for horizon in forecast["horizons"]
        },
    }


def _horizon_evidence(horizon: dict[str, Any]) -> dict[str, Any]:
    evaluation = horizon["evaluation"]
    uncertainty = horizon["uncertainty"]
    primary_metric_key = (
        "daily_metrics"
        if horizon["horizon_days"] == 7
        else "total_metrics"
    )
    evaluation_metric_key = (
        "model_daily_metrics"
        if horizon["horizon_days"] == 7
        else "model_total_metrics"
    )
    return {
        "available": horizon["available"],
        "forecast_total": horizon["forecast_total"],
        "change_vs_previous_period_percent": horizon[
            "change_vs_previous_period_percent"
        ],
        "selected_method": horizon["method"],
        "selection_reason": horizon["selection"]["selection_reason"],
        "primary_metric": horizon["selection"]["primary_metric"],
        "fold_count": horizon["selection"]["fold_count"],
        "candidate_primary_mae": {
            item["method"]: item[primary_metric_key]["mae"]
            for item in horizon["selection"]["candidates"]
        },
        "model_primary_mae": (
            evaluation[evaluation_metric_key]["mae"]
            if evaluation["available"]
            else None
        ),
        "model_primary_smape_percent": (
            evaluation[evaluation_metric_key]["smape_percent"]
            if evaluation["available"]
            else None
        ),
        "reliability": evaluation["reliability"],
        "daily_error_quantile": uncertainty[
            "absolute_error_quantile"
        ],
        "observed_daily_coverage_percent": uncertainty[
            "observed_backtest_coverage_percent"
        ],
        "total_error_quantile": uncertainty[
            "total_absolute_error_quantile"
        ],
        "observed_total_coverage_percent": uncertainty[
            "observed_total_backtest_coverage_percent"
        ],
    }


def _growth_evidence(analytics: dict[str, Any]) -> dict[str, Any]:
    growth = analytics["sales"]["growth_drivers"]
    return {
        str(period["comparison_type"]): {
            "available": period["available"],
            "net_revenue_change": period["net_revenue_change"],
            "top_product_increase": (
                period["product_growth_drivers"][0]["product_id"]
                if period["product_growth_drivers"]
                else None
            ),
            "top_product_decrease": (
                period["product_decline_drivers"][0]["product_id"]
                if period["product_decline_drivers"]
                else None
            ),
        }
        for period in growth["periods"]
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--check",
        action="store_true",
        help="Fail unless the committed evidence matches production code.",
    )
    parser.add_argument(
        "--write",
        action="store_true",
        help="Write reviewed production evidence to the committed JSON file.",
    )
    args = parser.parse_args()
    if args.check and args.write:
        raise SystemExit("--check and --write cannot be used together.")
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

    if args.write:
        EVIDENCE_PATH.write_text(
            json.dumps(
                actual,
                ensure_ascii=False,
                indent=2,
                sort_keys=True,
            )
            + "\n",
            encoding="utf-8",
        )
        print(f"Academic evidence written: {EVIDENCE_PATH}")
        return

    print(json.dumps(actual, ensure_ascii=False, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
