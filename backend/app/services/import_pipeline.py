from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256
import re
import unicodedata
from typing import Any, Literal, Mapping

import numpy as np
import pandas as pd

from backend.app.core.errors import AppError
from backend.app.schemas.imports import (
    ImportCapabilities,
    ImportDetectionConfidence,
    ImportSourceType,
    StoredImportSourceType,
)
from backend.app.services.validator import REQUIRED_COLUMNS


IMPORT_SCHEMA_VERSION = 2
MAPPING_FIELDS = (
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
)
MINIMUM_MAPPING_FIELDS = (
    "order_id",
    "order_date",
    "product_name",
    "quantity",
    "order_status",
)
FINAL_STATUSES = {"completed", "cancelled", "returned"}
SKIP_STATUS = "skip"


@dataclass(frozen=True)
class ImportOptions:
    source_type: ImportSourceType = "auto"
    column_mapping: Mapping[str, str] | None = None
    status_mapping: Mapping[str, str] | None = None
    namespace: str | None = None
    expected_header_fingerprint: str | None = None


@dataclass(frozen=True)
class ImportPreview:
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

    def to_dict(self) -> dict[str, Any]:
        return {
            "requested_source_type": self.requested_source_type,
            "detected_source_type": self.detected_source_type,
            "detection_confidence": self.detection_confidence,
            "header_fingerprint": self.header_fingerprint,
            "headers": self.headers,
            "suggested_mapping": self.suggested_mapping,
            "missing_required_fields": self.missing_required_fields,
            "status_values": self.status_values,
            "unknown_status_values": self.unknown_status_values,
            "row_count": self.row_count,
            "capabilities": self.capabilities.model_dump(),
            "warnings": self.warnings,
            "ready_for_analysis": self.ready_for_analysis,
        }


@dataclass(frozen=True)
class NormalizedImport:
    frame: pd.DataFrame
    source_type: StoredImportSourceType
    header_fingerprint: str
    column_mapping: dict[str, str]
    capabilities: ImportCapabilities
    warnings: list[str]
    source_row_count: int
    skipped_row_count: int


GENERIC_ALIASES: dict[str, tuple[str, ...]] = {
    "order_id": (
        "order_id",
        "order id",
        "ma don hang",
        "mã đơn hàng",
        "ma don",
        "order number",
    ),
    "order_date": (
        "order_date",
        "order date",
        "created time",
        "ngay dat hang",
        "ngày đặt hàng",
        "thoi gian dat hang",
        "thời gian đặt hàng",
    ),
    "customer_id": (
        "customer_id",
        "customer id",
        "buyer username",
        "username buyer",
        "nguoi mua",
        "người mua",
        "ma khach hang",
        "mã khách hàng",
    ),
    "customer_name": (
        "customer_name",
        "customer name",
        "buyer username",
        "ten nguoi mua",
        "tên người mua",
        "ten khach hang",
        "tên khách hàng",
    ),
    "product_id": (
        "product_id",
        "product id",
        "sku id",
        "seller sku",
        "sku phan loai hang",
        "sku phân loại hàng",
        "ma sku",
        "mã sku",
        "ma san pham",
        "mã sản phẩm",
    ),
    "product_name": (
        "product_name",
        "product name",
        "ten san pham",
        "tên sản phẩm",
        "item name",
    ),
    "category": (
        "category",
        "product category",
        "danh muc",
        "danh mục",
        "nganh hang",
        "ngành hàng",
    ),
    "quantity": (
        "quantity",
        "qty",
        "so luong",
        "số lượng",
    ),
    "unit_price": (
        "unit_price",
        "unit price",
        "sku unit original price",
        "original price",
        "gia goc",
        "giá gốc",
        "don gia",
        "đơn giá",
    ),
    "discount": (
        "discount",
        "discount amount",
        "giam gia",
        "giảm giá",
    ),
    "line_revenue": (
        "line_revenue",
        "line revenue",
        "sku subtotal after discount",
        "product subtotal after discount",
        "tong gia ban san pham",
        "tổng giá bán sản phẩm",
        "thanh tien sau giam gia",
        "thành tiền sau giảm giá",
        "doanh thu",
    ),
    "order_status": (
        "order_status",
        "order status",
        "trang thai don hang",
        "trạng thái đơn hàng",
        "trang thai",
        "trạng thái",
    ),
}

TIKTOK_ALIASES = {
    **GENERIC_ALIASES,
    "order_id": ("Order ID",),
    "order_date": ("Created Time", "Paid Time"),
    "customer_id": ("Buyer Username",),
    "customer_name": ("Buyer Username",),
    "product_id": ("SKU ID", "Seller SKU", "Product ID"),
    "product_name": ("Product Name",),
    "category": ("Product Category",),
    "quantity": ("Quantity",),
    "unit_price": ("SKU Unit Original Price",),
    "line_revenue": ("SKU Subtotal After Discount",),
    "order_status": ("Order Status",),
}

SHOPEE_ALIASES = {
    **GENERIC_ALIASES,
    "order_id": ("Mã đơn hàng", "Order ID"),
    "order_date": (
        "Ngày đặt hàng",
        "Thời gian đặt hàng",
        "Order Creation Date",
        "Created Time",
    ),
    "customer_id": (
        "Người Mua",
        "Tên Người Mua",
        "Buyer Username",
        "Username (Buyer)",
    ),
    "customer_name": (
        "Người Mua",
        "Tên Người Mua",
        "Buyer Username",
        "Username (Buyer)",
    ),
    "product_id": (
        "SKU phân loại hàng",
        "SKU Phân loại",
        "Seller SKU",
        "Mã SKU",
        "Mã sản phẩm",
    ),
    "product_name": ("Tên sản phẩm", "Product Name", "Item Name"),
    "category": ("Ngành hàng", "Danh mục", "Product Category"),
    "quantity": ("Số lượng", "Quantity"),
    "unit_price": ("Giá gốc", "Original Price", "Unit Price"),
    "line_revenue": (
        "Tổng giá bán (sản phẩm)",
        "Tổng giá bán sản phẩm",
        "Product Subtotal",
        "Item Subtotal",
    ),
    "order_status": ("Trạng Thái Đơn Hàng", "Trạng thái đơn hàng", "Order Status"),
}

MARKETLENS_MAPPING = {
    field: field for field in REQUIRED_COLUMNS
}

_COMPLETED_STATUS_VALUES = frozenset({
    "completed",
    "complete",
    "order completed",
    "delivered",
    "delivery successful",
    "successfully delivered",
    "hoan thanh",
    "da hoan thanh",
    "da giao",
    "giao hang thanh cong",
})
_CANCELLED_STATUS_VALUES = frozenset({
    "cancelled",
    "canceled",
    "order cancelled",
    "order canceled",
    "da huy",
    "huy",
})
_RETURNED_STATUS_VALUES = frozenset({
    "returned",
    "refunded",
    "return completed",
    "refund completed",
    "return successful",
    "refund successful",
    "tra hang",
    "da tra hang",
    "tra hang thanh cong",
    "hoan tien",
    "da hoan tien",
    "hoan tien thanh cong",
})
_CONFIRMED_RETURN_DETAIL_VALUES = frozenset({
    "returned",
    "refunded",
    "return completed",
    "refund completed",
    "return successful",
    "refund successful",
    "tra hang thanh cong",
    "hoan tien thanh cong",
})
_NEGATIVE_RETURN_DETAIL_VALUES = frozenset({
    "no return",
    "no refund",
    "without return",
    "khong tra hang",
    "khong hoan tien",
    "none",
})
_PENDING_RETURN_DETAIL_VALUES = frozenset({
    "return requested",
    "refund requested",
    "return refund requested",
    "return pending",
    "refund pending",
    "return refund pending",
})
_SKIPPED_STATUS_VALUES = frozenset({
    "pending",
    "processing",
    "unpaid",
    "awaiting",
    "awaiting collection",
    "awaiting shipment",
    "awaiting payment",
    "ready to ship",
    "to ship",
    "shipped",
    "in transit",
    "cho xac nhan",
    "cho lay hang",
    "dang giao",
    "chua thanh toan",
    "return requested",
    "refund requested",
    "return pending",
    "refund pending",
    "pending cancellation",
    "cancellation requested",
})


def preview_sales_import(
    frame: pd.DataFrame,
    *,
    options: ImportOptions,
) -> ImportPreview:
    headers = [str(column).strip() for column in frame.columns]
    fingerprint = header_fingerprint(headers)
    detected, confidence = detect_source(headers)
    selected_source = _selected_source(options.source_type, detected)
    mapping = resolve_mapping(
        headers,
        source_type=selected_source,
        custom_mapping=options.column_mapping,
    )
    missing = missing_required_fields(mapping)
    all_status_values = _status_values(
        frame,
        mapping.get("order_status"),
        limit=None,
    )
    unknown_status_values = [
        value
        for value in all_status_values
        if _normalize_status_value(
            value,
            source_type=selected_source,
            provided_mapping=options.status_mapping,
        )
        == "unknown"
    ][:50]
    status_values = all_status_values[:50]
    capabilities = _capabilities(frame, mapping)
    warnings = _preview_warnings(
        options=options,
        selected_source=selected_source,
        detected=detected,
        fingerprint=fingerprint,
        capabilities=capabilities,
    )
    if len(all_status_values) > len(status_values):
        warnings.append("STATUS_VALUES_TRUNCATED")
    marketlens_columns_match = (
        selected_source != "marketlens"
        or _marketlens_columns_match(headers)
    )
    if not marketlens_columns_match:
        warnings.append("MARKETLENS_COLUMNS_MISMATCH")
    ready = (
        len(frame.index) > 0
        and selected_source is not None
        and not missing
        and not unknown_status_values
        and marketlens_columns_match
        and "PROFILE_HEADERS_CHANGED" not in warnings
    )
    return ImportPreview(
        requested_source_type=options.source_type,
        detected_source_type=selected_source,
        detection_confidence=confidence,
        header_fingerprint=fingerprint,
        headers=headers,
        suggested_mapping={
            field: mapping.get(field) for field in MAPPING_FIELDS
        },
        missing_required_fields=missing,
        status_values=status_values,
        unknown_status_values=unknown_status_values,
        row_count=len(frame.index),
        capabilities=capabilities,
        warnings=warnings,
        ready_for_analysis=ready,
    )


def normalize_sales_import(
    frame: pd.DataFrame,
    *,
    options: ImportOptions,
) -> NormalizedImport:
    preview = preview_sales_import(frame, options=options)
    if preview.row_count == 0:
        raise AppError(
            code="EMPTY_FILE",
            message="The file does not contain any data rows.",
            status_code=400,
        )
    if "PROFILE_HEADERS_CHANGED" in preview.warnings:
        raise AppError(
            code="IMPORT_PROFILE_HEADERS_CHANGED",
            message=(
                "The file columns changed after this import profile was saved."
            ),
            status_code=400,
            details={
                "header_fingerprint": preview.header_fingerprint,
                "suggested_mapping": preview.suggested_mapping,
            },
        )
    if "MARKETLENS_COLUMNS_MISMATCH" in preview.warnings:
        raise AppError(
            code="INVALID_FILE_COLUMNS",
            message="The columns do not match the MarketLens template.",
            status_code=400,
            details={
                "required": REQUIRED_COLUMNS,
                "actual": preview.headers,
            },
        )
    source_type = preview.detected_source_type
    if source_type is None:
        raise AppError(
            code="IMPORT_SOURCE_NOT_DETECTED",
            message="Choose the file source or map the required columns.",
            status_code=400,
            details={
                "headers": preview.headers,
                "suggested_mapping": preview.suggested_mapping,
            },
        )
    if preview.missing_required_fields:
        raise AppError(
            code="IMPORT_MAPPING_INCOMPLETE",
            message="The file is missing required import mappings.",
            status_code=400,
            details={
                "missing_required_fields": preview.missing_required_fields,
                "suggested_mapping": preview.suggested_mapping,
            },
        )
    if preview.unknown_status_values:
        raise AppError(
            code="UNMAPPED_STATUS_VALUES",
            message="Some order statuses need to be mapped before analysis.",
            status_code=400,
            details={"values": preview.unknown_status_values},
        )

    mapping = {
        field: column
        for field, column in preview.suggested_mapping.items()
        if column is not None
    }
    normalized = pd.DataFrame(index=frame.index)
    for field, column in mapping.items():
        normalized[field] = frame[column]

    normalized["order_id"] = _string_series(normalized["order_id"])
    normalized["product_name"] = _string_series(normalized["product_name"])
    normalized["quantity"] = _numeric_series(normalized["quantity"])
    normalized["order_date"] = _date_series(
        normalized["order_date"],
        dayfirst=source_type in {"shopee", "tiktok", "custom"},
    )

    has_customer_ids = "customer_id" in normalized.columns
    if has_customer_ids:
        normalized["customer_id"] = _string_series(
            normalized["customer_id"]
        )
        has_customer_ids = bool(normalized["customer_id"].ne("").all())
    if not has_customer_ids:
        normalized["customer_id"] = normalized["order_id"].map(
            lambda value: f"anonymous-order:{value}"
        )

    if "customer_name" in normalized.columns:
        normalized["customer_name"] = _string_series(
            normalized["customer_name"]
        )
        normalized["customer_name"] = normalized["customer_name"].where(
            normalized["customer_name"].ne(""),
            normalized["customer_id"],
        )
    else:
        normalized["customer_name"] = normalized["customer_id"]

    if "product_id" in normalized.columns:
        normalized["product_id"] = _string_series(normalized["product_id"])
    else:
        normalized["product_id"] = ""
    missing_product_ids = normalized["product_id"].eq("")
    normalized.loc[missing_product_ids, "product_id"] = normalized.loc[
        missing_product_ids,
        "product_name",
    ].map(_generated_product_id)

    if "category" in normalized.columns:
        normalized["category"] = _string_series(normalized["category"])
        normalized["category"] = normalized["category"].replace(
            "",
            "Chưa phân loại",
        )
    else:
        normalized["category"] = "Chưa phân loại"

    direct_revenue = (
        _numeric_series(normalized["line_revenue"])
        if "line_revenue" in normalized.columns
        else None
    )
    unit_price = (
        _numeric_series(normalized["unit_price"])
        if "unit_price" in normalized.columns
        else None
    )
    source_discount = (
        _numeric_series(normalized["discount"])
        if "discount" in normalized.columns
        else None
    )
    if direct_revenue is not None:
        derived_unit_price = direct_revenue.div(
            normalized["quantity"].replace(0, np.nan)
        )
        if unit_price is None:
            unit_price = derived_unit_price
        gross = normalized["quantity"] * unit_price
        discount = gross - direct_revenue
        invalid_discount = discount < 0
        unit_price = unit_price.where(~invalid_discount, derived_unit_price)
        discount = discount.where(~invalid_discount, 0)
    else:
        if unit_price is None:
            raise AppError(
                code="IMPORT_MAPPING_INCOMPLETE",
                message="Map line revenue or unit price before analysis.",
                status_code=400,
                details={"missing_required_fields": ["line_revenue_or_unit_price"]},
            )
        discount = (
            source_discount
            if source_discount is not None
            else pd.Series(0, index=normalized.index, dtype=float)
        )
    normalized["unit_price"] = unit_price
    normalized["discount"] = discount

    return_type_column = _find_header(
        list(frame.columns),
        (
            "Cancellation/Return Type",
            "Trạng thái Trả hàng/Hoàn tiền",
            "Return/Refund Status",
        ),
    )
    returned_quantity_column = _find_header(
        list(frame.columns),
        ("Sku Quantity of return", "Returned quantity", "Số lượng trả"),
    )
    status_results = []
    for index, raw_status in normalized["order_status"].items():
        return_type = (
            frame.at[index, return_type_column]
            if return_type_column is not None
            else None
        )
        returned_quantity = (
            frame.at[index, returned_quantity_column]
            if returned_quantity_column is not None
            else None
        )
        status_results.append(
            _normalize_status_value(
                raw_status,
                source_type=source_type,
                provided_mapping=options.status_mapping,
                return_type=return_type,
                returned_quantity=returned_quantity,
            )
        )
    normalized["order_status"] = status_results
    unknown_values = sorted(
        {
            str(frame.at[index, mapping["order_status"]]).strip()
            for index in normalized.index[
                normalized["order_status"].eq("unknown")
            ]
        }
    )
    if unknown_values:
        raise AppError(
            code="UNMAPPED_STATUS_VALUES",
            message="Some order statuses need to be mapped before analysis.",
            status_code=400,
            details={"values": unknown_values},
        )

    skipped_mask = normalized["order_status"].eq(SKIP_STATUS)
    skipped_row_count = int(skipped_mask.sum())
    normalized = normalized.loc[~skipped_mask].copy()
    if normalized.empty:
        raise AppError(
            code="NO_FINAL_ORDERS",
            message="The file has no completed, cancelled, or returned orders.",
            status_code=400,
        )

    if source_type == "tiktok":
        variation_column = _find_header(list(frame.columns), ("Variation",))
        if variation_column is not None:
            variations = _string_series(frame.loc[normalized.index, variation_column])
            normalized["product_name"] = normalized["product_name"].where(
                variations.eq(""),
                normalized["product_name"] + " - " + variations,
            )

    namespace = _namespace(options.namespace, source_type)
    if namespace:
        for field in ("order_id", "product_id", "customer_id"):
            normalized[field] = namespace + ":" + normalized[field].astype(str)

    normalized = normalized[list(REQUIRED_COLUMNS)].reset_index(drop=True)
    capabilities = preview.capabilities.model_copy(
        update={"customer_analytics": has_customer_ids}
    )
    warnings = list(preview.warnings)
    if skipped_row_count:
        warnings.append("NON_FINAL_ORDERS_SKIPPED")
    if not has_customer_ids:
        warnings.append("CUSTOMER_ANALYTICS_UNAVAILABLE")
    return NormalizedImport(
        frame=normalized,
        source_type=source_type,
        header_fingerprint=preview.header_fingerprint,
        column_mapping=mapping,
        capabilities=capabilities,
        warnings=list(dict.fromkeys(warnings)),
        source_row_count=len(frame.index),
        skipped_row_count=skipped_row_count,
    )


def detect_source(
    headers: list[str],
) -> tuple[
    StoredImportSourceType | None,
    ImportDetectionConfidence,
]:
    normalized = {_header_key(header) for header in headers}
    marketlens = {_header_key(field) for field in REQUIRED_COLUMNS}
    if normalized == marketlens:
        return "marketlens", "exact"

    tiktok_signature = {
        _header_key("Order ID"),
        _header_key("Order Status"),
        _header_key("Product Name"),
        _header_key("Quantity"),
        _header_key("SKU Subtotal After Discount"),
    }
    if tiktok_signature.issubset(normalized):
        return "tiktok", "exact"

    shopee_core = {
        _header_key("Mã đơn hàng"),
        _header_key("Tên sản phẩm"),
        _header_key("Số lượng"),
    }
    shopee_specific = {
        _header_key("Tổng giá bán (sản phẩm)"),
        _header_key("SKU phân loại hàng"),
        _header_key("Người Mua"),
        _header_key("Trạng Thái Đơn Hàng"),
    }
    if shopee_core.issubset(normalized) and len(
        normalized & shopee_specific
    ) >= 2:
        return "shopee", "exact"

    generic_mapping = _mapping_from_aliases(headers, GENERIC_ALIASES)
    if not missing_required_fields(generic_mapping):
        return "custom", "suggested"
    return None, "unknown"


def resolve_mapping(
    headers: list[str],
    *,
    source_type: StoredImportSourceType | None,
    custom_mapping: Mapping[str, str] | None,
) -> dict[str, str]:
    if custom_mapping:
        return _validated_custom_mapping(headers, custom_mapping)
    if source_type == "marketlens":
        return {
            field: _find_header(headers, (column,))
            for field, column in MARKETLENS_MAPPING.items()
            if _find_header(headers, (column,)) is not None
        }
    if source_type == "tiktok":
        return _mapping_from_aliases(headers, TIKTOK_ALIASES)
    if source_type == "shopee":
        return _mapping_from_aliases(headers, SHOPEE_ALIASES)
    return _mapping_from_aliases(headers, GENERIC_ALIASES)


def missing_required_fields(mapping: Mapping[str, str]) -> list[str]:
    missing = [
        field for field in MINIMUM_MAPPING_FIELDS if not mapping.get(field)
    ]
    if not mapping.get("line_revenue") and not mapping.get("unit_price"):
        missing.append("line_revenue_or_unit_price")
    return missing


def header_fingerprint(headers: list[str]) -> str:
    canonical = "\n".join(sorted(_header_key(header) for header in headers))
    return sha256(canonical.encode("utf-8")).hexdigest()


def _selected_source(
    requested: ImportSourceType,
    detected: StoredImportSourceType | None,
) -> StoredImportSourceType | None:
    if requested == "auto":
        return detected
    return requested


def _mapping_from_aliases(
    headers: list[str],
    aliases: Mapping[str, tuple[str, ...]],
) -> dict[str, str]:
    mapping: dict[str, str] = {}
    for field in MAPPING_FIELDS:
        column = _find_header(headers, aliases.get(field, ()))
        if column is not None:
            mapping[field] = column
    return mapping


def _validated_custom_mapping(
    headers: list[str],
    mapping: Mapping[str, str],
) -> dict[str, str]:
    invalid_fields = sorted(set(mapping) - set(MAPPING_FIELDS))
    if invalid_fields:
        raise AppError(
            code="INVALID_IMPORT_MAPPING",
            message="The import mapping contains unsupported fields.",
            status_code=400,
            details={"invalid_fields": invalid_fields},
        )
    actual_headers = {str(header): str(header) for header in headers}
    normalized_headers = {_header_key(header): header for header in headers}
    result: dict[str, str] = {}
    missing_columns: list[str] = []
    for field, raw_column in mapping.items():
        column = str(raw_column).strip()
        if not column:
            continue
        resolved = actual_headers.get(column) or normalized_headers.get(
            _header_key(column)
        )
        if resolved is None:
            missing_columns.append(column)
        else:
            result[field] = resolved
    if missing_columns:
        raise AppError(
            code="INVALID_IMPORT_MAPPING",
            message="Some mapped columns do not exist in the file.",
            status_code=400,
            details={"missing_columns": sorted(set(missing_columns))},
        )
    return result


def _find_header(
    headers: list[Any],
    aliases: tuple[str, ...],
) -> str | None:
    lookup = {_header_key(header): str(header).strip() for header in headers}
    for alias in aliases:
        match = lookup.get(_header_key(alias))
        if match is not None:
            return match
    return None


def _header_key(value: Any) -> str:
    text = str(value).strip().lower().replace("đ", "d")
    text = unicodedata.normalize("NFKD", text)
    text = "".join(character for character in text if not unicodedata.combining(character))
    return re.sub(r"[^a-z0-9]+", " ", text).strip()


def _status_key(value: Any) -> str:
    return _header_key(value)


def _status_values(
    frame: pd.DataFrame,
    status_column: str | None,
    *,
    limit: int | None = 50,
) -> list[str]:
    if status_column is None:
        return []
    values = (
        frame[status_column]
        .dropna()
        .astype(str)
        .str.strip()
    )
    unique_values = sorted(
        value for value in values.unique().tolist() if value
    )
    return unique_values if limit is None else unique_values[:limit]


def _normalize_status_value(
    raw_status: Any,
    *,
    source_type: StoredImportSourceType | None,
    provided_mapping: Mapping[str, str] | None,
    return_type: Any = None,
    returned_quantity: Any = None,
) -> Literal["completed", "cancelled", "returned", "skip", "unknown"]:
    raw_text = str(raw_status).strip()
    status_key = _status_key(raw_text)
    if provided_mapping:
        target = next(
            (
                mapped_status
                for source_status, mapped_status in provided_mapping.items()
                if source_status == raw_text
                or _status_key(source_status) == status_key
            ),
            None,
        )
        if target in FINAL_STATUSES | {SKIP_STATUS}:
            return target  # type: ignore[return-value]

    if source_type == "marketlens":
        if status_key in FINAL_STATUSES:
            return status_key  # type: ignore[return-value]
        return "unknown"

    return_key = _status_key(return_type) if return_type is not None else ""
    returned_number = _numeric_value(returned_quantity)
    confirmed_return_detail = bool(
        return_key
        and return_key not in _NEGATIVE_RETURN_DETAIL_VALUES
        and return_key in _CONFIRMED_RETURN_DETAIL_VALUES
    )
    if return_key in _PENDING_RETURN_DETAIL_VALUES:
        return "skip"
    if (
        (returned_number is not None and returned_number > 0)
        or confirmed_return_detail
        or status_key in _RETURNED_STATUS_VALUES
    ):
        return "returned"
    if status_key in _CANCELLED_STATUS_VALUES:
        return "cancelled"
    if status_key in _COMPLETED_STATUS_VALUES:
        return "completed"
    if status_key in _SKIPPED_STATUS_VALUES:
        return "skip"
    return "unknown"


def _marketlens_columns_match(headers: list[str]) -> bool:
    return (
        {_header_key(header) for header in headers}
        == {_header_key(column) for column in REQUIRED_COLUMNS}
        and len(headers) == len(REQUIRED_COLUMNS)
    )


def _numeric_series(series: pd.Series) -> pd.Series:
    return series.map(_numeric_value)


def _numeric_value(value: Any) -> float | None:
    if value is None or pd.isna(value):
        return None
    if isinstance(value, (int, float, np.integer, np.floating)):
        numeric = float(value)
        return numeric if np.isfinite(numeric) else None
    text = str(value).strip()
    if not text:
        return None
    negative = text.startswith("(") and text.endswith(")")
    cleaned = re.sub(r"[^0-9,.\-]", "", text)
    if not cleaned:
        return None
    if re.fullmatch(r"-?\d{1,3}([.,]\d{3})+", cleaned):
        cleaned = cleaned.replace(",", "").replace(".", "")
    elif "," in cleaned and "." in cleaned:
        last_comma = cleaned.rfind(",")
        last_dot = cleaned.rfind(".")
        decimal_separator = "," if last_comma > last_dot else "."
        thousands_separator = "." if decimal_separator == "," else ","
        cleaned = cleaned.replace(thousands_separator, "")
        cleaned = cleaned.replace(decimal_separator, ".")
    elif "," in cleaned:
        parts = cleaned.split(",")
        cleaned = (
            "".join(parts)
            if all(len(part) == 3 for part in parts[1:])
            else cleaned.replace(",", ".")
        )
    try:
        numeric = float(cleaned)
    except ValueError:
        return None
    if negative:
        numeric = -abs(numeric)
    return numeric if np.isfinite(numeric) else None


def _date_series(series: pd.Series, *, dayfirst: bool) -> pd.Series:
    parsed = pd.to_datetime(
        series,
        errors="coerce",
        format="mixed",
        dayfirst=dayfirst,
    )
    return parsed.dt.strftime("%Y-%m-%d").where(parsed.notna(), "")


def _string_series(series: pd.Series) -> pd.Series:
    return series.fillna("").astype(str).str.strip()


def _generated_product_id(product_name: str) -> str:
    digest = sha256(product_name.casefold().encode("utf-8")).hexdigest()[:12]
    return f"generated-{digest}"


def _namespace(
    configured_namespace: str | None,
    source_type: StoredImportSourceType,
) -> str:
    if source_type == "marketlens" and not configured_namespace:
        return ""
    raw = configured_namespace or source_type
    safe = re.sub(r"[^a-zA-Z0-9:_-]+", "-", raw.strip()).strip("-")
    return safe[:80] or source_type


def _capabilities(
    frame: pd.DataFrame,
    mapping: Mapping[str, str],
) -> ImportCapabilities:
    customer_column = mapping.get("customer_id")
    customer_available = bool(
        customer_column
        and frame[customer_column].notna().all()
        and frame[customer_column].astype(str).str.strip().ne("").all()
    )
    category_column = mapping.get("category")
    category_available = bool(
        category_column
        and frame[category_column].notna().any()
        and frame[category_column].astype(str).str.strip().ne("").any()
    )
    discount_available = bool(
        mapping.get("discount")
        or (
            mapping.get("line_revenue")
            and mapping.get("unit_price")
        )
    )
    return ImportCapabilities(
        sales_analytics=True,
        product_analytics=bool(
            mapping.get("product_name") and mapping.get("quantity")
        ),
        customer_analytics=customer_available,
        category_analytics=category_available,
        discount_analytics=discount_available,
        cancellation_return_analysis=bool(mapping.get("order_status")),
    )


def _preview_warnings(
    *,
    options: ImportOptions,
    selected_source: StoredImportSourceType | None,
    detected: StoredImportSourceType | None,
    fingerprint: str,
    capabilities: ImportCapabilities,
) -> list[str]:
    warnings: list[str] = []
    if options.source_type != "auto" and detected not in {None, selected_source}:
        warnings.append("SOURCE_SELECTION_DIFFERS_FROM_DETECTION")
    if (
        options.expected_header_fingerprint
        and options.expected_header_fingerprint != fingerprint
    ):
        warnings.append("PROFILE_HEADERS_CHANGED")
    if not capabilities.customer_analytics:
        warnings.append("CUSTOMER_ANALYTICS_UNAVAILABLE")
    if not capabilities.category_analytics:
        warnings.append("CATEGORY_DEFAULTED")
    if not capabilities.discount_analytics:
        warnings.append("DISCOUNT_BREAKDOWN_UNAVAILABLE")
    return warnings
