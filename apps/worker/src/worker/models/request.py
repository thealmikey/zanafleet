"""Request models for intent classification API."""

from pydantic import BaseModel, Field


class IntentRequest(BaseModel):
    """Request model for intent classification endpoint."""

    text: str = Field(..., min_length=1, description="Text to classify")
