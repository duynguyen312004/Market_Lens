from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from backend.app.core.auth import AuthenticatedUser, get_current_user
from backend.app.core.config import Settings, get_settings
from backend.app.main import app
from backend.app.repositories.import_profiles_repository import (
    get_import_profiles_repository,
)


client = TestClient(app)
TIKTOK_SAMPLE = Path(
    "sample_data/platform_samples/tiktok_shop_orders_sample.csv"
)


class FakeImportProfilesRepository:
    def __init__(self) -> None:
        self.records: dict[str, dict[str, Any]] = {}

    def list_profiles_for_user(self, *, user_id: str) -> list[dict[str, Any]]:
        return [
            item for item in self.records.values() if item["user_id"] == user_id
        ]

    def create_profile(
        self,
        *,
        user_id: str,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        now = datetime.now(UTC).isoformat()
        record = {
            "id": str(uuid4()),
            "user_id": user_id,
            **payload,
            "created_at": now,
            "updated_at": now,
        }
        self.records[record["id"]] = record
        return record

    def get_profile_for_user(
        self,
        *,
        profile_id: str,
        user_id: str,
    ) -> dict[str, Any] | None:
        record = self.records.get(profile_id)
        if record is None or record["user_id"] != user_id:
            return None
        return record

    def update_profile_for_user(
        self,
        *,
        profile_id: str,
        user_id: str,
        payload: dict[str, Any],
    ) -> dict[str, Any] | None:
        record = self.get_profile_for_user(
            profile_id=profile_id,
            user_id=user_id,
        )
        if record is None:
            return None
        record.update(payload)
        return record

    def delete_profile_for_user(
        self,
        *,
        profile_id: str,
        user_id: str,
    ) -> bool:
        record = self.get_profile_for_user(
            profile_id=profile_id,
            user_id=user_id,
        )
        if record is None:
            return False
        del self.records[profile_id]
        return True


@pytest.fixture
def fake_repository() -> FakeImportProfilesRepository:
    repository = FakeImportProfilesRepository()
    app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(
        id="11111111-1111-1111-1111-111111111111",
        email="owner@example.com",
    )
    app.dependency_overrides[get_import_profiles_repository] = (
        lambda: repository
    )
    app.dependency_overrides[get_settings] = lambda: Settings()
    try:
        yield repository
    finally:
        app.dependency_overrides.clear()


def test_preview_requires_authentication() -> None:
    response = client.post(
        "/api/v1/imports/preview",
        files={
            "file": (
                "tiktok.csv",
                TIKTOK_SAMPLE.read_bytes(),
                "text/csv",
            )
        },
    )

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


def test_preview_detects_tiktok_without_returning_raw_rows(
    fake_repository: FakeImportProfilesRepository,
) -> None:
    del fake_repository
    response = client.post(
        "/api/v1/imports/preview",
        files={
            "file": (
                "tiktok.csv",
                TIKTOK_SAMPLE.read_bytes(),
                "text/csv",
            )
        },
        data={"source_type": "auto"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["detected_source_type"] == "tiktok"
    assert payload["ready_for_analysis"] is True
    assert payload["row_count"] > 0
    assert "rows" not in payload
    assert "preview_rows" not in payload


def test_profile_crud_is_scoped_to_authenticated_user(
    fake_repository: FakeImportProfilesRepository,
) -> None:
    payload = {
        "name": "Shop TikTok",
        "source_type": "tiktok",
        "column_mapping": {"order_id": "Order ID"},
        "status_mapping": {"Delivered": "completed"},
        "header_fingerprint": "a" * 64,
        "schema_version": 2,
    }
    created = client.post("/api/v1/import-profiles", json=payload)

    assert created.status_code == 201
    profile_id = created.json()["id"]
    assert fake_repository.records[profile_id]["user_id"].startswith("1111")

    listed = client.get("/api/v1/import-profiles")
    assert listed.status_code == 200
    assert [item["id"] for item in listed.json()["items"]] == [profile_id]

    updated = client.patch(
        f"/api/v1/import-profiles/{profile_id}",
        json={"name": "Shop TikTok tháng 7"},
    )
    assert updated.status_code == 200
    assert updated.json()["name"] == "Shop TikTok tháng 7"

    deleted = client.delete(f"/api/v1/import-profiles/{profile_id}")
    assert deleted.status_code == 204
    assert fake_repository.records == {}


def test_profile_rejects_non_hex_header_fingerprint(
    fake_repository: FakeImportProfilesRepository,
) -> None:
    response = client.post(
        "/api/v1/import-profiles",
        json={
            "name": "Invalid fingerprint",
            "source_type": "tiktok",
            "column_mapping": {},
            "status_mapping": {},
            "header_fingerprint": "z" * 64,
            "schema_version": 2,
        },
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == (
        "REQUEST_VALIDATION_ERROR"
    )
    assert fake_repository.records == {}


def test_custom_profile_rejects_incomplete_mapping(
    fake_repository: FakeImportProfilesRepository,
) -> None:
    response = client.post(
        "/api/v1/import-profiles",
        json={
            "name": "Incomplete custom mapping",
            "source_type": "custom",
            "column_mapping": {"order_id": "Mã đơn"},
            "status_mapping": {},
            "header_fingerprint": "a" * 64,
            "schema_version": 2,
        },
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == (
        "REQUEST_VALIDATION_ERROR"
    )
    assert fake_repository.records == {}


def test_profile_from_another_user_looks_missing(
    fake_repository: FakeImportProfilesRepository,
) -> None:
    profile_id = str(uuid4())
    fake_repository.records[profile_id] = {
        "id": profile_id,
        "user_id": "another-user",
        "name": "Private profile",
        "source_type": "custom",
        "column_mapping": {},
        "status_mapping": {},
        "header_fingerprint": "a" * 64,
        "schema_version": 2,
        "created_at": datetime.now(UTC).isoformat(),
        "updated_at": datetime.now(UTC).isoformat(),
    }

    response = client.get("/api/v1/import-profiles")
    preview = client.post(
        "/api/v1/imports/preview",
        files={
            "file": (
                "tiktok.csv",
                TIKTOK_SAMPLE.read_bytes(),
                "text/csv",
            )
        },
        data={"import_profile_id": profile_id},
    )

    assert response.json()["items"] == []
    assert preview.status_code == 404
    assert preview.json()["error"]["code"] == "IMPORT_PROFILE_NOT_FOUND"
