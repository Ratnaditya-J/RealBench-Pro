"""Authentication utilities for RealBench Pro."""
import os
import secrets
from typing import Optional

from fastapi import Header, HTTPException, status


class AuthManager:
    """Simple API key authentication manager."""

    def __init__(self):
        """Initialize auth manager."""
        # Load admin API key from environment
        # Generate a secure key if not set
        self.admin_api_key = os.getenv("ADMIN_API_KEY")
        if not self.admin_api_key:
            # Generate a secure random key
            self.admin_api_key = secrets.token_urlsafe(32)
            print("\n⚠️  WARNING: No ADMIN_API_KEY set in environment!")
            print("💡 Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(32))\"")
            print("📝 Then add to your .env file: ADMIN_API_KEY=<your-generated-key>\n")

    def verify_admin_key(self, api_key: Optional[str]) -> bool:
        """Verify admin API key."""
        if not api_key:
            return False
        return secrets.compare_digest(api_key, self.admin_api_key)


# Global auth manager instance
auth_manager = AuthManager()


async def require_admin_auth(
    x_api_key: Optional[str] = Header(None, description="Admin API key for authentication")
) -> str:
    """
    Dependency that requires admin authentication.

    Raises:
        HTTPException: If authentication fails

    Returns:
        The validated API key
    """
    if not x_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-API-Key header",
            headers={"WWW-Authenticate": "ApiKey"},
        )

    if not auth_manager.verify_admin_key(x_api_key):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid API key",
        )

    return x_api_key
