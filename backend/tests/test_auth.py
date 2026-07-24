from types import SimpleNamespace

from fastapi.testclient import TestClient

from backend.app.core.supabase import get_supabase_client
from backend.app.main import app


client = TestClient(app)


class FakeAuth:
    def __init__(self, *, should_fail: bool = False) -> None:
        self.should_fail = should_fail

    def get_user(self, token: str) -> SimpleNamespace:
        if self.should_fail or token != "valid-token":
            raise ValueError("invalid token")

        return SimpleNamespace(
            user=SimpleNamespace(
                id="7b18fa02-e470-41ec-b72e-a53bd955d9a0",
                email="shop@example.com",
            )
        )


class FakeSupabase:
    def __init__(self, *, should_fail: bool = False) -> None:
        self.auth = FakeAuth(should_fail=should_fail)


def test_auth_me_requires_bearer_token() -> None:
    response = client.get("/api/v1/auth/me")

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


def test_auth_me_returns_verified_user() -> None:
    app.dependency_overrides[get_supabase_client] = lambda: FakeSupabase()

    try:
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer valid-token"},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {
        "id": "7b18fa02-e470-41ec-b72e-a53bd955d9a0",
        "email": "shop@example.com",
    }


def test_auth_me_rejects_invalid_token() -> None:
    app.dependency_overrides[get_supabase_client] = lambda: FakeSupabase(
        should_fail=True
    )

    try:
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer expired-token"},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"
