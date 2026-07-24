from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from supabase import Client

from backend.app.core.errors import AppError
from backend.app.core.supabase import get_supabase_client


bearer_scheme = HTTPBearer(auto_error=False)


class AuthenticatedUser(BaseModel):
    id: str
    email: str | None = None


def get_access_token(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(bearer_scheme),
    ],
) -> str:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise AppError(
            code="UNAUTHORIZED",
            message="Yêu cầu access token hợp lệ.",
            status_code=401,
        )

    return credentials.credentials


def get_current_user(
    access_token: Annotated[str, Depends(get_access_token)],
    supabase: Annotated[Client, Depends(get_supabase_client)],
) -> AuthenticatedUser:
    try:
        response = supabase.auth.get_user(access_token)
        user = response.user if response else None
    except Exception as error:
        raise AppError(
            code="UNAUTHORIZED",
            message="Access token không hợp lệ hoặc đã hết hạn.",
            status_code=401,
        ) from error

    if user is None:
        raise AppError(
            code="UNAUTHORIZED",
            message="Không tìm thấy người dùng cho access token này.",
            status_code=401,
        )

    return AuthenticatedUser(id=str(user.id), email=user.email)
