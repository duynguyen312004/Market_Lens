import json
from typing import Annotated, Any
from uuid import UUID

from fastapi import (
    APIRouter,
    Body,
    Depends,
    File,
    Form,
    Response,
    UploadFile,
    status,
)

from backend.app.core.auth import AuthenticatedUser, get_current_user
from backend.app.core.config import Settings, get_settings
from backend.app.core.errors import AppError
from backend.app.repositories.import_profiles_repository import (
    ImportProfilesRepository,
    get_import_profiles_repository,
)
from backend.app.schemas.imports import (
    ImportPreviewResponse,
    ImportProfileCreate,
    ImportProfileListResponse,
    ImportProfileResponse,
    ImportProfileUpdate,
    ImportSourceType,
)
from backend.app.services.file_reader import read_sales_file, sanitize_file_name
from backend.app.services.import_pipeline import (
    ImportOptions,
    preview_sales_import,
)


preview_router = APIRouter(prefix="/imports", tags=["imports"])
profiles_router = APIRouter(
    prefix="/import-profiles",
    tags=["import-profiles"],
)


@preview_router.post(
    "/preview",
    response_model=ImportPreviewResponse,
)
def preview_import(
    file: Annotated[UploadFile, File(...)],
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    repository: Annotated[
        ImportProfilesRepository,
        Depends(get_import_profiles_repository),
    ],
    settings: Annotated[Settings, Depends(get_settings)],
    source_type: Annotated[ImportSourceType, Form()] = "auto",
    import_profile_id: Annotated[UUID | None, Form()] = None,
    column_mapping: Annotated[str | None, Form()] = None,
    status_mapping: Annotated[str | None, Form()] = None,
) -> ImportPreviewResponse:
    profile = (
        repository.get_profile_for_user(
            profile_id=str(import_profile_id),
            user_id=current_user.id,
        )
        if import_profile_id
        else None
    )
    if import_profile_id and profile is None:
        raise _profile_not_found()
    options = import_options_from_request(
        source_type=source_type,
        column_mapping=column_mapping,
        status_mapping=status_mapping,
        profile=profile,
    )
    content = _read_limited_upload(file, settings)
    frame = read_sales_file(
        file_name=sanitize_file_name(file.filename),
        content=content,
    )
    if len(frame.index) > settings.max_upload_rows:
        raise AppError(
            code="TOO_MANY_ROWS",
            message=(
                f"The file exceeds the {settings.max_upload_rows:,}-row limit."
            ),
            status_code=400,
            details={
                "max_rows": settings.max_upload_rows,
                "actual_rows": len(frame.index),
            },
        )
    return ImportPreviewResponse.model_validate(
        preview_sales_import(frame, options=options).to_dict()
    )


@profiles_router.get("", response_model=ImportProfileListResponse)
def list_import_profiles(
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    repository: Annotated[
        ImportProfilesRepository,
        Depends(get_import_profiles_repository),
    ],
) -> ImportProfileListResponse:
    return ImportProfileListResponse(
        items=[
            ImportProfileResponse.model_validate(_public_profile(item))
            for item in repository.list_profiles_for_user(
                user_id=current_user.id
            )
        ]
    )


@profiles_router.post(
    "",
    response_model=ImportProfileResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_import_profile(
    payload: Annotated[ImportProfileCreate, Body()],
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    repository: Annotated[
        ImportProfilesRepository,
        Depends(get_import_profiles_repository),
    ],
) -> ImportProfileResponse:
    record = repository.create_profile(
        user_id=current_user.id,
        payload=payload.model_dump(mode="json"),
    )
    return ImportProfileResponse.model_validate(_public_profile(record))


@profiles_router.patch(
    "/{profile_id}",
    response_model=ImportProfileResponse,
)
def update_import_profile(
    profile_id: UUID,
    payload: ImportProfileUpdate,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    repository: Annotated[
        ImportProfilesRepository,
        Depends(get_import_profiles_repository),
    ],
) -> ImportProfileResponse:
    changes = payload.model_dump(mode="json", exclude_none=True)
    if not changes:
        existing = repository.get_profile_for_user(
            profile_id=str(profile_id),
            user_id=current_user.id,
        )
        if existing is None:
            raise _profile_not_found()
        return ImportProfileResponse.model_validate(_public_profile(existing))
    updated = repository.update_profile_for_user(
        profile_id=str(profile_id),
        user_id=current_user.id,
        payload=changes,
    )
    if updated is None:
        raise _profile_not_found()
    return ImportProfileResponse.model_validate(_public_profile(updated))


@profiles_router.delete(
    "/{profile_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_import_profile(
    profile_id: UUID,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    repository: Annotated[
        ImportProfilesRepository,
        Depends(get_import_profiles_repository),
    ],
) -> Response:
    deleted = repository.delete_profile_for_user(
        profile_id=str(profile_id),
        user_id=current_user.id,
    )
    if not deleted:
        raise _profile_not_found()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def import_options_from_request(
    *,
    source_type: ImportSourceType,
    column_mapping: str | None,
    status_mapping: str | None,
    profile: dict[str, Any] | None,
) -> ImportOptions:
    if profile is not None:
        return ImportOptions(
            source_type=profile["source_type"],
            column_mapping=profile.get("column_mapping") or {},
            status_mapping=profile.get("status_mapping") or {},
            namespace=f"profile:{profile['id']}",
            expected_header_fingerprint=profile["header_fingerprint"],
        )
    return ImportOptions(
        source_type=source_type,
        column_mapping=_parse_mapping(column_mapping, "column_mapping"),
        status_mapping=_parse_mapping(status_mapping, "status_mapping"),
    )


def _parse_mapping(
    raw_value: str | None,
    field_name: str,
) -> dict[str, str] | None:
    if raw_value is None or not raw_value.strip():
        return None
    try:
        parsed = json.loads(raw_value)
    except json.JSONDecodeError as error:
        raise AppError(
            code="INVALID_IMPORT_MAPPING",
            message="The import mapping must be a valid JSON object.",
            status_code=400,
            details={"field": field_name},
        ) from error
    if not isinstance(parsed, dict) or not all(
        isinstance(key, str) and isinstance(value, str)
        for key, value in parsed.items()
    ):
        raise AppError(
            code="INVALID_IMPORT_MAPPING",
            message="The import mapping must contain string keys and values.",
            status_code=400,
            details={"field": field_name},
        )
    return parsed


def _read_limited_upload(file: UploadFile, settings: Settings) -> bytes:
    max_bytes = settings.max_upload_mb * 1024 * 1024
    content = file.file.read(max_bytes + 1)
    if len(content) > max_bytes:
        raise AppError(
            code="FILE_TOO_LARGE",
            message=f"The file exceeds the {settings.max_upload_mb} MB limit.",
            status_code=400,
            details={"max_upload_mb": settings.max_upload_mb},
        )
    return content


def _profile_not_found() -> AppError:
    return AppError(
        code="IMPORT_PROFILE_NOT_FOUND",
        message="Import profile not found.",
        status_code=404,
    )


def _public_profile(record: dict[str, Any]) -> dict[str, Any]:
    return {
        key: record[key]
        for key in (
            "id",
            "name",
            "source_type",
            "column_mapping",
            "status_mapping",
            "header_fingerprint",
            "schema_version",
            "created_at",
            "updated_at",
        )
    }
