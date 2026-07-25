from functools import lru_cache
from pathlib import Path
from urllib.parse import urlparse

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[2]
AI_PROVIDER_BASE_URLS = {
    "gemini": "https://generativelanguage.googleapis.com/v1beta",
    "openai": "https://api.openai.com/v1",
}


class Settings(BaseSettings):
    app_env: str = "development"
    app_name: str = "MarketLens API"
    api_v1_prefix: str = "/api/v1"
    frontend_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    supabase_url: str | None = None
    supabase_publishable_key: str | None = None
    supabase_secret_key: str | None = None
    max_upload_mb: int = 10
    max_upload_rows: int = 50_000
    max_upload_files: int = 10
    max_analysis_period_days: int = 1_826
    ai_report_enabled: bool = False
    ai_provider: str = "gemini"
    ai_model: str | None = "gemini-3.5-flash-lite"
    ai_api_base_url: str = AI_PROVIDER_BASE_URLS["gemini"]
    ai_api_key: str | None = None
    ai_timeout_seconds: float = 20.0
    ai_max_output_tokens: int = 2_400

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins(self) -> list[str]:
        return list(
            dict.fromkeys(
                origin.strip().rstrip("/")
                for origin in self.frontend_origins.split(",")
                if origin.strip()
            )
        )

    @property
    def supabase_server_key(self) -> str | None:
        return self.supabase_secret_key

    @property
    def is_production(self) -> bool:
        return self.app_env.strip().lower() == "production"

    @model_validator(mode="after")
    def validate_runtime_configuration(self) -> "Settings":
        if self.max_upload_mb <= 0:
            raise ValueError("MAX_UPLOAD_MB must be greater than 0.")
        if self.max_upload_rows <= 0:
            raise ValueError("MAX_UPLOAD_ROWS must be greater than 0.")
        if self.max_upload_files < 2:
            raise ValueError("MAX_UPLOAD_FILES must be at least 2.")
        if self.max_analysis_period_days < 14:
            raise ValueError(
                "MAX_ANALYSIS_PERIOD_DAYS must be at least 14."
            )
        if self.ai_timeout_seconds <= 0:
            raise ValueError("AI_TIMEOUT_SECONDS must be greater than 0.")
        if self.ai_max_output_tokens <= 0:
            raise ValueError("AI_MAX_OUTPUT_TOKENS must be greater than 0.")

        if not self.is_production:
            return self

        errors: list[str] = []
        if not _is_https_url(self.supabase_url):
            errors.append("SUPABASE_URL must be an HTTPS URL.")
        if not _is_real_secret(self.supabase_secret_key):
            errors.append("SUPABASE_SECRET_KEY is invalid for production.")
        if not _is_real_publishable_key(self.supabase_publishable_key):
            errors.append("SUPABASE_PUBLISHABLE_KEY is invalid for production.")

        origins = self.cors_origins
        if not origins:
            errors.append("FRONTEND_ORIGINS cannot be empty in production.")
        for origin in origins:
            parsed = urlparse(origin)
            if (
                parsed.scheme != "https"
                or not parsed.netloc
                or parsed.path not in ("", "/")
                or parsed.query
                or parsed.fragment
                or parsed.hostname in {"localhost", "127.0.0.1"}
                or "*" in origin
            ):
                errors.append(
                    "FRONTEND_ORIGINS must contain exact HTTPS origins in "
                    "production, without paths, wildcards, or localhost."
                )
                break

        if not self.ai_report_enabled:
            errors.append("AI_REPORT_ENABLED must be enabled for feature-complete V1.")
        provider = self.ai_provider.strip().lower()
        if provider not in AI_PROVIDER_BASE_URLS:
            errors.append(
                "AI_PROVIDER must be gemini or openai in production."
            )
        if not self.ai_model or not self.ai_model.strip():
            errors.append("AI_MODEL is not configured for production.")
        if not self.ai_api_key or not self.ai_api_key.strip():
            errors.append("AI_API_KEY is not configured for production.")
        expected_base_url = AI_PROVIDER_BASE_URLS.get(provider)
        if (
            not _is_https_url(self.ai_api_base_url)
            or not expected_base_url
            or self.ai_api_base_url.strip().rstrip("/")
            != expected_base_url
        ):
            errors.append(
                "AI_API_BASE_URL must match the official AI_PROVIDER endpoint "
                "in production."
            )

        if errors:
            raise ValueError(" ".join(errors))
        return self


def _is_https_url(value: str | None) -> bool:
    if not value:
        return False
    parsed = urlparse(value.strip())
    return parsed.scheme == "https" and bool(parsed.netloc)


def _is_real_secret(value: str | None) -> bool:
    return bool(value and value.startswith("sb_secret_") and "xxx" not in value)


def _is_real_publishable_key(value: str | None) -> bool:
    return bool(
        value
        and value.startswith("sb_publishable_")
        and "xxx" not in value
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
