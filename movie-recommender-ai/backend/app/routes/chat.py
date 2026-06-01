from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from app.auth import get_current_user
from app.database import db_client
from app.gemini import gemini_client

router = APIRouter(prefix="/chat", tags=["AI Chat Assistant"])

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)

@router.post("/")
async def chat_assistant(request: Request, req: ChatRequest, current_user: dict = Depends(get_current_user)):
    """
    Interfaces with Google Gemini, utilizing the user's watchlist context to recommend films.
    """
    # 1. Fetch user watchlist for Gemini context
    watchlist = db_client.get_watchlist(current_user["uid"])
    
    # 2. Get Gemini response
    response_text = await gemini_client.chat(
        user_message=req.message,
        watchlist=watchlist
    )
    
    return {
        "status": "success",
        "response": response_text
    }
