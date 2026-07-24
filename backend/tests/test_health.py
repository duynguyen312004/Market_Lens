import asyncio
import logging
from uuid import UUID

from fastapi.testclient import TestClient
from starlette.requests import Request

from backend.app.core.errors import AppError, app_error_handler
from backend.app.main import app


client = TestClient(app)


def test_health_check() -> None:
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "marketlens-api",
    }
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["referrer-policy"] == "no-referrer"
    assert str(UUID(response.headers["x-request-id"])) == response.headers[
        "x-request-id"
    ]


def test_cors_allows_configured_frontend_only() -> None:
    allowed = client.options(
        "/api/v1/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization",
        },
    )
    rejected = client.options(
        "/api/v1/health",
        headers={
            "Origin": "https://untrusted.example",
            "Access-Control-Request-Method": "GET",
        },
    )
    allowed_get = client.get(
        "/api/v1/health",
        headers={"Origin": "http://localhost:5173"},
    )

    assert allowed.status_code == 200
    assert (
        allowed.headers["access-control-allow-origin"]
        == "http://localhost:5173"
    )
    assert allowed_get.headers["access-control-expose-headers"] == (
        "X-Request-ID"
    )
    assert "access-control-allow-credentials" not in allowed.headers
    assert rejected.status_code == 400
    assert "access-control-allow-origin" not in rejected.headers


def test_unknown_route_uses_error_contract() -> None:
    response = client.get("/api/v1/not-a-route")

    assert response.status_code == 404
    assert response.json() == {
        "error": {
            "code": "HTTP_ERROR",
            "message": "Not Found",
            "details": None,
        }
    }


def test_server_app_error_log_contains_request_id(caplog) -> None:
    request = Request(
        {
            "type": "http",
            "method": "POST",
            "path": "/api/v1/analyses",
            "raw_path": b"/api/v1/analyses",
            "root_path": "",
            "scheme": "http",
            "query_string": b"",
            "headers": [],
            "client": ("testclient", 50_000),
            "server": ("testserver", 80),
        }
    )
    request.state.request_id = "audit-request-id"

    with caplog.at_level(logging.ERROR):
        response = asyncio.run(
            app_error_handler(
                request,
                AppError(
                    code="DATABASE_UNAVAILABLE",
                    message="Database unavailable.",
                    status_code=503,
                ),
            )
        )

    assert response.status_code == 503
    assert "request_id=audit-request-id" in caplog.text
    assert "code=DATABASE_UNAVAILABLE" in caplog.text
