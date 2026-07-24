from datetime import date, datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AnalysisListItem(BaseModel):
    id: UUID
    file_name: str
    status: Literal["processing", "completed", "failed"]
    row_count: int
    date_from: date | None = None
    date_to: date | None = None
    created_at: datetime


class AnalysisListResponse(BaseModel):
    items: list[AnalysisListItem]
    limit: int
    offset: int


class AnalysisDetailResponse(BaseModel):
    id: UUID
    file_name: str
    status: Literal["processing", "completed", "failed"]
    row_count: int
    created_at: datetime
    period: dict[str, Any]
    summary: dict[str, Any]
    revenue_by_date: list[dict[str, Any]]
    sales: dict[str, Any]
    customers: dict[str, Any]
    forecast: dict[str, Any]
    report: dict[str, Any]
    warnings: list[str]


class ReportRecommendation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=3, max_length=120)
    description: str = Field(min_length=10, max_length=600)


class ReportContent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=3, max_length=160)
    summary: str = Field(min_length=20, max_length=1_200)
    highlights: list[str] = Field(min_length=1, max_length=3)
    trend_analysis: str = Field(min_length=10, max_length=1_000)
    recommendations: list[ReportRecommendation] = Field(
        min_length=1,
        max_length=3,
    )
    disclaimer: str = Field(min_length=10, max_length=500)


class AIReportWarning(BaseModel):
    code: str
    message: str


class AIReportGenerationResponse(BaseModel):
    analysis_id: UUID
    source: Literal["rule_based", "ai"]
    report: dict[str, Any]
    warning: AIReportWarning | None = None
