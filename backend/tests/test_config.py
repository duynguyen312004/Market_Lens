import pytest
from pydantic import ValidationError

from backend.app.core.config import Settings


def test_cors_origins_are_trimmed_deduplicated_and_normalized() -> None:
    settings = Settings(
        _env_file=None,
        frontend_origins=(
            "http://localhost:5173/, http://localhost:5173,"
            "http://127.0.0.1:5173/"
        ),
    )

    assert settings.cors_origins == [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]


def test_backend_never_falls_back_to_publishable_key() -> None:
    settings = Settings(
        _env_file=None,
        supabase_publishable_key="sb_publishable_public",
        supabase_secret_key=None,
    )

    assert settings.supabase_server_key is None


def test_production_rejects_insecure_or_incomplete_configuration() -> None:
    with pytest.raises(ValidationError) as error:
        Settings(
            _env_file=None,
            app_env="production",
            frontend_origins="http://localhost:5173,*",
            supabase_url="http://example.supabase.co",
            supabase_publishable_key="sb_publishable_xxx",
            supabase_secret_key="sb_secret_xxx",
            ai_report_enabled=False,
        )

    message = str(error.value)
    assert "HTTPS origin" in message
    assert "SUPABASE_SECRET_KEY" in message
    assert "AI_REPORT_ENABLED" in message


def test_production_accepts_complete_https_configuration() -> None:
    settings = Settings(
        _env_file=None,
        app_env="production",
        frontend_origins="https://marketlens.example",
        supabase_url="https://project.supabase.co",
        supabase_publishable_key="sb_publishable_real-key",
        supabase_secret_key="sb_secret_real-key",
        ai_report_enabled=True,
        ai_provider="gemini",
        ai_model="gemini-3.5-flash-lite",
        ai_api_base_url=(
            "https://generativelanguage.googleapis.com/v1beta"
        ),
        ai_api_key="test-only-api-key",
    )

    assert settings.is_production is True
    assert settings.ai_provider == "gemini"
    assert settings.cors_origins == ["https://marketlens.example"]


def test_production_still_accepts_optional_openai_provider() -> None:
    settings = Settings(
        _env_file=None,
        app_env="production",
        frontend_origins="https://marketlens.example",
        supabase_url="https://project.supabase.co",
        supabase_publishable_key="sb_publishable_real-key",
        supabase_secret_key="sb_secret_real-key",
        ai_report_enabled=True,
        ai_provider="openai",
        ai_model="gpt-5.6-luna",
        ai_api_base_url="https://api.openai.com/v1",
        ai_api_key="test-only-api-key",
    )

    assert settings.is_production is True
    assert settings.cors_origins == ["https://marketlens.example"]


def test_production_rejects_provider_endpoint_mismatch() -> None:
    with pytest.raises(ValidationError) as error:
        Settings(
            _env_file=None,
            app_env="production",
            frontend_origins="https://marketlens.example",
            supabase_url="https://project.supabase.co",
            supabase_publishable_key="sb_publishable_real-key",
            supabase_secret_key="sb_secret_real-key",
            ai_report_enabled=True,
            ai_provider="gemini",
            ai_model="gemini-3.5-flash-lite",
            ai_api_base_url="https://attacker.example/v1beta",
            ai_api_key="test-only-api-key",
        )

    assert "official AI_PROVIDER endpoint" in str(error.value)


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("max_upload_mb", 0),
        ("max_upload_rows", 0),
        ("max_upload_files", 1),
        ("max_analysis_period_days", 13),
        ("ai_timeout_seconds", 0),
        ("ai_max_output_tokens", 0),
    ],
)
def test_positive_runtime_limits_are_enforced(
    field: str,
    value: int,
) -> None:
    with pytest.raises(ValidationError):
        Settings(_env_file=None, **{field: value})
