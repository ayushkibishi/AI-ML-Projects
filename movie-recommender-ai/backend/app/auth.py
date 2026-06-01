from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth
from app.config import settings
from app.database import db_client

security = HTTPBearer(auto_error=False)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    Dependency that extracts the Bearer token from the Authorization header and verifies it.
    If Firebase is not configured, it falls back to a mock authenticator.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization Header",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    token = credentials.credentials
    
    if db_client.use_firebase:
        try:
            # Verify the Firebase ID token
            decoded_token = auth.verify_id_token(token)
            user_data = {
                "uid": decoded_token["uid"],
                "email": decoded_token.get("email", ""),
                "name": decoded_token.get("name", "CineMate User")
            }
            # Proactively save profile
            db_client.upsert_user_profile(user_data["uid"], {
                "email": user_data["email"],
                "name": user_data["name"]
            })
            return user_data
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid Firebase Token: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"},
            )
    else:
        # --- Mock Authenticator Fallback ---
        # We accept any token and treat it as the user's UID.
        # E.g. "mock_user_123" -> uid is "mock_user_123"
        uid = token.replace("mock-token-", "").strip()
        if not uid:
            uid = "guest_user"
            
        user_data = {
            "uid": uid,
            "email": f"{uid}@example.com",
            "name": f"{uid.replace('_', ' ').title()}"
        }
        
        # Save to mock database
        db_client.upsert_user_profile(uid, {
            "email": user_data["email"],
            "name": user_data["name"]
        })
        
        return user_data
