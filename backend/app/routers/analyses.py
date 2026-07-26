from datetime import date
from typing import Annotated, Any, Literal
from uuid import UUID

import pandas as pd
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    Query,
    Response,
    UploadFile,
    status,
)

from backend.app.core.auth import AuthenticatedUser, get_current_user
from backend.app.core.config import Settings, get_settings
from backend.app.core.errors import AppError
from backend.app.repositories.analyses_repository import (
    AnalysesRepository,
    get_analyses_repository,
)
from backend.app.repositories.import_profiles_repository import (
    ImportProfilesRepository,
    get_import_profiles_repository,
)
from backend.app.routers.imports import import_options_from_request
from backend.app.schemas.analysis import (
    AIReportGenerationResponse,
    AIReportWarning,
    AnalysisDetailResponse,
    AnalysisListResponse,
)
from backend.app.schemas.imports import ImportSourceType
from backend.app.services.ai_report import (
    AIReportConfig,
    generate_ai_report,
)
from backend.app.services.analytics import calculate_analytics
from backend.app.services.combined_analysis import (
    CombinedSalesData,
    ValidatedSource,
    combine_validated_sales_data,
)
from backend.app.services.file_reader import read_sales_file, sanitize_file_name
from backend.app.services.forecast import calculate_forecast
from backend.app.services.import_pipeline import (
    normalize_sales_import,
)
from backend.app.services.report import build_rule_based_report
from backend.app.services.validator import (
    validate_analysis_period,
    validate_sales_data,
)


router = APIRouter(prefix="/analyses", tags=["analyses"])

AI_WARNING_MESSAGES = {
    "AI_DISABLED": (
        "AI Report is disabled. A rule-based report was returned."
    ),
    "AI_NOT_CONFIGURED": (
        "AI Report is not configured. A fallback report was returned."
    ),
    "AI_PROVIDER_UNSUPPORTED": (
        "The AI provider is not supported. A fallback report was returned."
    ),
    "AI_TIMEOUT": (
        "The AI provider timed out. A fallback report was returned."
    ),
    "AI_INVALID_RESPONSE": (
        "The AI provider returned invalid content. A fallback report was returned."
    ),
    "AI_PROVIDER_ERROR": (
        "The AI provider could not be reached. A fallback report was returned."
    ),
    "AI_RATE_LIMITED": (
        "The AI provider is temporarily rate-limited. A fallback report was "
        "returned; you can try again later."
    ),
}


@router.post(
    "",
    response_model=AnalysisDetailResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_analysis(
    file: Annotated[UploadFile, File(...)],
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    repository: Annotated[
        AnalysesRepository,
        Depends(get_analyses_repository),
    ],
    settings: Annotated[Settings, Depends(get_settings)],
    import_profiles_repository: Annotated[
        ImportProfilesRepository,
        Depends(get_import_profiles_repository),
    ],
    source_type: Annotated[ImportSourceType, Form()] = "auto",
    import_profile_id: Annotated[UUID | None, Form()] = None,
    column_mapping: Annotated[str | None, Form()] = None,
    status_mapping: Annotated[str | None, Form()] = None,
) -> AnalysisDetailResponse:
    max_bytes = settings.max_upload_mb * 1024 * 1024
    content = file.file.read(max_bytes + 1)
    if len(content) > max_bytes:
        raise AppError(
            code="FILE_TOO_LARGE",
            message=f"The file exceeds the {settings.max_upload_mb} MB limit.",
            status_code=400,
            details={"max_upload_mb": settings.max_upload_mb},
        )

    file_name = sanitize_file_name(file.filename)

    try:
        profile = _get_import_profile(
            repository=import_profiles_repository,
            profile_id=import_profile_id,
            user_id=current_user.id,
        )
        import_options = import_options_from_request(
            source_type=source_type,
            column_mapping=column_mapping,
            status_mapping=status_mapping,
            profile=profile,
        )
        raw_frame = read_sales_file(file_name=file_name, content=content)
        if len(raw_frame.index) > settings.max_upload_rows:
            raise AppError(
                code="TOO_MANY_ROWS",
                message=(
                    f"The file exceeds the {settings.max_upload_rows:,}-row "
                    "limit."
                ),
                status_code=400,
                details={
                    "max_rows": settings.max_upload_rows,
                    "actual_rows": len(raw_frame.index),
                },
            )
        imported = normalize_sales_import(
            raw_frame,
            options=import_options,
        )
        validated_frame = validate_sales_data(
            imported.frame,
            max_rows=settings.max_upload_rows,
            max_period_days=settings.max_analysis_period_days,
        )
        return _calculate_persist_and_respond(
            current_user=current_user,
            repository=repository,
            file_name=file_name,
            validated_frame=validated_frame,
            upload_metadata={
                "mode": "single",
                "file_count": 1,
                "source_files": [
                    {
                        "file_name": file_name,
                        "row_count": len(validated_frame),
                        "source_type": imported.source_type,
                        "source_row_count": imported.source_row_count,
                        "skipped_row_count": imported.skipped_row_count,
                    }
                ],
                "source_row_count": imported.source_row_count,
                "effective_row_count": len(validated_frame),
                "duplicate_order_count": 0,
                "duplicate_row_count": 0,
                "source_type": imported.source_type,
                "import_profile_id": (
                    str(import_profile_id) if import_profile_id else None
                ),
                "header_fingerprint": imported.header_fingerprint,
                "skipped_row_count": imported.skipped_row_count,
                "capabilities": imported.capabilities.model_dump(),
            },
            additional_warnings=imported.warnings,
        )
    except AppError:
        raise
    except Exception as error:
        raise AppError(
            code="ANALYSIS_PROCESSING_FAILED",
            message="The data file cannot be processed right now.",
            status_code=500,
        ) from error



@router.post(
    "/combined",
    response_model=AnalysisDetailResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_combined_analysis(
    files: Annotated[list[UploadFile], File(...)],
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    repository: Annotated[
        AnalysesRepository,
        Depends(get_analyses_repository),
    ],
    settings: Annotated[Settings, Depends(get_settings)],
    import_profiles_repository: Annotated[
        ImportProfilesRepository,
        Depends(get_import_profiles_repository),
    ],
    source_type: Annotated[ImportSourceType, Form()] = "auto",
    import_profile_id: Annotated[UUID | None, Form()] = None,
    column_mapping: Annotated[str | None, Form()] = None,
    status_mapping: Annotated[str | None, Form()] = None,
) -> AnalysisDetailResponse:
    if len(files) < 2:
        raise AppError(
            code="NOT_ENOUGH_FILES",
            message="Select at least two files for a combined analysis.",
            status_code=400,
            details={"minimum_files": 2},
        )
    if len(files) > settings.max_upload_files:
        raise AppError(
            code="TOO_MANY_FILES",
            message=(
                f"Select no more than {settings.max_upload_files} files "
                "for one combined analysis."
            ),
            status_code=400,
            details={"max_files": settings.max_upload_files},
        )

    file_names = [sanitize_file_name(file.filename) for file in files]
    duplicate_names = sorted(
        {
            file_name
            for file_name in file_names
            if sum(
                candidate.casefold() == file_name.casefold()
                for candidate in file_names
            )
            > 1
        }
    )
    if duplicate_names:
        raise AppError(
            code="DUPLICATE_FILE_NAMES",
            message="Each selected file must have a unique file name.",
            status_code=400,
            details={"duplicate_file_names": duplicate_names},
        )

    max_bytes = settings.max_upload_mb * 1024 * 1024
    total_bytes = 0
    sources: list[ValidatedSource] = []
    source_row_count = 0
    try:
        profile = _get_import_profile(
            repository=import_profiles_repository,
            profile_id=import_profile_id,
            user_id=current_user.id,
        )
        import_options = import_options_from_request(
            source_type=source_type,
            column_mapping=column_mapping,
            status_mapping=status_mapping,
            profile=profile,
        )
        uploaded_contents: list[tuple[str, bytes]] = []
        for upload_file, file_name in zip(files, file_names, strict=True):
            remaining_bytes = max_bytes - total_bytes
            content = upload_file.file.read(remaining_bytes + 1)
            total_bytes += len(content)
            if total_bytes > max_bytes:
                raise AppError(
                    code="FILE_TOO_LARGE",
                    message=(
                        "The selected files exceed the combined "
                        f"{settings.max_upload_mb} MB limit."
                    ),
                    status_code=400,
                    details={
                        "max_upload_mb": settings.max_upload_mb,
                        "file_count": len(files),
                    },
                )
            uploaded_contents.append((file_name, content))

        import_warnings: list[str] = []
        for file_name, content in uploaded_contents:
            try:
                raw_frame = read_sales_file(
                    file_name=file_name,
                    content=content,
                )
                source_row_count += len(raw_frame.index)
                if source_row_count > settings.max_upload_rows:
                    raise AppError(
                        code="TOO_MANY_ROWS",
                        message=(
                            "The selected files exceed the combined "
                            f"{settings.max_upload_rows:,}-row limit."
                        ),
                        status_code=400,
                        details={
                            "max_rows": settings.max_upload_rows,
                            "actual_rows": source_row_count,
                            "file_count": len(files),
                            "file_name": file_name,
                        },
                    )
                imported = normalize_sales_import(
                    raw_frame,
                    options=import_options,
                )
                validated_frame = validate_sales_data(
                    imported.frame,
                    max_rows=settings.max_upload_rows,
                    max_period_days=settings.max_analysis_period_days,
                )
            except AppError as error:
                raise _add_file_error_context(error, file_name) from error
            sources.append(
                ValidatedSource(
                    file_name=file_name,
                    frame=validated_frame,
                    source_type=imported.source_type,
                    source_row_count=imported.source_row_count,
                    skipped_row_count=imported.skipped_row_count,
                    header_fingerprint=imported.header_fingerprint,
                    capabilities=imported.capabilities,
                )
            )
            import_warnings.extend(imported.warnings)

        combined = combine_validated_sales_data(
            sources,
            max_rows=settings.max_upload_rows,
        )
        validate_analysis_period(
            combined.frame,
            max_period_days=settings.max_analysis_period_days,
        )
        return _calculate_persist_and_respond(
            current_user=current_user,
            repository=repository,
            file_name=_combined_display_name(file_names),
            validated_frame=combined.frame,
            upload_metadata=_combined_upload_metadata(
                combined,
                import_profile_id=import_profile_id,
            ),
            additional_warnings=[
                *combined.warnings,
                *import_warnings,
            ],
        )
    except AppError:
        raise
    except Exception as error:
        raise AppError(
            code="ANALYSIS_PROCESSING_FAILED",
            message="The selected data files cannot be processed right now.",
            status_code=500,
        ) from error


@router.get("", response_model=AnalysisListResponse)
def list_analyses(
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
def get_analysis(
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
def generate_analysis_ai_report(
    analysis_id: UUID,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    repository: Annotated[
        AnalysesRepository,
        Depends(get_analyses_repository),
    ],
    settings: Annotated[Settings, Depends(get_settings)],
    language: Annotated[Literal["en", "vi"], Query()] = "en",
) -> AIReportGenerationResponse:
    record = repository.get_analysis_for_user(
        analysis_id=str(analysis_id),
        user_id=current_user.id,
    )
    if record is None:
        raise _not_found()

    result_json = record.get("result_json") or {}
    fallback_report = build_rule_based_report(result_json, language)
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
        language=language,
    )

    updated = repository.update_analysis_report_for_user(
        analysis_id=str(analysis_id),
        user_id=current_user.id,
        report=generation.report,
        language=language,
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
        language=language,
        warning=warning,
    )


@router.delete(
    "/{analysis_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_analysis(
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


def _calculate_persist_and_respond(
    *,
    current_user: AuthenticatedUser,
    repository: AnalysesRepository,
    file_name: str,
    validated_frame: pd.DataFrame,
    upload_metadata: dict[str, Any],
    additional_warnings: list[str] | None = None,
) -> AnalysisDetailResponse:
    capabilities = upload_metadata.get("capabilities") or {}
    analytics = calculate_analytics(
        validated_frame,
        customer_data_available=bool(
            capabilities.get("customer_analytics", True)
        ),
    )
    forecast, forecast_warnings = calculate_forecast(
        analytics["revenue_by_date"]
    )
    warnings = list(
        dict.fromkeys(
            [
                *analytics["warnings"],
                *forecast_warnings,
                *(additional_warnings or []),
            ]
        )
    )
    report_input = {
        **analytics,
        "forecast": forecast,
        "upload": upload_metadata,
        "warnings": warnings,
    }
    reports = {
        "en": build_rule_based_report(report_input, "en"),
        "vi": build_rule_based_report(report_input, "vi"),
    }
    result_json = {
        **report_input,
        "report": reports["en"],
        "reports": reports,
    }
    record = repository.create_analysis(
        user_id=current_user.id,
        file_name=file_name,
        upload_mode=upload_metadata["mode"],
        source_file_count=upload_metadata["file_count"],
        row_count=len(validated_frame),
        date_from=date.fromisoformat(result_json["period"]["from"]),
        date_to=date.fromisoformat(result_json["period"]["to"]),
        result_json=result_json,
    )
    return _detail_from_record(record)


def _add_file_error_context(error: AppError, file_name: str) -> AppError:
    details = (
        dict(error.details)
        if isinstance(error.details, dict)
        else {}
    )
    details["file_name"] = file_name
    row_errors = details.get("errors")
    if isinstance(row_errors, list):
        details["errors"] = [
            {**item, "file_name": file_name}
            if isinstance(item, dict)
            else item
            for item in row_errors
        ]
    return AppError(
        code=error.code,
        message=error.message,
        status_code=error.status_code,
        details=details,
    )


def _combined_display_name(file_names: list[str]) -> str:
    if len(file_names) == 2:
        candidate = f"{file_names[0]} + {file_names[1]}"
    else:
        candidate = f"{file_names[0]} + {len(file_names) - 1} more files"
    return candidate[:255]


def _combined_upload_metadata(
    combined: CombinedSalesData,
    *,
    import_profile_id: UUID | None = None,
) -> dict[str, Any]:
    return {
        "mode": "combined",
        "file_count": len(combined.source_files),
        "source_files": combined.source_files,
        "source_row_count": combined.source_row_count,
        "effective_row_count": len(combined.frame),
        "duplicate_order_count": combined.duplicate_order_count,
        "duplicate_row_count": combined.duplicate_row_count,
        "source_type": combined.source_type,
        "import_profile_id": (
            str(import_profile_id) if import_profile_id else None
        ),
        "header_fingerprint": combined.header_fingerprint,
        "skipped_row_count": combined.skipped_row_count,
        "capabilities": combined.capabilities.model_dump(),
    }


def _get_import_profile(
    *,
    repository: ImportProfilesRepository,
    profile_id: UUID | None,
    user_id: str,
) -> dict[str, Any] | None:
    if profile_id is None:
        return None
    profile = repository.get_profile_for_user(
        profile_id=str(profile_id),
        user_id=user_id,
    )
    if profile is None:
        raise AppError(
            code="IMPORT_PROFILE_NOT_FOUND",
            message="Import profile not found.",
            status_code=404,
        )
    return profile


def _detail_from_record(record: dict[str, Any]) -> AnalysisDetailResponse:
    result = record["result_json"]
    return AnalysisDetailResponse(
        contract_version=result["contract_version"],
        id=record["id"],
        file_name=record["file_name"],
        upload_mode=record.get("upload_mode", "single"),
        source_file_count=record.get("source_file_count", 1),
        status=record["status"],
        row_count=record["row_count"],
        created_at=record["created_at"],
        period=result["period"],
        summary=result["summary"],
        orders=result["orders"],
        revenue_by_date=result["revenue_by_date"],
        sales=result["sales"],
        customers=result["customers"],
        forecast=result["forecast"],
        report=result["report"],
        reports=result["reports"],
        upload=result["upload"],
        warnings=result["warnings"],
    )


def _not_found() -> AppError:
    return AppError(
        code="ANALYSIS_NOT_FOUND",
        message="Analysis not found.",
        status_code=404,
    )
