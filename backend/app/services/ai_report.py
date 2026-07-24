import hashlib
import json
from dataclasses import dataclass
from typing import Any

import httpx
from pydantic import ValidationError

from backend.app.schemas.analysis import ReportContent
from backend.app.services.report import REPORT_DISCLAIMER


SYSTEM_PROMPT = """
Bạn là chuyên viên viết báo cáo bán hàng tiếng Việt cho chủ shop.

Quy tắc bắt buộc:
- Chỉ sử dụng dữ liệu aggregate trong JSON người dùng cung cấp.
- Không tự tính lại, sửa hoặc thêm KPI.
- Không nêu nguyên nhân như một sự thật khi dữ liệu không chứng minh.
- Không suy đoán về lợi nhuận, tồn kho, quảng cáo, đối thủ hoặc giá thị trường.
- Phân biệt rõ số liệu thực tế và forecast.
- Viết ngắn gọn, cụ thể, dễ hành động.
- Tối đa 3 điểm nổi bật và 3 khuyến nghị.
- Không nhắc đến customer cụ thể.
- Trả đúng JSON schema, không thêm nội dung ngoài schema.
""".strip()


REPORT_JSON_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "summary": {"type": "string"},
        "highlights": {
            "type": "array",
            "items": {"type": "string"},
            "minItems": 1,
            "maxItems": 3,
        },
        "trend_analysis": {"type": "string"},
        "recommendations": {
            "type": "array",
            "minItems": 1,
            "maxItems": 3,
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "description": {"type": "string"},
                },
                "required": ["title", "description"],
                "additionalProperties": False,
            },
        },
        "disclaimer": {"type": "string"},
    },
    "required": [
        "title",
        "summary",
        "highlights",
        "trend_analysis",
        "recommendations",
        "disclaimer",
    ],
    "additionalProperties": False,
}


@dataclass(frozen=True)
class AIReportConfig:
    enabled: bool
    provider: str
    model: str | None
    api_base_url: str
    api_key: str | None
    timeout_seconds: float
    max_output_tokens: int


@dataclass(frozen=True)
class AIReportGeneration:
    report: dict[str, Any]
    warning_code: str | None = None


class AIReportProviderError(Exception):
    def __init__(self, code: str) -> None:
        super().__init__(code)
        self.code = code


SUPPORTED_AI_PROVIDERS = frozenset({"gemini", "openai"})


def build_safe_aggregate_payload(
    analysis_result: dict[str, Any],
) -> dict[str, Any]:
    sales = analysis_result.get("sales") or {}
    customers = analysis_result.get("customers") or {}
    forecast = analysis_result.get("forecast") or {}

    return {
        "period": analysis_result.get("period") or {},
        "actual_summary": analysis_result.get("summary") or {},
        "recent_daily_revenue": [
            {
                "date": item.get("date"),
                "revenue": item.get("revenue"),
            }
            for item in (analysis_result.get("revenue_by_date") or [])[-14:]
        ],
        "sales": {
            "revenue_by_month": sales.get("revenue_by_month") or [],
            "revenue_by_category": sales.get("revenue_by_category") or [],
            "top_products_by_revenue": [
                _safe_product(item)
                for item in (sales.get("top_products_by_revenue") or [])
            ],
            "top_products_by_quantity": [
                _safe_product(item)
                for item in (sales.get("top_products_by_quantity") or [])
            ],
            "lowest_quantity_products": [
                _safe_product(item)
                for item in (sales.get("lowest_quantity_products") or [])
            ],
        },
        "customer_aggregates": {
            "segments": customers.get("segments") or {},
            "potential_count": customers.get("potential_count") or 0,
        },
        "forecast": {
            "available": forecast.get("available", False),
            "method": forecast.get("method"),
            "history_days": forecast.get("history_days", 0),
            "forecast_days": forecast.get("forecast_days", 0),
            "forecast_total": forecast.get("forecast_total"),
            "change_vs_last_7_days_percent": forecast.get(
                "change_vs_last_7_days_percent"
            ),
            "points": forecast.get("points") or [],
            "disclaimer": forecast.get("disclaimer"),
        },
        "warning_codes": analysis_result.get("warnings") or [],
    }


def generate_ai_report(
    *,
    analysis_result: dict[str, Any],
    fallback_report: dict[str, Any],
    config: AIReportConfig,
    safety_subject: str,
    transport: httpx.BaseTransport | None = None,
) -> AIReportGeneration:
    if not config.enabled:
        return AIReportGeneration(
            report=fallback_report,
            warning_code="AI_DISABLED",
        )
    provider = config.provider.strip().casefold()
    if provider not in SUPPORTED_AI_PROVIDERS:
        return AIReportGeneration(
            report=fallback_report,
            warning_code="AI_PROVIDER_UNSUPPORTED",
        )
    if (
        not config.api_key
        or not config.api_key.strip()
        or not config.model
        or not config.model.strip()
        or not config.api_base_url.strip()
    ):
        return AIReportGeneration(
            report=fallback_report,
            warning_code="AI_NOT_CONFIGURED",
        )

    safe_payload = build_safe_aggregate_payload(analysis_result)

    try:
        with httpx.Client(
            timeout=config.timeout_seconds,
            transport=transport,
        ) as client:
            raw_report = json.loads(
                _request_report(
                    client=client,
                    provider=provider,
                    config=config,
                    safe_payload=safe_payload,
                    safety_subject=safety_subject,
                )
            )
            validated = ReportContent.model_validate(raw_report)
    except httpx.TimeoutException:
        return AIReportGeneration(
            report=fallback_report,
            warning_code="AI_TIMEOUT",
        )
    except httpx.HTTPStatusError as error:
        return AIReportGeneration(
            report=fallback_report,
            warning_code=(
                "AI_RATE_LIMITED"
                if error.response.status_code == 429
                else "AI_PROVIDER_ERROR"
            ),
        )
    except (AIReportProviderError, json.JSONDecodeError, ValidationError):
        return AIReportGeneration(
            report=fallback_report,
            warning_code="AI_INVALID_RESPONSE",
        )
    except (httpx.HTTPError, TypeError, ValueError):
        return AIReportGeneration(
            report=fallback_report,
            warning_code="AI_PROVIDER_ERROR",
        )

    report = validated.model_dump()
    report["source"] = "ai"
    report["disclaimer"] = REPORT_DISCLAIMER
    return AIReportGeneration(report=report)


def _request_report(
    *,
    client: httpx.Client,
    provider: str,
    config: AIReportConfig,
    safe_payload: dict[str, Any],
    safety_subject: str,
) -> str:
    if provider == "gemini":
        return _request_gemini_report(
            client=client,
            config=config,
            safe_payload=safe_payload,
        )
    return _request_openai_report(
        client=client,
        config=config,
        safe_payload=safe_payload,
        safety_subject=safety_subject,
    )


def _request_gemini_report(
    *,
    client: httpx.Client,
    config: AIReportConfig,
    safe_payload: dict[str, Any],
) -> str:
    response = client.post(
        f"{config.api_base_url.rstrip('/')}/interactions",
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": config.api_key,
        },
        json={
            "model": config.model,
            "input": json.dumps(
                safe_payload,
                ensure_ascii=False,
                separators=(",", ":"),
            ),
            "system_instruction": SYSTEM_PROMPT,
            "response_format": {
                "type": "text",
                "mime_type": "application/json",
                "schema": REPORT_JSON_SCHEMA,
            },
            "generation_config": {
                "thinking_level": "minimal",
                "max_output_tokens": config.max_output_tokens,
            },
            "store": False,
        },
    )
    response.raise_for_status()
    return _extract_gemini_output_text(response.json())


def _request_openai_report(
    *,
    client: httpx.Client,
    config: AIReportConfig,
    safe_payload: dict[str, Any],
    safety_subject: str,
) -> str:
    response = client.post(
        f"{config.api_base_url.rstrip('/')}/responses",
        headers={
            "Authorization": f"Bearer {config.api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": config.model,
            "input": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": json.dumps(
                        safe_payload,
                        ensure_ascii=False,
                        separators=(",", ":"),
                    ),
                },
            ],
            "reasoning": {"effort": "low"},
            "text": {
                "format": {
                    "type": "json_schema",
                    "name": "marketlens_business_report",
                    "schema": REPORT_JSON_SCHEMA,
                    "strict": True,
                }
            },
            "max_output_tokens": config.max_output_tokens,
            "store": False,
            "safety_identifier": _safety_identifier(safety_subject),
        },
    )
    response.raise_for_status()
    return _extract_openai_output_text(response.json())


def _safe_product(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "product_name": item.get("product_name"),
        "category": item.get("category"),
        "revenue": item.get("revenue"),
        "quantity": item.get("quantity"),
        "order_count": item.get("order_count"),
    }


def _extract_openai_output_text(response: dict[str, Any]) -> str:
    if response.get("status") == "incomplete":
        raise AIReportProviderError("AI_INCOMPLETE")

    direct_output = response.get("output_text")
    if isinstance(direct_output, str) and direct_output:
        return direct_output

    for output in response.get("output") or []:
        if output.get("type") != "message":
            continue
        for item in output.get("content") or []:
            if item.get("type") == "refusal":
                raise AIReportProviderError("AI_REFUSED")
            if item.get("type") == "output_text":
                text = item.get("text")
                if isinstance(text, str) and text:
                    return text

    raise AIReportProviderError("AI_EMPTY_RESPONSE")


def _extract_gemini_output_text(response: dict[str, Any]) -> str:
    if response.get("status") != "completed":
        raise AIReportProviderError("AI_INCOMPLETE")

    for step in reversed(response.get("steps") or []):
        if step.get("type") != "model_output":
            continue
        for item in reversed(step.get("content") or []):
            text = item.get("text")
            if item.get("type") == "text" and isinstance(text, str) and text:
                return text

    raise AIReportProviderError("AI_EMPTY_RESPONSE")


def _safety_identifier(subject: str) -> str:
    digest = hashlib.sha256(subject.encode("utf-8")).hexdigest()
    return f"marketlens_{digest[:32]}"
