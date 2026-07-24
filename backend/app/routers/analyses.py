from datetime import date
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, File, Query, Response, UploadFile, status

from backend.app.core.auth import AuthenticatedUser, get_current_user
from backend.app.core.config import Settings, get_settings
from backend.app.core.errors import AppError
from backend.app.repositories.analyses_repository import (
    AnalysesRepository,
    get_analyses_repository,
)
from backend.app.schemas.analysis import (
    AIReportGenerationResponse,
    AIReportWarning,
    AnalysisDetailResponse,
    AnalysisListResponse,
)
from backend.app.services.ai_report import (
    AIReportConfig,
    generate_ai_report,
)
from backend.app.services.analytics import calculate_analytics
from backend.app.services.file_reader import read_sales_file, sanitize_file_name
from backend.app.services.forecast import calculate_forecast
from backend.app.services.report import build_rule_based_report
from backend.app.services.validator import validate_sales_data


router = APIRouter(prefix="/analyses", tags=["analyses"])

AI_WARNING_MESSAGES = {
    "AI_DISABLED": (
        "AI Report đang tắt. Hệ thống đã trả báo cáo theo quy tắc."
    ),
    "AI_NOT_CONFIGURED": (
        "AI Report chưa có model hoặc API key. Hệ thống đã dùng fallback."
    ),
    "AI_PROVIDER_UNSUPPORTED": (
        "AI provider chưa được hỗ trợ. Hệ thống đã dùng fallback."
    ),
    "AI_TIMEOUT": (
        "AI provider phản hồi quá thời gian. Hệ thống đã dùng fallback."
    ),
    "AI_INVALID_RESPONSE": (
        "AI provider trả nội dung không hợp lệ. Hệ thống đã dùng fallback."
    ),
    "AI_PROVIDER_ERROR": (
        "Không thể kết nối AI provider. Hệ thống đã dùng fallback."
    ),
    "AI_RATE_LIMITED": (
        "AI đã chạm giới hạn sử dụng tạm thời. Hệ thống đã dùng fallback; "
        "bạn có thể thử lại sau."
    ),
}


@router.post(
    "",
    response_model=AnalysisDetailResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_analysis(
    file: Annotated[UploadFile, File(...)],
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    repository: Annotated[
        AnalysesRepository,
        Depends(get_analyses_repository),
    ],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AnalysisDetailResponse:
    max_bytes = settings.max_upload_mb * 1024 * 1024
    content = await file.read(max_bytes + 1)
    if len(content) > max_bytes:
        raise AppError(
            code="FILE_TOO_LARGE",
            message=f"File vượt quá giới hạn {settings.max_upload_mb} MB.",
            status_code=400,
            details={"max_upload_mb": settings.max_upload_mb},
        )

    file_name = sanitize_file_name(file.filename)

    try:
        raw_frame = read_sales_file(file_name=file_name, content=content)
        validated_frame = validate_sales_data(
            raw_frame,
            max_rows=settings.max_upload_rows,
        )
        analytics = calculate_analytics(validated_frame)
        forecast, forecast_warnings = calculate_forecast(
            analytics["revenue_by_date"]
        )
        report = build_rule_based_report(analytics)

        result_json = {
            **analytics,
            "forecast": forecast,
            "report": report,
            "warnings": list(
                dict.fromkeys(
                    [*analytics["warnings"], *forecast_warnings]
                )
            ),
        }
        record = repository.create_analysis(
            user_id=current_user.id,
            file_name=file_name,
            row_count=len(validated_frame),
            date_from=date.fromisoformat(result_json["period"]["from"]),
            date_to=date.fromisoformat(result_json["period"]["to"]),
            result_json=result_json,
        )
    except AppError:
        raise
    except Exception as error:
        raise AppError(
            code="ANALYSIS_PROCESSING_FAILED",
            message="Không thể xử lý file dữ liệu lúc này.",
            status_code=500,
        ) from error

    return _detail_from_record(record)


@router.get("", response_model=AnalysisListResponse)
async def list_analyses(
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    repository: Annotated[
        AnalysesRepository,
        Depends(get_analyses_repository),
    ],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> AnalysisListResponse:
    items = repository.list_analyses_for_user(
        user_id=current_user.id,
        limit=limit,
        offset=offset,
    )
    return AnalysisListResponse(items=items, limit=limit, offset=offset)


@router.get("/{analysis_id}", response_model=AnalysisDetailResponse)
async def get_analysis(
    analysis_id: UUID,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    repository: Annotated[
        AnalysesRepository,
        Depends(get_analyses_repository),
    ],
) -> AnalysisDetailResponse:
    record = repository.get_analysis_for_user(
        analysis_id=str(analysis_id),
        user_id=current_user.id,
    )
    if record is None:
        raise _not_found()
    return _detail_from_record(record)


@router.post(
    "/{analysis_id}/ai-report",
    response_model=AIReportGenerationResponse,
)
async def generate_analysis_ai_report(
    analysis_id: UUID,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    repository: Annotated[
        AnalysesRepository,
        Depends(get_analyses_repository),
    ],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AIReportGenerationResponse:
    record = repository.get_analysis_for_user(
        analysis_id=str(analysis_id),
        user_id=current_user.id,
    )
    if record is None:
        raise _not_found()

    result_json = record.get("result_json") or {}
    fallback_report = build_rule_based_report(result_json)
    generation = generate_ai_report(
        analysis_result=result_json,
        fallback_report=fallback_report,
        config=AIReportConfig(
            enabled=settings.ai_report_enabled,
            provider=settings.ai_provider,
            model=settings.ai_model,
            api_base_url=settings.ai_api_base_url,
            api_key=settings.ai_api_key,
            timeout_seconds=settings.ai_timeout_seconds,
            max_output_tokens=settings.ai_max_output_tokens,
        ),
        safety_subject=current_user.id,
    )

    updated = repository.update_analysis_report_for_user(
        analysis_id=str(analysis_id),
        user_id=current_user.id,
        report=generation.report,
    )
    if updated is None:
        raise _not_found()

    warning = (
        AIReportWarning(
            code=generation.warning_code,
            message=AI_WARNING_MESSAGES[generation.warning_code],
        )
        if generation.warning_code
        else None
    )
    source = generation.report.get("source", "rule_based")
    return AIReportGenerationResponse(
        analysis_id=analysis_id,
        source=source,
        report=generation.report,
        warning=warning,
    )


@router.delete(
    "/{analysis_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_analysis(
    analysis_id: UUID,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    repository: Annotated[
        AnalysesRepository,
        Depends(get_analyses_repository),
    ],
) -> Response:
    deleted = repository.delete_analysis_for_user(
        analysis_id=str(analysis_id),
        user_id=current_user.id,
    )
    if not deleted:
        raise _not_found()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def _detail_from_record(record: dict[str, Any]) -> AnalysisDetailResponse:
    result = record.get("result_json") or {}
    return AnalysisDetailResponse(
        id=record["id"],
        file_name=record["file_name"],
        status=record["status"],
        row_count=record["row_count"],
        created_at=record["created_at"],
        period=result.get("period", {}),
        summary=result.get("summary", {}),
        revenue_by_date=result.get("revenue_by_date", []),
        sales=result.get("sales", {}),
        customers=result.get("customers", {}),
        forecast=result.get("forecast", {}),
        report=result.get("report", {}),
        warnings=result.get("warnings", []),
    )


def _not_found() -> AppError:
    return AppError(
        code="ANALYSIS_NOT_FOUND",
        message="Không tìm thấy lần phân tích.",
        status_code=404,
    )
