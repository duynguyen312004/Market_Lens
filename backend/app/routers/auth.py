from typing import Annotated

from fastapi import APIRouter, Depends

from backend.app.core.auth import AuthenticatedUser, get_current_user


router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", response_model=AuthenticatedUser)
async def get_authenticated_user(
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
) -> AuthenticatedUser:
    return current_user
