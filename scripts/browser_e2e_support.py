"""Disposable Supabase user support shared by browser E2E runners."""

from __future__ import annotations

import os
import secrets
from contextlib import contextmanager
from dataclasses import dataclass
from typing import Iterator, cast

from supabase import Client, create_client
from supabase.lib.client_options import SyncClientOptions

from backend.app.core.config import Settings
from backend.app.core.supabase import get_supabase_client


@dataclass(frozen=True)
class BrowserE2EUser:
    email: str
    new_password: str
    password: str
    settings: Settings
    user_id: str


@contextmanager
def temporary_browser_user(label: str) -> Iterator[BrowserE2EUser]:
    settings = Settings()
    _require_supabase(settings)
    admin = get_supabase_client()
    user_id: str | None = None
    email = f"marketlens-browser-e2e-{secrets.token_hex(8)}@example.com"
    password = f"Ml!{secrets.token_hex(12)}aA7"
    new_password = f"Ml!{secrets.token_hex(12)}zZ9"

    try:
        created = admin.auth.admin.create_user(
            {
                "email": email,
                "password": password,
                "email_confirm": True,
                "user_metadata": {
                    "display_name": "MarketLens E2E Shop",
                },
            }
        )
        if created.user is None:
            raise RuntimeError("Supabase did not return the temporary user.")
        user_id = str(created.user.id)
        yield BrowserE2EUser(
            email=email,
            new_password=new_password,
            password=password,
            settings=settings,
            user_id=user_id,
        )
    finally:
        if user_id is not None:
            _cleanup_user(admin, user_id)
            print(f"{label} cleanup: PASS.")


def browser_environment(user: BrowserE2EUser) -> dict[str, str]:
    environment = os.environ.copy()
    environment.update(
        {
            "E2E_TEST_EMAIL": user.email,
            "E2E_TEST_PASSWORD": user.password,
            "E2E_TEST_NEW_PASSWORD": user.new_password,
            "VITE_API_BASE_URL": "http://127.0.0.1:8000/api/v1",
            "VITE_SUPABASE_URL": cast(str, user.settings.supabase_url),
            "VITE_SUPABASE_PUBLISHABLE_KEY": cast(
                str,
                user.settings.supabase_publishable_key,
            ),
            "AI_REPORT_ENABLED": "false",
        }
    )
    return environment


def user_access_token(user: BrowserE2EUser) -> str:
    auth_client = create_client(
        cast(str, user.settings.supabase_url),
        cast(str, user.settings.supabase_publishable_key),
        options=SyncClientOptions(
            auto_refresh_token=False,
            persist_session=False,
        ),
    )
    session = auth_client.auth.sign_in_with_password(
        {
            "email": user.email,
            "password": user.password,
        }
    ).session
    if session is None:
        raise RuntimeError("Supabase did not return an E2E access token.")
    return session.access_token


def _cleanup_user(admin: Client, user_id: str) -> None:
    admin.table("analyses").delete().eq(
        "user_id",
        user_id,
    ).execute()
    admin.auth.admin.delete_user(user_id)
    remaining = (
        admin.table("analyses")
        .select("id")
        .eq("user_id", user_id)
        .execute()
    )
    if remaining.data:
        raise RuntimeError("Temporary E2E analyses were not cleaned up.")


def _require_supabase(settings: Settings) -> None:
    missing = [
        name
        for name, value in (
            ("SUPABASE_URL", settings.supabase_url),
            ("SUPABASE_PUBLISHABLE_KEY", settings.supabase_publishable_key),
            ("SUPABASE_SECRET_KEY", settings.supabase_secret_key),
        )
        if not value
    ]
    if missing:
        raise SystemExit(
            "Browser E2E cannot run because backend/.env is missing: "
            + ", ".join(missing)
        )
