"""Intent classification models."""

from enum import Enum

from pydantic import BaseModel, Field


class IntentType(str, Enum):
    """Supported intent types for classification."""

    DELIVERY_REQUEST = "DELIVERY_REQUEST"
    STATUS_QUERY = "STATUS_QUERY"
    COMPLAINT = "COMPLAINT"
    BOOKING = "BOOKING"
    UNKNOWN = "UNKNOWN"


class GeoEntity(BaseModel):
    """Geographic entity extracted from text."""

    name: str = Field(..., description="Name of the location")
    type: str = Field(default="place", description="Type of location (city, area, etc.)")


class IntentResult(BaseModel):
    """Result of intent classification."""

    intent: IntentType = Field(..., description="Classified intent type")
    confidence: float = Field(
        ..., ge=0.0, le=1.0, description="Classification confidence score"
    )
    entities: dict = Field(
        default_factory=dict, description="Extracted entities from text"
    )
    geo_entities: list[GeoEntity] = Field(
        default_factory=list, description="Geographic entities extracted from text"
    )
