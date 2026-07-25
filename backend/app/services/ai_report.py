from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, Literal

import httpx
from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    ValidationError,
    model_validator,
)

from backend.app.schemas.analysis import ReportContent
from backend.app.services.report import (
    REPORT_DISCLAIMERS,
    SECTION_TITLES,
    hydrate_evidence,
)
from backend.app.services.report_evidence import (
    build_report_evidence_catalog,
)
from backend.app.services.report_types import ReportLanguage


SECTION_KEYS = ("revenue", "products", "customers", "forecast")
SECTION_EVIDENCE_PREFIXES = {
    "revenue": (
        "summary.",
        "orders.",
        "sales.gross_revenue",
        "sales.discount_rate_percent",
    ),
    "products": (
        "sales.top_product.",
        "sales.lowest_quantity_product.",
        "sales.top_category.",
        "sales.concentration.",
        "sales.association.",
    ),
    "customers": ("customers.",),
    "forecast": ("forecast.",),
}


class StrictDraftModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class AIReportSectionDraft(StrictDraftModel):
    key: Literal["revenue", "products", "customers", "forecast"]
    narrative: str = Field(min_length=10, max_length=1_500)
    evidence_keys: list[str] = Field(min_length=1, max_length=5)


class AIReportRiskDraft(StrictDraftModel):
    code: str = Field(min_length=1, max_length=96)
    severity: Literal["info", "warning", "critical"]
    title: str = Field(min_length=3, max_length=120)
    description: str = Field(min_length=10, max_length=800)
    evidence_keys: list[str] = Field(min_length=1, max_length=3)


class AIReportRecommendationDraft(StrictDraftModel):
    priority: Literal["high", "medium", "low"]
    title: str = Field(min_length=3, max_length=160)
    evidence_keys: list[str] = Field(min_length=1, max_length=3)
    action: str = Field(min_length=10, max_length=1_000)
    success_metric: str = Field(min_length=10, max_length=600)


class AIReportDraft(StrictDraftModel):
    title: str = Field(min_length=3, max_length=160)
    executive_summary: str = Field(min_length=20, max_length=1_500)
    sections: list[AIReportSectionDraft] = Field(
        min_length=4,
        max_length=4,
    )
    risk_signals: list[AIReportRiskDraft] = Field(max_length=5)
    recommendations: list[AIReportRecommendationDraft] = Field(
        min_length=1,
        max_length=5,
    )

    @model_validator(mode="after")
    def validate_section_order(self) -> "AIReportDraft":
        if [section.key for section in self.sections] != list(SECTION_KEYS):
            raise ValueError(
                "AI report sections must use the required order."
            )
        return self


def build_system_prompt(language: ReportLanguage) -> str:
    output_language = (
        "Write every user-facing field in natural Vietnamese."
        if language == "vi"
        else "Write every user-facing field in clear English."
    )
    return f"""
You are a sales reporting specialist writing for shop owners.

Mandatory rules:
- {output_language}
- Use only the aggregate evidence_catalog in the supplied JSON.
- Never recalculate, modify, copy with a changed value, or invent a KPI.
- When mentioning a figure, copy its display_value exactly. Do not copy the raw value.
- Write for a non-technical shop owner. Do not expose internal method codes or terms such as backtest, baseline, residual, fold, candidate, RFM, cohort, MAE, RMSE, sMAPE, lift, confidence, support, schema, backend, or metric_key.
- Explain technical findings in plain business language instead.
- Cite evidence only by exact metric_key strings present in evidence_catalog.
- Use the four section keys exactly once and in this order: revenue, products, customers, forecast.
- Keep each section grounded in evidence relevant to that section.
- Do not state a cause as fact when the data does not prove it.
- Product association lift is not causality.
- Forecast reliability is backtest evidence, not a probability or guarantee.
- Do not speculate about profit, inventory, advertising, competitors, or market prices.
- Never mention or infer a specific customer.
- Return at most 5 risk signals and 5 recommendations.
- Every risk and recommendation must cite 1-3 exact evidence keys.
- Every recommendation must include a concrete action and a measurable success metric.
- Return exactly the requested JSON schema with no additional content.
""".strip()


SYSTEM_PROMPT = build_system_prompt("en")


def build_report_json_schema(
    safe_payload: dict[str, Any],
    *,
    restrict_metric_keys: bool = True,
) -> dict[str, Any]:
    metric_keys = [
        str(item["metric_key"])
        for item in safe_payload["evidence_catalog"]
    ]

    def evidence_keys_schema(maximum: int) -> dict[str, Any]:
        item_schema: dict[str, Any] = {"type": "string"}
        if restrict_metric_keys:
            item_schema["enum"] = metric_keys
        return {
            "type": "array",
            "items": item_schema,
            "minItems": 1,
            "maxItems": maximum,
        }

    return {
        "type": "object",
        "properties": {
            "title": {
                "type": "string",
            },
            "executive_summary": {
                "type": "string",
            },
            "sections": {
                "type": "array",
                "minItems": 4,
                "maxItems": 4,
                "items": {
                    "type": "object",
                    "properties": {
                        "key": {
                            "type": "string",
                            "enum": list(SECTION_KEYS),
                        },
                        "narrative": {
                            "type": "string",
                        },
                        "evidence_keys": evidence_keys_schema(5),
                    },
                    "required": [
                        "key",
                        "narrative",
                        "evidence_keys",
                    ],
                    "additionalProperties": False,
                },
            },
            "risk_signals": {
                "type": "array",
                "maxItems": 5,
                "items": {
                    "type": "object",
                    "properties": {
                        "code": {
                            "type": "string",
                        },
                        "severity": {
                            "type": "string",
                            "enum": ["info", "warning", "critical"],
                        },
                        "title": {
                            "type": "string",
                        },
                        "description": {
                            "type": "string",
                        },
                        "evidence_keys": evidence_keys_schema(3),
                    },
                    "required": [
                        "code",
                        "severity",
                        "title",
                        "description",
                        "evidence_keys",
                    ],
                    "additionalProperties": False,
                },
            },
            "recommendations": {
                "type": "array",
                "minItems": 1,
                "maxItems": 5,
                "items": {
                    "type": "object",
                    "properties": {
                        "priority": {
                            "type": "string",
                            "enum": ["high", "medium", "low"],
                        },
                        "title": {
                            "type": "string",
                        },
                        "evidence_keys": evidence_keys_schema(3),
                        "action": {
                            "type": "string",
                        },
                        "success_metric": {
                            "type": "string",
                        },
                    },
                    "required": [
                        "priority",
                        "title",
                        "evidence_keys",
                        "action",
                        "success_metric",
                    ],
                    "additionalProperties": False,
                },
            },
        },
        "required": [
            "title",
            "executive_summary",
            "sections",
            "risk_signals",
            "recommendations",
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
    language: ReportLanguage = "en",
) -> dict[str, Any]:
    sales = analysis_result.get("sales") or {}
    customers = analysis_result.get("customers") or {}
    forecast = analysis_result.get("forecast") or {}
    product_intelligence = sales.get("product_intelligence") or {}
    catalog = build_report_evidence_catalog(
        analysis_result,
        language,
    )
    metric_keys = list(catalog)
    return {
        "contract_version": analysis_result.get("contract_version"),
        "period": analysis_result.get("period") or {},
        "evidence_catalog": [
            {
                **evidence,
                "display_value": _display_evidence_value(
                    evidence,
                    language,
                ),
            }
            for evidence in catalog.values()
        ],
        "allowed_evidence_keys_by_section": {
            section_key: [
                metric_key
                for metric_key in metric_keys
                if metric_key.startswith(
                    SECTION_EVIDENCE_PREFIXES[section_key]
                )
            ]
            for section_key in SECTION_KEYS
        },
        "allowed_evidence_keys_for_risks_and_recommendations": (
            metric_keys
        ),
        "availability": {
            "rfm": _availability(customers.get("rfm") or {}),
            "cohort": _availability(
                customers.get("cohort_analysis") or {}
            ),
            "product_associations": _availability(
                product_intelligence.get("associations") or {}
            ),
            "forecast": {
                "available": bool(forecast.get("available")),
                "reason": (
                    None
                    if forecast.get("available")
                    else "INSUFFICIENT_HISTORY"
                ),
            },
            "forecast_evaluation": _availability(
                forecast.get("evaluation") or {}
            ),
            "forecast_uncertainty": _availability(
                forecast.get("uncertainty") or {}
            ),
        },
        "warning_codes": analysis_result.get("warnings") or [],
    }


def generate_ai_report(
    *,
    analysis_result: dict[str, Any],
    fallback_report: dict[str, Any],
    config: AIReportConfig,
    safety_subject: str,
    language: ReportLanguage = "en",
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

    safe_payload = build_safe_aggregate_payload(
        analysis_result,
        language,
    )
    try:
        with httpx.Client(
            timeout=config.timeout_seconds,
            transport=transport,
        ) as client:
            raw_draft = json.loads(
                _request_report(
                    client=client,
                    provider=provider,
                    config=config,
                    safe_payload=safe_payload,
                    safety_subject=safety_subject,
                    language=language,
                )
            )
        draft = AIReportDraft.model_validate(raw_draft)
        _validate_public_copy(draft, language)
        report = _hydrate_ai_report(
            draft=draft,
            analysis_result=analysis_result,
            fallback_report=fallback_report,
            provider=provider,
            model=config.model,
            language=language,
        )
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
    except (
        AIReportProviderError,
        json.JSONDecodeError,
        ValidationError,
        ValueError,
    ):
        return AIReportGeneration(
            report=fallback_report,
            warning_code="AI_INVALID_RESPONSE",
        )
    except (httpx.HTTPError, TypeError):
        return AIReportGeneration(
            report=fallback_report,
            warning_code="AI_PROVIDER_ERROR",
        )
    return AIReportGeneration(report=report)


def _hydrate_ai_report(
    *,
    draft: AIReportDraft,
    analysis_result: dict[str, Any],
    fallback_report: dict[str, Any],
    provider: str,
    model: str,
    language: ReportLanguage,
) -> dict[str, Any]:
    catalog = build_report_evidence_catalog(
        analysis_result,
        language,
    )
    sections = []
    for section in draft.sections:
        allowed_prefixes = SECTION_EVIDENCE_PREFIXES[section.key]
        if any(
            not metric_key.startswith(allowed_prefixes)
            for metric_key in section.evidence_keys
        ):
            raise ValueError(
                "A report section references unrelated evidence."
            )
        sections.append(
            {
                "key": section.key,
                "title": SECTION_TITLES[section.key][language],
                "narrative": section.narrative,
                "evidence": hydrate_evidence(
                    catalog,
                    section.evidence_keys,
                ),
            }
        )

    report = {
        "report_version": "2.0",
        "source": "ai",
        "language": language,
        "generated_at": datetime.now(UTC).isoformat(),
        "generator": {
            "provider": provider,
            "model": model,
        },
        "title": draft.title,
        "executive_summary": draft.executive_summary,
        "kpi_snapshot": fallback_report["kpi_snapshot"],
        "data_quality": fallback_report["data_quality"],
        "sections": sections,
        "risk_signals": [
            {
                "code": f"AI_{risk.code}",
                "severity": risk.severity,
                "title": risk.title,
                "description": risk.description,
                "evidence": hydrate_evidence(
                    catalog,
                    risk.evidence_keys,
                    maximum=3,
                ),
            }
            for risk in draft.risk_signals
        ],
        "recommendations": [
            {
                "priority": recommendation.priority,
                "title": recommendation.title,
                "evidence": hydrate_evidence(
                    catalog,
                    recommendation.evidence_keys,
                    maximum=3,
                ),
                "action": recommendation.action,
                "success_metric": recommendation.success_metric,
            }
            for recommendation in draft.recommendations
        ],
        "disclaimer": REPORT_DISCLAIMERS[language],
    }
    return ReportContent.model_validate(report).model_dump(mode="json")


def _availability(value: dict[str, Any]) -> dict[str, Any]:
    return {
        "available": bool(value.get("available")),
        "reason": value.get("reason"),
    }


_INTERNAL_REPORT_TERMS = re.compile(
    r"""
    \bbacktests?\b
    |\bbaselines?\b
    |\bresiduals?\b
    |\bfolds?\b
    |\bcandidates?\b
    |\bRFM\b
    |\bcohorts?\b
    |\bMAE\b
    |\bRMSE\b
    |\bsMAPE\b
    |\bmetric[_ ]keys?\b
    |\bschemas?\b
    |\bbackends?\b
    |\b(?:linear_trend|moving_average|seasonal_naive|weekday_average)_\w+\b
    """,
    re.IGNORECASE | re.VERBOSE,
)


def _validate_public_copy(
    draft: AIReportDraft,
    language: ReportLanguage,
) -> None:
    texts = [
        draft.title,
        draft.executive_summary,
        *(section.narrative for section in draft.sections),
        *(
            text
            for risk in draft.risk_signals
            for text in (risk.title, risk.description)
        ),
        *(
            text
            for recommendation in draft.recommendations
            for text in (
                recommendation.title,
                recommendation.action,
                recommendation.success_metric,
            )
        ),
    ]
    decimal_separator = "," if language == "vi" else r"\."
    excessive_precision = re.compile(
        rf"(?<![\d.,])\d+{decimal_separator}\d{{3,}}(?![\d.,])"
    )
    for text in texts:
        if _INTERNAL_REPORT_TERMS.search(text):
            raise ValueError("AI report contains internal terminology.")
        if excessive_precision.search(text):
            raise ValueError("AI report contains excessive decimal precision.")


def _display_evidence_value(
    evidence: dict[str, Any],
    language: ReportLanguage,
) -> str:
    value = evidence.get("value")
    unit = evidence.get("unit")
    if isinstance(value, str):
        return value
    if not isinstance(value, (int, float)):
        return ""

    if unit == "vnd":
        rendered = f"{value:,.0f}"
        if language == "vi":
            rendered = rendered.replace(",", ".")
        return f"{rendered} VND"
    if unit == "percent":
        rendered = f"{value:.1f}"
        if language == "vi":
            rendered = rendered.replace(".", ",")
        return f"{rendered}%"
    if unit in {"count", "days"}:
        rendered = f"{value:,.0f}"
        return rendered.replace(",", ".") if language == "vi" else rendered

    rendered = f"{value:.2f}".rstrip("0").rstrip(".")
    return rendered.replace(".", ",") if language == "vi" else rendered


def _request_report(
    *,
    client: httpx.Client,
    provider: str,
    config: AIReportConfig,
    safe_payload: dict[str, Any],
    safety_subject: str,
    language: ReportLanguage,
) -> str:
    if provider == "gemini":
        return _request_gemini_report(
            client=client,
            config=config,
            safe_payload=safe_payload,
            language=language,
        )
    return _request_openai_report(
        client=client,
        config=config,
        safe_payload=safe_payload,
        safety_subject=safety_subject,
        language=language,
    )


def _request_gemini_report(
    *,
    client: httpx.Client,
    config: AIReportConfig,
    safe_payload: dict[str, Any],
    language: ReportLanguage,
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
            "system_instruction": build_system_prompt(language),
            "response_format": {
                "type": "text",
                "mime_type": "application/json",
                "schema": build_report_json_schema(
                    safe_payload,
                    restrict_metric_keys=False,
                ),
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
    language: ReportLanguage,
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
                {
                    "role": "system",
                    "content": build_system_prompt(language),
                },
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
                    "name": "marketlens_evidence_report_v2",
                    "schema": build_report_json_schema(safe_payload),
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
