import logging
from typing import Any

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

logger = logging.getLogger(__name__)


class AppError(Exception):
    def __init__(
        self,
        *,
        code: str,
        message: str,
        status_code: int,
        details: Any | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details


async def app_error_handler(
    request: Request,
    error: AppError,
) -> JSONResponse:
    if error.status_code >= 500:
        logger.error(
            "Application error request_id=%s code=%s method=%s path=%s",
            _request_id(request),
            error.code,
            request.method,
            request.url.path,
        )
    return error_response(
        status_code=error.status_code,
        code=error.code,
        message=error.message,
        details=error.details,
    )


async def validation_error_handler(
    _: Request,
    error: RequestValidationError,
) -> JSONResponse:
    details = {
        "errors": [
            {
                "location": [
                    str(part)
                    for part in item.get("loc", ())
                    if part not in {"body"}
                ],
                "reason": item.get("type", "validation_error"),
                "message": item.get("msg", "Invalid value."),
            }
            for item in error.errors()
        ]
    }
    return error_response(
        status_code=422,
        code="REQUEST_VALIDATION_ERROR",
        message="The request contains invalid parameters.",
        details=details,
    )


async def http_error_handler(
    _: Request,
    error: HTTPException,
) -> JSONResponse:
    message = (
        error.detail
        if isinstance(error.detail, str)
        else "The request cannot be processed."
    )
    return error_response(
        status_code=error.status_code,
        code="HTTP_ERROR",
        message=message,
    )


async def unexpected_error_handler(
    request: Request,
    _: Exception,
) -> JSONResponse:
    logger.exception(
        "Unhandled exception request_id=%s method=%s path=%s",
        _request_id(request),
        request.method,
        request.url.path,
    )
    return error_response(
        status_code=500,
        code="INTERNAL_SERVER_ERROR",
        message="The system encountered an unexpected error. Please try again.",
    )


def error_response(
    *,
    status_code: int,
    code: str,
    message: str,
    details: Any | None = None,
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "code": code,
                "message": message,
                "details": details,
            }
        },
    )


def _request_id(request: Request) -> str:
    return getattr(request.state, "request_id", "unavailable")
