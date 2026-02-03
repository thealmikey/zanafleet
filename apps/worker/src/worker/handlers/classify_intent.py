"""Intent classification request handler."""

from fastapi import APIRouter

from ..models.intent import IntentResult
from ..models.request import IntentRequest
from ..services.intent_classifier import classify_intent

router = APIRouter()


@router.post("/classify", response_model=IntentResult)
async def classify_intent_handler(request: IntentRequest) -> IntentResult:
    """
    Classify the intent of the provided text.

    Args:
        request: IntentRequest containing text to classify

    Returns:
        IntentResult with classified intent, confidence, and entities
    """
    return classify_intent(request.text)
