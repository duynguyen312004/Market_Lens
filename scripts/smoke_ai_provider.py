from pathlib import Path

from backend.app.core.config import Settings
from backend.app.services.ai_report import (
    AIReportConfig,
    generate_ai_report,
)
from backend.app.services.analytics import calculate_analytics
from backend.app.services.file_reader import read_sales_file
from backend.app.services.forecast import calculate_forecast
from backend.app.services.report import build_rule_based_report
from backend.app.services.validator import validate_sales_data


SAMPLE_PATH = Path("sample_data/sample_sales_demo_60_days.csv")


def main() -> None:
    settings = Settings()
    if not settings.ai_report_enabled:
        raise SystemExit(
            "AI provider smoke: FAIL (AI_REPORT_ENABLED chưa bật)."
        )
    if (
        not settings.ai_model
        or not settings.ai_api_key
        or not settings.ai_api_base_url
    ):
        raise SystemExit(
            "AI provider smoke: FAIL "
            "(thiếu AI_MODEL, AI_API_BASE_URL hoặc AI_API_KEY)."
        )

    frame = read_sales_file(
        file_name=SAMPLE_PATH.name,
        content=SAMPLE_PATH.read_bytes(),
    )
    validated = validate_sales_data(
        frame,
        max_rows=settings.max_upload_rows,
    )
    analytics = calculate_analytics(validated)
    forecast, forecast_warnings = calculate_forecast(
        analytics["revenue_by_date"]
    )
    analysis_result = {
        **analytics,
        "forecast": forecast,
        "warnings": [
            *analytics["warnings"],
            *forecast_warnings,
        ],
    }
    generation = generate_ai_report(
        analysis_result=analysis_result,
        fallback_report=build_rule_based_report(analysis_result),
        config=AIReportConfig(
            enabled=settings.ai_report_enabled,
            provider=settings.ai_provider,
            model=settings.ai_model,
            api_base_url=settings.ai_api_base_url,
            api_key=settings.ai_api_key,
            timeout_seconds=settings.ai_timeout_seconds,
            max_output_tokens=settings.ai_max_output_tokens,
        ),
        safety_subject="local-provider-smoke",
    )

    if generation.warning_code:
        raise SystemExit(
            "AI provider smoke: FAIL "
            f"({generation.warning_code}; không in response/provider secret)."
        )
    if generation.report.get("source") != "ai":
        raise SystemExit(
            "AI provider smoke: FAIL (provider không trả source=ai)."
        )
    if generation.report.get("report_version") != "2.0":
        raise SystemExit(
            "AI provider smoke: FAIL (report_version không phải 2.0)."
        )
    if not all(
        recommendation.get("evidence")
        and recommendation.get("action")
        and recommendation.get("success_metric")
        for recommendation in generation.report.get(
            "recommendations",
            [],
        )
    ):
        raise SystemExit(
            "AI provider smoke: FAIL "
            "(recommendation thiếu evidence/action/success_metric)."
        )

    print(
        "AI provider smoke: PASS (report_version=2.0, evidence=validated) "
        f"(provider={settings.ai_provider}, model={settings.ai_model})."
    )


if __name__ == "__main__":
    main()
