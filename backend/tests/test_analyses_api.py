from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from backend.app.core.auth import AuthenticatedUser, get_current_user
from backend.app.core.config import Settings, get_settings
from backend.app.main import app
from backend.app.repositories.analyses_repository import (
    get_analyses_repository,
)
from backend.app.services.ai_report import AIReportGeneration


client = TestClient(app)
SAMPLE_TEMPLATE = Path("sample_data/sample_sales_template.csv")


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
    ) -> dict[str, Any] | None:
        record = self.get_analysis_for_user(
            analysis_id=analysis_id,
            user_id=user_id,
        )
        if record is None:
            return None
        record["result_json"] = {
            **record["result_json"],
            "report": report,
        }
        return record


@pytest.fixture
def fake_repository() -> FakeAnalysesRepository:
    repository = FakeAnalysesRepository()
    app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(
        id="11111111-1111-1111-1111-111111111111",
        email="owner@example.com",
    )
    app.dependency_overrides[get_analyses_repository] = lambda: repository
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


def test_invalid_analysis_id_uses_error_contract(
    fake_repository: FakeAnalysesRepository,
) -> None:
    response = client.get("/api/v1/analyses/not-a-uuid")

    assert response.status_code == 422
    payload = response.json()["error"]
    assert payload["code"] == "REQUEST_VALIDATION_ERROR"
    assert payload["message"] == "Yêu cầu có tham số không hợp lệ."
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
            "message": "Không thể xử lý file dữ liệu lúc này.",
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
    assert payload["row_count"] == 4
    assert payload["summary"] == {
        "total_revenue": 740_000,
        "total_orders": 2,
        "total_customers": 2,
        "total_quantity_sold": 4,
        "growth_rate_percent": None,
    }
    assert payload["forecast"]["available"] is False
    assert payload["report"]["source"] == "rule_based"
    assert len(fake_repository.records) == 1


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
    assert detail_response.json()["summary"]["total_revenue"] == 740_000

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
    ai_report = {
        "source": "ai",
        "title": "Báo cáo AI",
        "summary": "Báo cáo AI dựa trên aggregate của kỳ dữ liệu hiện tại.",
        "highlights": ["Sản phẩm dẫn đầu đóng góp doanh thu cao nhất."],
        "trend_analysis": "Chưa đủ dữ liệu để so sánh hai kỳ 7 ngày.",
        "recommendations": [
            {
                "title": "Theo dõi sản phẩm dẫn đầu",
                "description": (
                    "Tiếp tục theo dõi đóng góp doanh thu qua các kỳ sau."
                ),
            }
        ],
        "disclaimer": "Báo cáo chỉ mang tính tham khảo.",
    }
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
    assert "giới hạn sử dụng" in payload["warning"]["message"]
    detail = client.get(f"/api/v1/analyses/{analysis_id}").json()
    assert detail["report"] == fallback_report
