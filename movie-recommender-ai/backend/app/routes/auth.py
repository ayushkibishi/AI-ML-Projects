from fastapi import APIRouter, Depends
from app.auth import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.get("/verify")
async def verify_auth(current_user: dict = Depends(get_current_user)):
    """
    Verifies the user's authorization token and returns user profile data.
    """
    return {
        "status": "success",
        "user": current_user
    }
