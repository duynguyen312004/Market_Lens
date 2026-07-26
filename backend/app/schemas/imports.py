from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)


ImportSourceType = Literal["auto", "marketlens", "shopee", "tiktok", "custom"]
StoredImportSourceType = Literal["marketlens", "shopee", "tiktok", "custom"]
ImportDetectionConfidence = Literal["exact", "suggested", "unknown"]
CanonicalStatus = Literal["completed", "cancelled", "returned", "skip"]
CanonicalImportField = Literal[
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
    "line_revenue",
    "order_status",
]
CUSTOM_REQUIRED_MAPPING_FIELDS = frozenset(
    {
        "order_id",
        "order_date",
        "product_name",
        "quantity",
        "order_status",
    }
)


class StrictImportModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ImportCapabilities(StrictImportModel):
    sales_analytics: bool
    product_analytics: bool
    customer_analytics: bool
    category_analytics: bool
    discount_analytics: bool
    cancellation_return_analysis: bool


class ImportPreviewResponse(StrictImportModel):
    requested_source_type: ImportSourceType
    detected_source_type: StoredImportSourceType | None
    detection_confidence: ImportDetectionConfidence
    header_fingerprint: str
    headers: list[str]
    suggested_mapping: dict[str, str | None]
    missing_required_fields: list[str]
    status_values: list[str]
    unknown_status_values: list[str]
    row_count: int
    capabilities: ImportCapabilities
    warnings: list[str]
    ready_for_analysis: bool


class ImportProfileBase(StrictImportModel):
    name: str = Field(min_length=1, max_length=100)
    source_type: StoredImportSourceType
    column_mapping: dict[CanonicalImportField, str] = Field(
        default_factory=dict
    )
    status_mapping: dict[str, CanonicalStatus] = Field(default_factory=dict)
    header_fingerprint: str = Field(
        min_length=64,
        max_length=64,
        pattern=r"^[0-9a-f]{64}$",
    )
    schema_version: int = Field(default=2, ge=2, le=2)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Profile name cannot be blank.")
        return normalized

class ImportProfileCreate(ImportProfileBase):
    @model_validator(mode="after")
    def validate_custom_mapping(self) -> "ImportProfileCreate":
        if self.source_type == "custom":
            _validate_complete_mapping(self.column_mapping)
        return self


class ImportProfileUpdate(StrictImportModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    source_type: StoredImportSourceType | None = None
    column_mapping: dict[CanonicalImportField, str] | None = None
    status_mapping: dict[str, CanonicalStatus] | None = None
    header_fingerprint: str | None = Field(
        default=None,
        min_length=64,
        max_length=64,
        pattern=r"^[0-9a-f]{64}$",
    )
    schema_version: int | None = Field(default=None, ge=2, le=2)

    @field_validator("name")
    @classmethod
    def normalize_optional_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        if not normalized:
            raise ValueError("Profile name cannot be blank.")
        return normalized

    @model_validator(mode="after")
    def validate_mapping_replacement(self) -> "ImportProfileUpdate":
        if self.source_type == "custom" and self.column_mapping is None:
            raise ValueError(
                "A custom profile requires a complete column mapping."
            )
        if self.column_mapping is not None:
            _validate_complete_mapping(self.column_mapping)
        return self


class ImportProfileResponse(ImportProfileBase):
    id: UUID
    created_at: datetime
    updated_at: datetime


class ImportProfileListResponse(StrictImportModel):
    items: list[ImportProfileResponse]


def _validate_complete_mapping(
    mapping: dict[CanonicalImportField, str],
) -> None:
    missing = sorted(
        field
        for field in CUSTOM_REQUIRED_MAPPING_FIELDS
        if not str(mapping.get(field, "")).strip()
    )
    if not str(mapping.get("line_revenue", "")).strip() and not str(
        mapping.get("unit_price", "")
    ).strip():
        missing.append("line_revenue_or_unit_price")
    if missing:
        raise ValueError(
            "A saved column mapping is incomplete: "
            + ", ".join(missing)
        )
