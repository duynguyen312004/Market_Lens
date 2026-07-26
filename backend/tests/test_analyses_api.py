from copy import deepcopy
from datetime import UTC, datetime
import inspect
from pathlib import Path
from typing import Any
from uuid import uuid4

import pandas as pd
import pytest
from fastapi.testclient import TestClient

from backend.app.core.auth import AuthenticatedUser, get_current_user
from backend.app.core.config import Settings, get_settings
from backend.app.main import app
from backend.app.repositories.analyses_repository import (
    get_analyses_repository,
)
from backend.app.repositories.import_profiles_repository import (
    get_import_profiles_repository,
)
from backend.app.routers.analyses import (
    create_analysis,
    create_combined_analysis,
    delete_analysis,
    generate_analysis_ai_report,
    get_analysis,
    list_analyses,
)
from backend.app.services.ai_report import AIReportGeneration


client = TestClient(app)
SAMPLE_TEMPLATE = Path("sample_data/sample_sales_template.csv")
PLATFORM_SAMPLE_DIR = Path("sample_data/platform_samples")


class FakeAnalysesRepository:
    def __init__(self) -> None:
        self.records: dict[str, dict[str, Any]] = {}

    def create_analysis(self, **payload: Any) -> dict[str, Any]:
        record_id = str(uuid4())
        record = {
            "id": record_id,
            **payload,
            "status": "completed",
            "created_at": datetime.now(UTC).isoformat(),
            "updated_at": datetime.now(UTC).isoformat(),
            "error_message": None,
        }
        self.records[record_id] = record
        return record
    def list_analyses_for_user(
        self,
        *,
        user_id: str,
        limit: int,
        offset: int,
    ) -> list[dict[str, Any]]:
        records = [
            record
            for record in self.records.values()
            if record["user_id"] == user_id
        ]
        records.sort(key=lambda item: item["created_at"], reverse=True)
        return [
            {
                key: record[key]
                for key in (
                    "id",
                    "file_name",
                    "upload_mode",
                    "source_file_count",
                    "status",
                    "row_count",
                    "date_from",
                    "date_to",
                    "created_at",
                )
            }
            for record in records[offset : offset + limit]
        ]

    def get_analysis_for_user(
        self,
        *,
        analysis_id: str,
        user_id: str,
    ) -> dict[str, Any] | None:
        record = self.records.get(analysis_id)
        if record is None or record["user_id"] != user_id:
            return None
        return record

    def delete_analysis_for_user(
        self,
        *,
        analysis_id: str,
        user_id: str,
    ) -> bool:
        record = self.get_analysis_for_user(
            analysis_id=analysis_id,
            user_id=user_id,
        )
        if record is None:
            return False
        del self.records[analysis_id]
        return True

    def update_analysis_report_for_user(
        self,
        *,
        analysis_id: str,
        user_id: str,
        report: dict[str, Any],
        language: str = "en",
    ) -> dict[str, Any] | None:
        record = self.get_analysis_for_user(
            analysis_id=analysis_id,
            user_id=user_id,
        )
        if record is None:
            return None
        reports = {
            **record["result_json"].get("reports", {}),
            language: report,
        }
        record["result_json"] = {
            **record["result_json"],
            "report": report,
            "reports": reports,
        }
        return record


class FakeImportProfilesRepository:
    def get_profile_for_user(
        self,
        *,
        profile_id: str,
        user_id: str,
    ) -> dict[str, Any] | None:
        del profile_id, user_id
        return None


@pytest.fixture
def fake_repository() -> FakeAnalysesRepository:
    repository = FakeAnalysesRepository()
    app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(
        id="11111111-1111-1111-1111-111111111111",
        email="owner@example.com",
    )
    app.dependency_overrides[get_analyses_repository] = lambda: repository
    app.dependency_overrides[get_import_profiles_repository] = (
        lambda: FakeImportProfilesRepository()
    )
    app.dependency_overrides[get_settings] = lambda: Settings(
        ai_report_enabled=False,
    )

    try:
        yield repository
    finally:
        app.dependency_overrides.clear()


def test_upload_requires_authentication() -> None:
    response = client.post(
        "/api/v1/analyses",
        files={"file": ("sales.csv", SAMPLE_TEMPLATE.read_bytes(), "text/csv")},
    )

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


def test_blocking_analysis_routes_run_as_sync_path_operations() -> None:
    path_operations = (
        create_analysis,
        create_combined_analysis,
        list_analyses,
        get_analysis,
        generate_analysis_ai_report,
        delete_analysis,
    )

    assert all(
        not inspect.iscoroutinefunction(operation)
        for operation in path_operations
    )


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("GET", "/api/v1/analyses"),
        (
            "GET",
            "/api/v1/analyses/11111111-1111-1111-1111-111111111111",
        ),
        (
            "DELETE",
            "/api/v1/analyses/11111111-1111-1111-1111-111111111111",
        ),
        (
            "POST",
            "/api/v1/analyses/11111111-1111-1111-1111-111111111111/ai-report",
        ),
        ("POST", "/api/v1/analyses/combined"),
    ],
)
def test_analysis_routes_require_authentication(
    method: str,
    path: str,
) -> None:
    response = client.request(method, path)

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


def test_upload_rejects_invalid_file_type(
    fake_repository: FakeAnalysesRepository,
) -> None:
    response = client.post(
        "/api/v1/analyses",
        files={"file": ("sales.txt", b"invalid", "text/plain")},
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_FILE_TYPE"
    assert fake_repository.records == {}


@pytest.mark.parametrize(
    ("file_name", "source_type", "expected_revenue"),
    [
        ("tiktok_shop_orders_sample.csv", "tiktok", 570_000),
        ("shopee_orders_sample.csv", "shopee", 800_000),
    ],
)
def test_platform_export_is_normalized_before_analysis(
    fake_repository: FakeAnalysesRepository,
    file_name: str,
    source_type: str,
    expected_revenue: int,
) -> None:
    path = PLATFORM_SAMPLE_DIR / file_name

    response = client.post(
        "/api/v1/analyses",
        files={"file": (file_name, path.read_bytes(), "text/csv")},
        data={"source_type": "auto"},
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["summary"]["total_revenue"] == expected_revenue
    assert payload["summary"]["total_orders"] == 2
    assert payload["upload"]["source_type"] == source_type
    assert payload["upload"]["source_row_count"] == 5
    assert payload["upload"]["skipped_row_count"] == 1
    assert "NON_FINAL_ORDERS_SKIPPED" in payload["warnings"]


def test_invalid_analysis_id_uses_error_contract(
    fake_repository: FakeAnalysesRepository,
) -> None:
    response = client.get("/api/v1/analyses/not-a-uuid")

    assert response.status_code == 422
    payload = response.json()["error"]
    assert payload["code"] == "REQUEST_VALIDATION_ERROR"
    assert payload["message"] == "The request contains invalid parameters."
    assert payload["details"]["errors"][0]["location"] == [
        "path",
        "analysis_id",
    ]


def test_upload_rejects_file_larger_than_limit(
    fake_repository: FakeAnalysesRepository,
) -> None:
    response = client.post(
        "/api/v1/analyses",
        files={
            "file": (
                "sales.csv",
                b"x" * (10 * 1024 * 1024 + 1),
                "text/csv",
            )
        },
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "FILE_TOO_LARGE"
    assert fake_repository.records == {}


def test_request_body_limit_rejects_before_multipart_processing(
    fake_repository: FakeAnalysesRepository,
) -> None:
    response = client.post(
        "/api/v1/analyses",
        files={
            "file": (
                "sales.csv",
                b"x" * (12 * 1024 * 1024),
                "text/csv",
            )
        },
    )

    assert response.status_code == 413
    assert response.json()["error"]["code"] == "FILE_TOO_LARGE"
    assert fake_repository.records == {}


def test_unexpected_upload_failure_uses_processing_error_contract(
    fake_repository: FakeAnalysesRepository,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fail_to_read_file(**_: Any) -> None:
        raise RuntimeError("private detail")

    monkeypatch.setattr(
        "backend.app.routers.analyses.read_sales_file",
        fail_to_read_file,
    )

    response = client.post(
        "/api/v1/analyses",
        files={"file": ("sales.csv", b"header", "text/csv")},
    )

    assert response.status_code == 500
    assert response.json() == {
        "error": {
            "code": "ANALYSIS_PROCESSING_FAILED",
                "message": "The data file cannot be processed right now.",
            "details": None,
        }
    }
    assert response.headers["x-request-id"]
    assert "private detail" not in response.text
    assert fake_repository.records == {}


def test_upload_valid_csv_persists_and_returns_analysis(
    fake_repository: FakeAnalysesRepository,
) -> None:
    response = client.post(
        "/api/v1/analyses",
        files={"file": ("sales.csv", SAMPLE_TEMPLATE.read_bytes(), "text/csv")},
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["file_name"] == "sales.csv"
    assert payload["upload_mode"] == "single"
    assert payload["contract_version"] == "5.0"
    assert payload["source_file_count"] == 1
    assert payload["upload"]["mode"] == "single"
    assert payload["row_count"] == 4
    assert payload["summary"] == {
        "total_revenue": 926_000,
        "total_orders": 2,
        "total_customers": 2,
        "total_quantity_sold": 4,
        "growth_rate_percent": None,
        "average_order_value": 463_000,
        "average_revenue_per_customer": 463_000,
    }
    assert payload["orders"]["by_status"] == {
        "completed": 2,
        "cancelled": 1,
        "returned": 0,
    }
    assert payload["customers"]["rfm"]["available"] is False
    assert payload["customers"]["rfm"]["reason"] == (
        "INSUFFICIENT_CUSTOMERS"
    )
    assert payload["sales"]["product_intelligence"]["abc"][
        "classified_product_count"
    ] == 3
    associations = payload["sales"]["product_intelligence"][
        "associations"
    ]
    assert associations["available"] is False
    assert associations["reason"] == "INSUFFICIENT_ASSOCIATION_SUPPORT"
    assert associations["observed_pair_count"] == 1
    assert payload["customers"]["cohort_analysis"]["available"] is False
    assert payload["sales"]["discount_analysis"]["discount_amount"] == 30_000
    assert all(
        horizon["available"] is False
        for horizon in payload["forecast"]["horizons"]
    )
    assert payload["report"]["source"] == "rule_based"
    assert len(fake_repository.records) == 1


def test_combined_upload_persists_one_analysis_atomically(
    fake_repository: FakeAnalysesRepository,
) -> None:
    header, *rows = SAMPLE_TEMPLATE.read_text(encoding="utf-8").splitlines()
    first_file = "\n".join([header, *rows[:2]]).encode()
    second_file = "\n".join([header, *rows[2:]]).encode()

    response = client.post(
        "/api/v1/analyses/combined",
        files=[
            ("files", ("first.csv", first_file, "text/csv")),
            ("files", ("second.csv", second_file, "text/csv")),
        ],
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["upload_mode"] == "combined"
    assert payload["source_file_count"] == 2
    assert payload["row_count"] == 4
    assert payload["summary"]["total_revenue"] == 926_000
    assert payload["upload"] == {
        "mode": "combined",
        "file_count": 2,
        "source_files": [
            {
                "file_name": "first.csv",
                "row_count": 2,
                "source_type": "marketlens",
                "source_row_count": 2,
                "skipped_row_count": 0,
            },
            {
                "file_name": "second.csv",
                "row_count": 2,
                "source_type": "marketlens",
                "source_row_count": 2,
                "skipped_row_count": 0,
            },
        ],
        "source_row_count": 4,
        "effective_row_count": 4,
        "duplicate_order_count": 0,
        "duplicate_row_count": 0,
        "source_type": "marketlens",
        "import_profile_id": None,
        "header_fingerprint": (
            "2ac32f682347911f887217ca57fb3a7a001a93ae4a09e50d8c25b19ccb3fc9ad"
        ),
        "skipped_row_count": 0,
        "capabilities": {
            "sales_analytics": True,
            "product_analytics": True,
            "customer_analytics": True,
            "category_analytics": True,
            "discount_analytics": True,
            "cancellation_return_analysis": True,
        },
    }
    assert len(fake_repository.records) == 1


def test_combined_auto_detects_each_platform_file_independently(
    fake_repository: FakeAnalysesRepository,
) -> None:
    shopee = PLATFORM_SAMPLE_DIR / "shopee_orders_sample.csv"
    tiktok = PLATFORM_SAMPLE_DIR / "tiktok_shop_orders_sample.csv"

    response = client.post(
        "/api/v1/analyses/combined",
        files=[
            ("files", (shopee.name, shopee.read_bytes(), "text/csv")),
            ("files", (tiktok.name, tiktok.read_bytes(), "text/csv")),
        ],
        data={"source_type": "auto"},
    )

    assert response.status_code == 201
    payload = response.json()
    assert {
        item["source_type"]
        for item in payload["upload"]["source_files"]
    } == {"shopee", "tiktok"}
    assert payload["upload"]["source_type"] == "mixed"
    assert payload["upload"]["source_row_count"] == 10
    assert payload["upload"]["skipped_row_count"] == 2
    assert len(fake_repository.records) == 1


def test_combined_upload_rejects_invalid_second_file_without_persisting(
    fake_repository: FakeAnalysesRepository,
) -> None:
    response = client.post(
        "/api/v1/analyses/combined",
        files=[
            (
                "files",
                ("valid.csv", SAMPLE_TEMPLATE.read_bytes(), "text/csv"),
            ),
            ("files", ("invalid.csv", b"wrong,columns\n1,2", "text/csv")),
        ],
    )

    assert response.status_code == 400
    payload = response.json()["error"]
    assert payload["code"] == "IMPORT_SOURCE_NOT_DETECTED"
    assert payload["details"]["file_name"] == "invalid.csv"
    assert fake_repository.records == {}


def test_combined_upload_rejects_duplicate_file_names(
    fake_repository: FakeAnalysesRepository,
) -> None:
    response = client.post(
        "/api/v1/analyses/combined",
        files=[
            (
                "files",
                ("sales.csv", SAMPLE_TEMPLATE.read_bytes(), "text/csv"),
            ),
            (
                "files",
                ("SALES.CSV", SAMPLE_TEMPLATE.read_bytes(), "text/csv"),
            ),
        ],
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "DUPLICATE_FILE_NAMES"
    assert fake_repository.records == {}


def test_combined_upload_deduplicates_exact_repeated_orders(
    fake_repository: FakeAnalysesRepository,
) -> None:
    response = client.post(
        "/api/v1/analyses/combined",
        files=[
            (
                "files",
                ("first.csv", SAMPLE_TEMPLATE.read_bytes(), "text/csv"),
            ),
            (
                "files",
                ("duplicate.csv", SAMPLE_TEMPLATE.read_bytes(), "text/csv"),
            ),
        ],
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["row_count"] == 4
    assert payload["upload"]["source_row_count"] == 8
    assert payload["upload"]["duplicate_order_count"] == 3
    assert payload["upload"]["duplicate_row_count"] == 4
    assert "DUPLICATE_ORDERS_REMOVED" in payload["warnings"]
    assert len(fake_repository.records) == 1


def test_combined_upload_rejects_conflicting_order_without_persisting(
    fake_repository: FakeAnalysesRepository,
) -> None:
    original = SAMPLE_TEMPLATE.read_text(encoding="utf-8")
    changed = original.replace(
        "TPL-O001,2026-06-01,TPL-C001,Khach hang mau 001,TPL-P001,"
        "Ao thun co ban,Thoi trang,2,159000,20000,completed",
        "TPL-O001,2026-06-01,TPL-C001,Khach hang mau 001,TPL-P001,"
        "Ao thun co ban,Thoi trang,3,159000,20000,completed",
    )
    response = client.post(
        "/api/v1/analyses/combined",
        files=[
            ("files", ("original.csv", original.encode(), "text/csv")),
            ("files", ("changed.csv", changed.encode(), "text/csv")),
        ],
    )

    assert response.status_code == 400
    payload = response.json()["error"]
    assert payload["code"] == "CONFLICTING_DATA_ACROSS_FILES"
    assert payload["details"]["errors"][0]["identifier"] == "TPL-O001"
    assert fake_repository.records == {}


def test_combined_upload_requires_two_files(
    fake_repository: FakeAnalysesRepository,
) -> None:
    response = client.post(
        "/api/v1/analyses/combined",
        files=[
            (
                "files",
                ("sales.csv", SAMPLE_TEMPLATE.read_bytes(), "text/csv"),
            )
        ],
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "NOT_ENOUGH_FILES"
    assert fake_repository.records == {}


def test_combined_upload_enforces_file_count_limit(
    fake_repository: FakeAnalysesRepository,
) -> None:
    app.dependency_overrides[get_settings] = lambda: Settings(
        ai_report_enabled=False,
        max_upload_files=2,
    )
    content = SAMPLE_TEMPLATE.read_bytes()

    response = client.post(
        "/api/v1/analyses/combined",
        files=[
            ("files", ("one.csv", content, "text/csv")),
            ("files", ("two.csv", content, "text/csv")),
            ("files", ("three.csv", content, "text/csv")),
        ],
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "TOO_MANY_FILES"
    assert fake_repository.records == {}


def test_combined_upload_enforces_total_size_before_parsing(
    fake_repository: FakeAnalysesRepository,
) -> None:
    app.dependency_overrides[get_settings] = lambda: Settings(
        ai_report_enabled=False,
        max_upload_mb=1,
    )
    padded = SAMPLE_TEMPLATE.read_bytes() + (b"\n" * 600_000)

    response = client.post(
        "/api/v1/analyses/combined",
        files=[
            ("files", ("one.csv", padded, "text/csv")),
            ("files", ("two.csv", padded, "text/csv")),
        ],
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "FILE_TOO_LARGE"
    assert fake_repository.records == {}


def test_combined_upload_enforces_total_row_limit_during_validation(
    fake_repository: FakeAnalysesRepository,
) -> None:
    app.dependency_overrides[get_settings] = lambda: Settings(
        ai_report_enabled=False,
        max_upload_rows=5,
    )
    content = SAMPLE_TEMPLATE.read_bytes()

    response = client.post(
        "/api/v1/analyses/combined",
        files=[
            ("files", ("one.csv", content, "text/csv")),
            ("files", ("two.csv", content, "text/csv")),
        ],
    )

    assert response.status_code == 400
    payload = response.json()["error"]
    assert payload["code"] == "TOO_MANY_ROWS"
    assert payload["details"]["actual_rows"] == 8
    assert payload["details"]["file_name"] == "two.csv"
    assert fake_repository.records == {}


def test_single_upload_rejects_analysis_period_over_configured_limit(
    fake_repository: FakeAnalysesRepository,
) -> None:
    app.dependency_overrides[get_settings] = lambda: Settings(
        ai_report_enabled=False,
        max_analysis_period_days=14,
    )
    source = pd.read_csv(SAMPLE_TEMPLATE).iloc[[0, 0]].copy()
    source["order_id"] = ["RANGE-001", "RANGE-002"]
    source["order_date"] = ["2026-06-17", "2026-07-01"]

    response = client.post(
        "/api/v1/analyses",
        files={
            "file": (
                "long-period.csv",
                source.to_csv(index=False).encode(),
                "text/csv",
            )
        },
    )

    assert response.status_code == 400
    payload = response.json()["error"]
    assert payload["code"] == "DATE_RANGE_TOO_LARGE"
    assert payload["details"]["actual_period_days"] == 15
    assert fake_repository.records == {}


def test_combined_upload_checks_period_across_source_boundaries(
    fake_repository: FakeAnalysesRepository,
) -> None:
    app.dependency_overrides[get_settings] = lambda: Settings(
        ai_report_enabled=False,
        max_analysis_period_days=14,
    )
    first = pd.read_csv(SAMPLE_TEMPLATE).iloc[[0]].copy()
    first["order_id"] = ["RANGE-001"]
    first["order_date"] = ["2026-06-17"]
    second = pd.read_csv(SAMPLE_TEMPLATE).iloc[[0]].copy()
    second["order_id"] = ["RANGE-002"]
    second["order_date"] = ["2026-07-01"]

    response = client.post(
        "/api/v1/analyses/combined",
        files=[
            (
                "files",
                (
                    "first.csv",
                    first.to_csv(index=False).encode(),
                    "text/csv",
                ),
            ),
            (
                "files",
                (
                    "second.csv",
                    second.to_csv(index=False).encode(),
                    "text/csv",
                ),
            ),
        ],
    )

    assert response.status_code == 400
    payload = response.json()["error"]
    assert payload["code"] == "DATE_RANGE_TOO_LARGE"
    assert payload["details"]["actual_period_days"] == 15
    assert fake_repository.records == {}


def test_list_get_and_delete_analysis(
    fake_repository: FakeAnalysesRepository,
) -> None:
    create_response = client.post(
        "/api/v1/analyses",
        files={"file": ("sales.csv", SAMPLE_TEMPLATE.read_bytes(), "text/csv")},
    )
    analysis_id = create_response.json()["id"]

    list_response = client.get("/api/v1/analyses")
    assert list_response.status_code == 200
    assert list_response.json()["items"][0]["id"] == analysis_id

    detail_response = client.get(f"/api/v1/analyses/{analysis_id}")
    assert detail_response.status_code == 200
    assert detail_response.json()["summary"]["total_revenue"] == 926_000

    delete_response = client.delete(f"/api/v1/analyses/{analysis_id}")
    assert delete_response.status_code == 204
    assert client.get(f"/api/v1/analyses/{analysis_id}").status_code == 404


def test_other_user_receives_not_found(
    fake_repository: FakeAnalysesRepository,
) -> None:
    create_response = client.post(
        "/api/v1/analyses",
        files={"file": ("sales.csv", SAMPLE_TEMPLATE.read_bytes(), "text/csv")},
    )
    analysis_id = create_response.json()["id"]

    app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(
        id="22222222-2222-2222-2222-222222222222",
        email="other@example.com",
    )

    response = client.get(f"/api/v1/analyses/{analysis_id}")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "ANALYSIS_NOT_FOUND"


def test_other_user_cannot_delete_analysis(
    fake_repository: FakeAnalysesRepository,
) -> None:
    create_response = client.post(
        "/api/v1/analyses",
        files={"file": ("sales.csv", SAMPLE_TEMPLATE.read_bytes(), "text/csv")},
    )
    analysis_id = create_response.json()["id"]

    app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(
        id="22222222-2222-2222-2222-222222222222",
        email="other@example.com",
    )
    delete_response = client.delete(f"/api/v1/analyses/{analysis_id}")

    assert delete_response.status_code == 404
    assert delete_response.json()["error"]["code"] == "ANALYSIS_NOT_FOUND"
    assert analysis_id in fake_repository.records


def test_ai_report_disabled_returns_and_persists_fallback(
    fake_repository: FakeAnalysesRepository,
) -> None:
    create_response = client.post(
        "/api/v1/analyses",
        files={"file": ("sales.csv", SAMPLE_TEMPLATE.read_bytes(), "text/csv")},
    )
    analysis_id = create_response.json()["id"]

    response = client.post(f"/api/v1/analyses/{analysis_id}/ai-report")

    assert response.status_code == 200
    payload = response.json()
    assert payload["analysis_id"] == analysis_id
    assert payload["source"] == "rule_based"
    assert payload["language"] == "en"
    assert payload["warning"]["code"] == "AI_DISABLED"
    detail = client.get(f"/api/v1/analyses/{analysis_id}").json()
    assert detail["report"]["source"] == "rule_based"


def test_other_user_cannot_generate_ai_report(
    fake_repository: FakeAnalysesRepository,
) -> None:
    create_response = client.post(
        "/api/v1/analyses",
        files={"file": ("sales.csv", SAMPLE_TEMPLATE.read_bytes(), "text/csv")},
    )
    analysis_id = create_response.json()["id"]
    app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(
        id="22222222-2222-2222-2222-222222222222",
        email="other@example.com",
    )

    response = client.post(f"/api/v1/analyses/{analysis_id}/ai-report")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "ANALYSIS_NOT_FOUND"


def test_ai_report_success_is_persisted(
    fake_repository: FakeAnalysesRepository,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    create_response = client.post(
        "/api/v1/analyses",
        files={"file": ("sales.csv", SAMPLE_TEMPLATE.read_bytes(), "text/csv")},
    )
    analysis_id = create_response.json()["id"]
    ai_report = deepcopy(create_response.json()["report"])
    ai_report.update(
        {
            "source": "ai",
            "generator": {
                "provider": "gemini",
                "model": "gemini-3.5-flash-lite",
            },
            "title": "Báo cáo AI dựa trên bằng chứng",
            "executive_summary": (
                "Báo cáo AI sử dụng duy nhất các bằng chứng tổng hợp "
                "của kỳ dữ liệu hiện tại."
            ),
        }
    )
    monkeypatch.setattr(
        "backend.app.routers.analyses.generate_ai_report",
        lambda **_: AIReportGeneration(report=ai_report),
    )

    response = client.post(f"/api/v1/analyses/{analysis_id}/ai-report")

    assert response.status_code == 200
    assert response.json()["source"] == "ai"
    assert response.json()["warning"] is None
    detail = client.get(f"/api/v1/analyses/{analysis_id}").json()
    assert detail["report"] == ai_report
    assert detail["reports"]["en"] == ai_report


def test_vietnamese_ai_report_fallback_is_localized_and_persisted(
    fake_repository: FakeAnalysesRepository,
) -> None:
    create_response = client.post(
        "/api/v1/analyses",
        files={"file": ("sales.csv", SAMPLE_TEMPLATE.read_bytes(), "text/csv")},
    )
    analysis_id = create_response.json()["id"]

    response = client.post(
        f"/api/v1/analyses/{analysis_id}/ai-report",
        params={"language": "vi"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["language"] == "vi"
    assert payload["source"] == "rule_based"
    assert payload["report"]["title"] == (
        "Báo cáo tình hình kinh doanh"
    )
    detail = client.get(f"/api/v1/analyses/{analysis_id}").json()
    assert detail["reports"]["vi"] == payload["report"]
    assert detail["reports"]["en"]["title"] == (
        "Business performance report"
    )


def test_ai_rate_limit_returns_and_persists_rule_based_fallback(
    fake_repository: FakeAnalysesRepository,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    create_response = client.post(
        "/api/v1/analyses",
        files={"file": ("sales.csv", SAMPLE_TEMPLATE.read_bytes(), "text/csv")},
    )
    analysis_id = create_response.json()["id"]
    fallback_report = create_response.json()["report"]
    monkeypatch.setattr(
        "backend.app.routers.analyses.generate_ai_report",
        lambda **_: AIReportGeneration(
            report=fallback_report,
            warning_code="AI_RATE_LIMITED",
        ),
    )

    response = client.post(f"/api/v1/analyses/{analysis_id}/ai-report")

    assert response.status_code == 200
    payload = response.json()
    assert payload["source"] == "rule_based"
    assert payload["warning"]["code"] == "AI_RATE_LIMITED"
    assert "rate-limited" in payload["warning"]["message"]
    detail = client.get(f"/api/v1/analyses/{analysis_id}").json()
    assert detail["report"] == fallback_report
