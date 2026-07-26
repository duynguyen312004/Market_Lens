from collections.abc import Awaitable, Callable
from typing import Any

from starlette.responses import JSONResponse


ASGIApp = Callable[
    [
        dict[str, Any],
        Callable[[], Awaitable[dict[str, Any]]],
        Callable[[dict[str, Any]], Awaitable[None]],
    ],
    Awaitable[None],
]


class RequestBodyTooLarge(Exception):
    pass


class RequestBodyLimitMiddleware:
    def __init__(
        self,
        app: ASGIApp,
        *,
        maximum_bytes: int,
        protected_paths: frozenset[str],
    ) -> None:
        self.app = app
        self.maximum_bytes = maximum_bytes
        self.protected_paths = protected_paths

    async def __call__(
        self,
        scope: dict[str, Any],
        receive: Callable[[], Awaitable[dict[str, Any]]],
        send: Callable[[dict[str, Any]], Awaitable[None]],
    ) -> None:
        if (
            scope.get("type") != "http"
            or scope.get("method") != "POST"
            or scope.get("path") not in self.protected_paths
        ):
            await self.app(scope, receive, send)
            return

        content_length = _content_length(scope)
        if (
            content_length is not None
            and content_length > self.maximum_bytes
        ):
            await self._reject(scope, receive, send)
            return

        received_bytes = 0

        async def limited_receive() -> dict[str, Any]:
            nonlocal received_bytes
            message = await receive()
            if message.get("type") == "http.request":
                received_bytes += len(message.get("body", b""))
                if received_bytes > self.maximum_bytes:
                    raise RequestBodyTooLarge
            return message

        try:
            await self.app(scope, limited_receive, send)
        except RequestBodyTooLarge:
            await self._reject(scope, receive, send)

    async def _reject(
        self,
        scope: dict[str, Any],
        receive: Callable[[], Awaitable[dict[str, Any]]],
        send: Callable[[dict[str, Any]], Awaitable[None]],
    ) -> None:
        response = JSONResponse(
            status_code=413,
            content={
                "error": {
                    "code": "FILE_TOO_LARGE",
                    "message": "The upload request exceeds the allowed size.",
                    "details": {
                        "maximum_request_bytes": self.maximum_bytes,
                    },
                }
            },
        )
        await response(scope, receive, send)


def _content_length(scope: dict[str, Any]) -> int | None:
    for raw_name, raw_value in scope.get("headers", []):
        if raw_name.lower() != b"content-length":
            continue
        try:
            return int(raw_value)
        except (TypeError, ValueError):
            return None
    return None
