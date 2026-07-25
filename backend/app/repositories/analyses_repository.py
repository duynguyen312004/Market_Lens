from copy import deepcopy
from datetime import date
from typing import Annotated, Any, Literal

from fastapi import Depends
from supabase import Client

from backend.app.core.errors import AppError
from backend.app.core.supabase import get_supabase_client


class AnalysesRepository:
    def __init__(self, client: Client) -> None:
        self.client = client

    def create_analysis(
        self,
        *,
        user_id: str,
        file_name: str,
        upload_mode: Literal["single", "combined"],
        source_file_count: int,
        row_count: int,
        date_from: date,
        date_to: date,
        result_json: dict[str, Any],
    ) -> dict[str, Any]:
        payload = {
            "user_id": user_id,
            "file_name": file_name,
            "upload_mode": upload_mode,
            "source_file_count": source_file_count,
            "status": "completed",
            "row_count": row_count,
            "date_from": date_from.isoformat(),
            "date_to": date_to.isoformat(),
            "result_json": result_json,
            "error_message": None,
        }
        try:
            response = self.client.table("analyses").insert(payload).execute()
        except Exception as error:
            raise _database_error() from error

        if not response.data:
            raise _database_error()
        return dict(response.data[0])

    def list_analyses_for_user(
        self,
        *,
        user_id: str,
        limit: int,
        offset: int,
    ) -> list[dict[str, Any]]:
        last_index = offset + limit - 1
        try:
            response = (
                self.client.table("analyses")
                .select(
                    "id,file_name,upload_mode,source_file_count,status,"
                    "row_count,date_from,date_to,created_at"
                )
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .range(offset, last_index)
                .execute()
            )
        except Exception as error:
            raise _database_error() from error

        return [dict(item) for item in response.data or []]

    def get_analysis_for_user(
        self,
        *,
        analysis_id: str,
        user_id: str,
    ) -> dict[str, Any] | None:
        try:
            response = (
                self.client.table("analyses")
                .select("*")
                .eq("id", analysis_id)
                .eq("user_id", user_id)
                .limit(1)
                .execute()
            )
        except Exception as error:
            raise _database_error() from error

        if not response.data:
            return None
        return dict(response.data[0])

    def delete_analysis_for_user(
        self,
        *,
        analysis_id: str,
        user_id: str,
    ) -> bool:
        existing = self.get_analysis_for_user(
            analysis_id=analysis_id,
            user_id=user_id,
        )
        if existing is None:
            return False

        try:
            (
                self.client.table("analyses")
                .delete()
                .eq("id", analysis_id)
                .eq("user_id", user_id)
                .execute()
            )
        except Exception as error:
            raise _database_error() from error

        return True

    def update_analysis_report_for_user(
        self,
        *,
        analysis_id: str,
        user_id: str,
        report: dict[str, Any],
        language: Literal["en", "vi"] = "en",
    ) -> dict[str, Any] | None:
        existing = self.get_analysis_for_user(
            analysis_id=analysis_id,
            user_id=user_id,
        )
        if existing is None:
            return None

        result_json = deepcopy(existing.get("result_json") or {})
        result_json["report"] = report
        reports = deepcopy(result_json.get("reports") or {})
        reports[language] = report
        result_json["reports"] = reports

        try:
            response = (
                self.client.table("analyses")
                .update({"result_json": result_json})
                .eq("id", analysis_id)
                .eq("user_id", user_id)
                .execute()
            )
        except Exception as error:
            raise _database_error() from error

        if not response.data:
            raise _database_error()
        return dict(response.data[0])


def get_analyses_repository(
    client: Annotated[Client, Depends(get_supabase_client)],
) -> AnalysesRepository:
    return AnalysesRepository(client)


def _database_error() -> AppError:
    return AppError(
        code="DATABASE_UNAVAILABLE",
        message="Analysis data cannot be accessed right now.",
        status_code=503,
    )
