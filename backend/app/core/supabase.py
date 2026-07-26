from functools import lru_cache

from supabase import Client, create_client
from supabase.lib.client_options import SyncClientOptions

from backend.app.core.config import get_settings
from backend.app.core.errors import AppError


@lru_cache
def get_supabase_client() -> Client:
    settings = get_settings()
    server_key = settings.supabase_server_key

    if not settings.supabase_url or not server_key:
        raise AppError(
            code="SUPABASE_NOT_CONFIGURED",
            message="MarketLens data storage is not configured.",
            status_code=503,
        )

    return create_client(
        settings.supabase_url,
        server_key,
        options=SyncClientOptions(
            auto_refresh_token=False,
            persist_session=False,
        ),
    )
