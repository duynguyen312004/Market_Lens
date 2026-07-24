from __future__ import annotations

import os
from pathlib import Path
from typing import Any
from uuid import UUID

import httpx


EXPECTED_SUMMARY = {
    "total_revenue": 113_010_000,
    "total_orders": 273,
    "total_customers": 30,
    "total_quantity_sold": 503,
}
EXPECTED_FORECAST_TOTAL = 15_450_331
SAMPLE_FILE = Path("sample_data/sample_sales_demo_60_days.csv")


def required_environment(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"Thiếu biến môi trường {name}.")
    return value.rstrip("/")


def check_status(
    response: httpx.Response,
    expected_status: int,
    step: str,
) -> None:
    if response.status_code != expected_status:
        raise RuntimeError(
            f"{step} thất bại với HTTP {response.status_code}."
        )


def require_header(
    response: httpx.Response,
    name: str,
    *,
    contains: str | None = None,
) -> str:
    value = response.headers.get(name)
    if not value:
        raise RuntimeError(f"Thiếu security header {name}.")
    if contains and contains.casefold() not in value.casefold():
        raise RuntimeError(f"Security header {name} không đúng contract.")
    return value


def sign_in(
    *,
    supabase_url: str,
    publishable_key: str,
    email: str,
    password: str,
) -> str:
    response = httpx.post(
        f"{supabase_url}/auth/v1/token",
        params={"grant_type": "password"},
        headers={"apikey": publishable_key},
        json={"email": email, "password": password},
        timeout=20,
    )
    check_status(response, 200, "Đăng nhập Supabase")
    access_token = response.json().get("access_token")
    if not access_token:
        raise RuntimeError("Supabase không trả access token.")
    return str(access_token)


def assert_demo_metrics(payload: dict[str, Any]) -> None:
    summary = payload.get("summary") or {}
    for key, expected in EXPECTED_SUMMARY.items():
        if summary.get(key) != expected:
            raise RuntimeError(
                f"KPI {key} không khớp test oracle production."
            )

    forecast = payload.get("forecast") or {}
    if forecast.get("forecast_total") != EXPECTED_FORECAST_TOTAL:
        raise RuntimeError("Forecast total không khớp test oracle production.")


def main() -> None:
    frontend_origin = required_environment("SMOKE_FRONTEND_ORIGIN")
    api_origin = required_environment("SMOKE_API_ORIGIN")
    supabase_url = required_environment("SMOKE_SUPABASE_URL")
    publishable_key = required_environment(
        "SMOKE_SUPABASE_PUBLISHABLE_KEY"
    )
    email = required_environment("SMOKE_TEST_EMAIL")
    password = required_environment("SMOKE_TEST_PASSWORD")
    api_base_url = f"{api_origin}/api/v1"
    analysis_id: str | None = None

    with httpx.Client(timeout=60, follow_redirects=True) as client:
        frontend = client.get(frontend_origin)
        check_status(frontend, 200, "Frontend")
        if 'id="root"' not in frontend.text:
            raise RuntimeError("Frontend không trả Vite application shell.")
        require_header(frontend, "X-Content-Type-Options", contains="nosniff")
        require_header(frontend, "X-Frame-Options", contains="DENY")
        require_header(
            frontend,
            "Content-Security-Policy",
            contains="default-src 'self'",
        )

        spa_route = client.get(f"{frontend_origin}/dashboard")
        check_status(spa_route, 200, "Frontend SPA rewrite")
        if 'id="root"' not in spa_route.text:
            raise RuntimeError("SPA rewrite không trả application shell.")

        health = client.get(
            f"{api_base_url}/health",
            headers={"Origin": frontend_origin},
        )
        check_status(health, 200, "Backend health")
        if health.json().get("status") != "ok":
            raise RuntimeError("Backend health payload không hợp lệ.")
        require_header(health, "Cache-Control", contains="no-store")
        require_header(health, "X-Content-Type-Options", contains="nosniff")
        require_header(health, "X-Frame-Options", contains="DENY")
        require_header(
            health,
            "Content-Security-Policy",
            contains="default-src 'none'",
        )
        require_header(
            health,
            "Strict-Transport-Security",
            contains="max-age=31536000",
        )
        request_id = require_header(health, "X-Request-ID")
        require_header(
            health,
            "Access-Control-Expose-Headers",
            contains="X-Request-ID",
        )
        try:
            UUID(request_id)
        except ValueError as error:
            raise RuntimeError("Backend trả X-Request-ID không hợp lệ.") from error

        cors = client.options(
            f"{api_base_url}/health",
            headers={
                "Origin": frontend_origin,
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "authorization",
            },
        )
        check_status(cors, 200, "Production CORS preflight")
        if cors.headers.get("access-control-allow-origin") != frontend_origin:
            raise RuntimeError("Production CORS không cho đúng frontend origin.")

        access_token = sign_in(
            supabase_url=supabase_url,
            publishable_key=publishable_key,
            email=email,
            password=password,
        )
        authorization = {"Authorization": f"Bearer {access_token}"}

        identity = client.get(
            f"{api_base_url}/auth/me",
            headers=authorization,
        )
        check_status(identity, 200, "Backend token verification")
        if identity.json().get("email") != email:
            raise RuntimeError("Backend trả sai email của test user.")

        try:
            upload = client.post(
                f"{api_base_url}/analyses",
                headers=authorization,
                files={
                    "file": (
                        SAMPLE_FILE.name,
                        SAMPLE_FILE.read_bytes(),
                        "text/csv",
                    )
                },
            )
            check_status(upload, 201, "Upload sample production")
            analysis = upload.json()
            analysis_id = str(analysis["id"])
            assert_demo_metrics(analysis)

            listed = client.get(
                f"{api_base_url}/analyses",
                headers=authorization,
                params={"limit": 10, "offset": 0},
            )
            check_status(listed, 200, "History list")
            if analysis_id not in {
                item["id"] for item in listed.json().get("items", [])
            }:
                raise RuntimeError("Analysis mới không xuất hiện trong history.")

            detail = client.get(
                f"{api_base_url}/analyses/{analysis_id}",
                headers=authorization,
            )
            check_status(detail, 200, "Analysis detail")
            assert_demo_metrics(detail.json())

            ai_report = client.post(
                f"{api_base_url}/analyses/{analysis_id}/ai-report",
                headers=authorization,
                timeout=40,
            )
            check_status(ai_report, 200, "AI Report")
            if ai_report.json().get("source") != "ai":
                warning = (ai_report.json().get("warning") or {}).get("code")
                raise RuntimeError(
                    f"AI Report đang fallback, warning={warning or 'unknown'}."
                )

            persisted_report = client.get(
                f"{api_base_url}/analyses/{analysis_id}",
                headers=authorization,
            )
            check_status(persisted_report, 200, "AI report persistence")
            if (
                (persisted_report.json().get("report") or {}).get("source")
                != "ai"
            ):
                raise RuntimeError("AI report không được lưu vào analysis.")
        finally:
            if analysis_id:
                cleanup = client.delete(
                    f"{api_base_url}/analyses/{analysis_id}",
                    headers=authorization,
                )
                check_status(cleanup, 204, "Dọn analysis smoke test")

    print(
        "production_smoke=passed "
        "frontend spa headers cors health auth upload metrics forecast "
        "history ai_persistence cleanup"
    )


if __name__ == "__main__":
    main()
