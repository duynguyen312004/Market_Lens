from typing import Annotated, Any

from fastapi import Depends
from supabase import Client

from backend.app.core.errors import AppError
from backend.app.core.supabase import get_supabase_client


PROFILE_COLUMNS = (
    "id,user_id,name,source_type,column_mapping,status_mapping,"
    "header_fingerprint,schema_version,created_at,updated_at"
)


class ImportProfilesRepository:
    def __init__(self, client: Client) -> None:
        self.client = client

    def list_profiles_for_user(self, *, user_id: str) -> list[dict[str, Any]]:
        try:
            response = (
                self.client.table("import_profiles")
                .select(PROFILE_COLUMNS)
                .eq("user_id", user_id)
                .order("updated_at", desc=True)
                .execute()
            )
        except Exception as error:
            raise _database_error() from error
        return [dict(item) for item in response.data or []]

    def create_profile(
        self,
        *,
        user_id: str,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        record = {**payload, "user_id": user_id}
        try:
            response = (
                self.client.table("import_profiles")
                .insert(record)
                .execute()
            )
        except Exception as error:
            raise _database_error(error) from error
        if not response.data:
            raise _database_error()
        return dict(response.data[0])

    def get_profile_for_user(
        self,
        *,
        profile_id: str,
        user_id: str,
    ) -> dict[str, Any] | None:
        try:
            response = (
                self.client.table("import_profiles")
                .select(PROFILE_COLUMNS)
                .eq("id", profile_id)
                .eq("user_id", user_id)
                .limit(1)
                .execute()
            )
        except Exception as error:
            raise _database_error() from error
        if not response.data:
            return None
        return dict(response.data[0])

    def update_profile_for_user(
        self,
        *,
        profile_id: str,
        user_id: str,
        payload: dict[str, Any],
    ) -> dict[str, Any] | None:
        existing = self.get_profile_for_user(
            profile_id=profile_id,
            user_id=user_id,
        )
        if existing is None:
            return None
        try:
            response = (
                self.client.table("import_profiles")
                .update(payload)
                .eq("id", profile_id)
                .eq("user_id", user_id)
                .execute()
            )
        except Exception as error:
            raise _database_error(error) from error
        if not response.data:
            raise _database_error()
        return dict(response.data[0])

    def delete_profile_for_user(
        self,
        *,
        profile_id: str,
        user_id: str,
    ) -> bool:
        existing = self.get_profile_for_user(
            profile_id=profile_id,
            user_id=user_id,
        )
        if existing is None:
            return False
        try:
            (
                self.client.table("import_profiles")
                .delete()
                .eq("id", profile_id)
                .eq("user_id", user_id)
                .execute()
            )
        except Exception as error:
            raise _database_error() from error
        return True


def get_import_profiles_repository(
    client: Annotated[Client, Depends(get_supabase_client)],
) -> ImportProfilesRepository:
    return ImportProfilesRepository(client)


def _database_error(error: Exception | None = None) -> AppError:
    if str(getattr(error, "code", "")) == "23505":
        return AppError(
            code="IMPORT_PROFILE_NAME_CONFLICT",
            message="An import profile with this name already exists.",
            status_code=409,
        )
    return AppError(
        code="DATABASE_UNAVAILABLE",
        message="Import profiles cannot be accessed right now.",
        status_code=503,
    )
