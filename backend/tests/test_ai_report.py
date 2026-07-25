import json
from pathlib import Path
from typing import Any

import httpx
import pytest

from backend.app.services.ai_report import (
    AIReportConfig,
    build_safe_aggregate_payload,
    generate_ai_report,
)
from backend.app.services.analytics import calculate_analytics
from backend.app.services.file_reader import read_sales_file
from backend.app.services.forecast import calculate_forecast
from backend.app.services.report import build_rule_based_report
from backend.app.services.validator import validate_sales_data


SAMPLE_PATH = Path("sample_data/sample_sales_demo_60_days.csv")


@pytest.fixture(scope="module")
def analysis_result() -> dict[str, Any]:
    frame = read_sales_file(
        file_name=SAMPLE_PATH.name,
        content=SAMPLE_PATH.read_bytes(),
    )
    validated = validate_sales_data(frame, max_rows=50_000)
    analytics = calculate_analytics(validated)
    forecast, warnings = calculate_forecast(analytics["revenue_by_date"])
    return {
        **analytics,
        "forecast": forecast,
        "warnings": [*analytics["warnings"], *warnings],
    }


def test_safe_payload_excludes_customer_and_order_pii(
    analysis_result: dict[str, Any],
) -> None:
    payload = build_safe_aggregate_payload(analysis_result)
    keys = _all_keys(payload)
    serialized = json.dumps(payload, ensure_ascii=False)

    assert "customer_id" not in keys
    assert "customer_name" not in keys
    assert "order_id" not in keys
    assert "file_name" not in keys
    assert "email" not in keys
    for customer in analysis_result["customers"]["top_customers"]:
        assert customer["customer_id"] not in serialized
        assert customer["customer_name"] not in serialized
    for customer in analysis_result["customers"]["rfm"]["top_customers"]:
        assert customer["customer_id"] not in serialized
        assert customer["customer_name"] not in serialized
    for customer in analysis_result["customers"]["rfm"][
        "at_risk_customers"
    ]:
        assert customer["customer_id"] not in serialized
        assert customer["customer_name"] not in serialized


def test_openai_success_returns_validated_ai_report(
    analysis_result: dict[str, Any],
) -> None:
    captured_request: dict[str, Any] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured_request.update(json.loads(request.content))
        return httpx.Response(
            200,
            json={
                "status": "completed",
                "output": [
                    {
                        "type": "message",
                        "content": [
                                {
                                    "type": "output_text",
                                    "text": json.dumps(
                                        _valid_report(),
                                        ensure_ascii=False,
                                    ),
                                }
                        ],
                    }
                ],
            },
        )

    generation = generate_ai_report(
        analysis_result=analysis_result,
        fallback_report=build_rule_based_report(analysis_result),
        config=_openai_config(),
        safety_subject="verified-user-id",
        transport=httpx.MockTransport(handler),
    )

    assert generation.warning_code is None
    assert generation.report["source"] == "ai"
    assert generation.report["report_version"] == "2.0"
    assert generation.report["recommendations"][0]["title"] == (
        "Duy trì sản phẩm dẫn đầu"
    )
    assert generation.report["recommendations"][0]["evidence"][0] == (
        build_safe_aggregate_payload(analysis_result)["evidence_catalog"][0]
    )
    assert captured_request["model"] == "gpt-5.6-luna"
    assert captured_request["text"]["format"]["strict"] is True
    assert captured_request["store"] is False
    assert captured_request["safety_identifier"].startswith("marketlens_")
    request_text = json.dumps(captured_request, ensure_ascii=False)
    assert "verified-user-id" not in request_text


def test_gemini_success_returns_validated_ai_report_without_user_identifier(
    analysis_result: dict[str, Any],
) -> None:
    captured_request: dict[str, Any] = {}
    captured_headers: dict[str, str] = {}
    captured_url = ""

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal captured_url
        captured_url = str(request.url)
        captured_request.update(json.loads(request.content))
        captured_headers.update(request.headers)
        return httpx.Response(
            200,
            json={
                "status": "completed",
                "steps": [
                    {
                        "type": "model_output",
                        "content": [
                            {
                                "type": "text",
                                "text": json.dumps(
                                    _valid_report(),
                                    ensure_ascii=False,
                                ),
                            }
                        ],
                    }
                ],
            },
        )

    generation = generate_ai_report(
        analysis_result=analysis_result,
        fallback_report=build_rule_based_report(analysis_result),
        config=_gemini_config(),
        safety_subject="verified-user-id",
        transport=httpx.MockTransport(handler),
    )

    assert generation.warning_code is None
    assert generation.report["source"] == "ai"
    assert generation.report["generator"] == {
        "provider": "gemini",
        "model": "gemini-3.5-flash-lite",
    }
    assert captured_url.endswith("/v1beta/interactions")
    assert captured_headers["x-goog-api-key"] == "test-key"
    assert "authorization" not in captured_headers
    assert captured_request["model"] == "gemini-3.5-flash-lite"
    assert captured_request["store"] is False
    assert captured_request["generation_config"] == {
        "thinking_level": "minimal",
        "max_output_tokens": 1_200,
    }
    assert (
        captured_request["response_format"]["schema"]["additionalProperties"]
        is False
    )
    request_text = json.dumps(captured_request, ensure_ascii=False)
    assert "verified-user-id" not in request_text
    assert "customer_id" not in request_text
    assert "customer_name" not in request_text
    assert "order_id" not in request_text


def test_gemini_vietnamese_request_uses_vietnamese_prompt_and_disclaimer(
    analysis_result: dict[str, Any],
) -> None:
    captured_request: dict[str, Any] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured_request.update(json.loads(request.content))
        return httpx.Response(
            200,
            json={
                "status": "completed",
                "steps": [
                    {
                        "type": "model_output",
                        "content": [
                            {
                                "type": "text",
                                "text": json.dumps(
                                    _valid_report(),
                                    ensure_ascii=False,
                                ),
                            }
                        ],
                    }
                ],
            },
        )

    generation = generate_ai_report(
        analysis_result=analysis_result,
        fallback_report=build_rule_based_report(analysis_result, "vi"),
        config=_gemini_config(),
        safety_subject="verified-user-id",
        language="vi",
        transport=httpx.MockTransport(handler),
    )

    assert "natural Vietnamese" in captured_request["system_instruction"]
    assert generation.report["source"] == "ai"
    assert generation.report["disclaimer"].startswith("Báo cáo chỉ")


def test_invalid_json_uses_rule_based_fallback(
    analysis_result: dict[str, Any],
) -> None:
    def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "status": "completed",
                "output_text": "not-json",
            },
        )

    fallback = build_rule_based_report(analysis_result)
    generation = generate_ai_report(
        analysis_result=analysis_result,
        fallback_report=fallback,
        config=_openai_config(),
        safety_subject="verified-user-id",
        transport=httpx.MockTransport(handler),
    )

    assert generation.warning_code == "AI_INVALID_RESPONSE"
    assert generation.report == fallback


def test_unknown_evidence_reference_uses_rule_based_fallback(
    analysis_result: dict[str, Any],
) -> None:
    invalid_draft = _valid_report()
    invalid_draft["recommendations"][0]["evidence_keys"] = [
        "profit.margin_percent"
    ]

    def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "status": "completed",
                "output_text": json.dumps(invalid_draft),
            },
        )

    fallback = build_rule_based_report(analysis_result)
    generation = generate_ai_report(
        analysis_result=analysis_result,
        fallback_report=fallback,
        config=_openai_config(),
        safety_subject="verified-user-id",
        transport=httpx.MockTransport(handler),
    )

    assert generation.warning_code == "AI_INVALID_RESPONSE"
    assert generation.report == fallback


def test_section_cannot_cite_unrelated_evidence(
    analysis_result: dict[str, Any],
) -> None:
    invalid_draft = _valid_report()
    invalid_draft["sections"][0]["evidence_keys"] = [
        "customers.repeat_customer_rate_percent"
    ]

    def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "status": "completed",
                "output_text": json.dumps(invalid_draft),
            },
        )

    fallback = build_rule_based_report(analysis_result)
    generation = generate_ai_report(
        analysis_result=analysis_result,
        fallback_report=fallback,
        config=_openai_config(),
        safety_subject="verified-user-id",
        transport=httpx.MockTransport(handler),
    )

    assert generation.warning_code == "AI_INVALID_RESPONSE"
    assert generation.report == fallback


def test_timeout_uses_rule_based_fallback(
    analysis_result: dict[str, Any],
) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("timeout", request=request)

    fallback = build_rule_based_report(analysis_result)
    generation = generate_ai_report(
        analysis_result=analysis_result,
        fallback_report=fallback,
        config=_openai_config(),
        safety_subject="verified-user-id",
        transport=httpx.MockTransport(handler),
    )

    assert generation.warning_code == "AI_TIMEOUT"
    assert generation.report == fallback


def test_missing_configuration_uses_fallback_without_network(
    analysis_result: dict[str, Any],
) -> None:
    fallback = build_rule_based_report(analysis_result)
    config = _gemini_config()
    generation = generate_ai_report(
        analysis_result=analysis_result,
        fallback_report=fallback,
        config=AIReportConfig(
            enabled=True,
            provider="gemini",
            model=config.model,
            api_base_url=config.api_base_url,
            api_key=None,
            timeout_seconds=config.timeout_seconds,
            max_output_tokens=config.max_output_tokens,
        ),
        safety_subject="verified-user-id",
    )

    assert generation.warning_code == "AI_NOT_CONFIGURED"
    assert generation.report == fallback


def test_gemini_rate_limit_uses_rule_based_fallback(
    analysis_result: dict[str, Any],
) -> None:
    def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(429, json={"error": {"status": "RESOURCE_EXHAUSTED"}})

    fallback = build_rule_based_report(analysis_result)
    generation = generate_ai_report(
        analysis_result=analysis_result,
        fallback_report=fallback,
        config=_gemini_config(),
        safety_subject="verified-user-id",
        transport=httpx.MockTransport(handler),
    )

    assert generation.warning_code == "AI_RATE_LIMITED"
    assert generation.report == fallback


def test_gemini_incomplete_response_uses_rule_based_fallback(
    analysis_result: dict[str, Any],
) -> None:
    def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={"status": "failed", "steps": []},
        )

    fallback = build_rule_based_report(analysis_result)
    generation = generate_ai_report(
        analysis_result=analysis_result,
        fallback_report=fallback,
        config=_gemini_config(),
        safety_subject="verified-user-id",
        transport=httpx.MockTransport(handler),
    )

    assert generation.warning_code == "AI_INVALID_RESPONSE"
    assert generation.report == fallback


def _openai_config() -> AIReportConfig:
    return AIReportConfig(
        enabled=True,
        provider="openai",
        model="gpt-5.6-luna",
        api_base_url="https://api.openai.com/v1",
        api_key="test-key",
        timeout_seconds=1,
        max_output_tokens=1_200,
    )


def _gemini_config() -> AIReportConfig:
    return AIReportConfig(
        enabled=True,
        provider="gemini",
        model="gemini-3.5-flash-lite",
        api_base_url="https://generativelanguage.googleapis.com/v1beta",
        api_key="test-key",
        timeout_seconds=1,
        max_output_tokens=1_200,
    )


def _valid_report() -> dict[str, Any]:
    return {
        "title": "Báo cáo AI về tình hình kinh doanh",
        "executive_summary": (
            "Shop đạt 113.010.000 VND doanh thu từ 273 đơn completed "
            "trong kỳ dữ liệu."
        ),
        "sections": [
            {
                "key": "revenue",
                "narrative": (
                    "Doanh thu kỳ này được tổng hợp từ các đơn đã hoàn tất."
                ),
                "evidence_keys": ["summary.total_revenue"],
            },
            {
                "key": "products",
                "narrative": (
                    "Sản phẩm dẫn đầu có đóng góp doanh thu cao nhất trong kỳ."
                ),
                "evidence_keys": ["sales.top_product.revenue"],
            },
            {
                "key": "customers",
                "narrative": (
                    "Tỷ lệ khách hàng quay lại phản ánh hành vi mua lặp trong kỳ."
                ),
                "evidence_keys": [
                    "customers.repeat_customer_rate_percent"
                ],
            },
            {
                "key": "forecast",
                "narrative": (
                    "Dự báo bảy ngày được đánh giá trên lịch sử doanh thu hiện có."
                ),
                "evidence_keys": ["forecast.history_days"],
            },
        ],
        "risk_signals": [],
        "recommendations": [
            {
                "priority": "medium",
                "title": "Duy trì sản phẩm dẫn đầu",
                "evidence_keys": ["summary.total_revenue"],
                "action": (
                    "Theo dõi đóng góp của Tai nghe Bluetooth trong "
                    "các kỳ dữ liệu tiếp theo."
                ),
                "success_metric": (
                    "Doanh thu thuần kỳ sau không thấp hơn kỳ hiện tại."
                ),
            }
        ],
    }


def _all_keys(value: Any) -> set[str]:
    if isinstance(value, dict):
        return set(value).union(
            *(_all_keys(item) for item in value.values()),
            set(),
        )
    if isinstance(value, list):
        return set().union(*(_all_keys(item) for item in value), set())
    return set()
