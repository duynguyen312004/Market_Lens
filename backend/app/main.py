from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException
from starlette.responses import Response

from backend.app.core.config import get_settings
from backend.app.core.errors import (
    AppError,
    app_error_handler,
    http_error_handler,
    unexpected_error_handler,
    validation_error_handler,
)
from backend.app.core.request_limits import RequestBodyLimitMiddleware
from backend.app.routers.analyses import router as analyses_router
from backend.app.routers.auth import router as auth_router
from backend.app.routers.health import router as health_router
from backend.app.routers.imports import (
    preview_router as imports_preview_router,
    profiles_router as import_profiles_router,
)


settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
    openapi_url=None if settings.is_production else "/openapi.json",
)

app.add_exception_handler(AppError, app_error_handler)
app.add_exception_handler(RequestValidationError, validation_error_handler)
app.add_exception_handler(HTTPException, http_error_handler)
app.add_exception_handler(Exception, unexpected_error_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Accept", "Authorization", "Content-Type"],
    expose_headers=["X-Request-ID"],
    max_age=600,
)
app.add_middleware(
    RequestBodyLimitMiddleware,
    maximum_bytes=(settings.max_upload_mb + 1) * 1024 * 1024,
    protected_paths=frozenset(
        {
            f"{settings.api_v1_prefix}/analyses",
            f"{settings.api_v1_prefix}/analyses/combined",
            f"{settings.api_v1_prefix}/imports/preview",
        }
    ),
)


@app.middleware("http")
async def add_security_headers(
    request: Request,
    call_next,
) -> Response:
    request_id = str(uuid4())
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = (
        "camera=(), geolocation=(), microphone=()"
    )
    if settings.is_production:
        response.headers["Content-Security-Policy"] = (
            "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
        )
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains"
        )
    return response


app.include_router(health_router, prefix=settings.api_v1_prefix)
app.include_router(auth_router, prefix=settings.api_v1_prefix)
app.include_router(analyses_router, prefix=settings.api_v1_prefix)
app.include_router(imports_preview_router, prefix=settings.api_v1_prefix)
app.include_router(import_profiles_router, prefix=settings.api_v1_prefix)
