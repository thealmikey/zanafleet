"""Intent classification service."""

import re

from ..models.intent import IntentResult, IntentType
from .geo_extractor import extract_geo_entities

CONFIDENCE_THRESHOLD = 0.5

DELIVERY_PATTERNS: list[tuple[re.Pattern, float]] = [
    (re.compile(r"\bnataka\s+delivery\b", re.IGNORECASE), 0.9),
    (re.compile(r"\bdeliver(y)?\b", re.IGNORECASE), 0.85),
    (re.compile(r"\bpeleka\b", re.IGNORECASE), 0.8),
    (re.compile(r"\btuma\b", re.IGNORECASE), 0.75),
    (re.compile(r"\bsend\b", re.IGNORECASE), 0.7),
    (re.compile(r"\bship(ping)?\b", re.IGNORECASE), 0.7),
    (re.compile(r"\bkwa\s+hao\b", re.IGNORECASE), 0.6),
]

STATUS_PATTERNS: list[tuple[re.Pattern, float]] = [
    (re.compile(r"\bwhere\s+is\b", re.IGNORECASE), 0.9),
    (re.compile(r"\bstatus\b", re.IGNORECASE), 0.9),
    (re.compile(r"\btrack(ing)?\b", re.IGNORECASE), 0.85),
    (re.compile(r"\biko\s+wapi\b", re.IGNORECASE), 0.9),
    (re.compile(r"\bimefikia?\b", re.IGNORECASE), 0.8),
]

COMPLAINT_PATTERNS: list[tuple[re.Pattern, float]] = [
    (re.compile(r"\bcomplaint?\b", re.IGNORECASE), 0.95),
    (re.compile(r"\bproblem\b", re.IGNORECASE), 0.8),
    (re.compile(r"\bissue\b", re.IGNORECASE), 0.75),
    (re.compile(r"\bbroken\b", re.IGNORECASE), 0.85),
    (re.compile(r"\bdamaged?\b", re.IGNORECASE), 0.85),
    (re.compile(r"\blate\b", re.IGNORECASE), 0.7),
    (re.compile(r"\bdelayed?\b", re.IGNORECASE), 0.75),
    (re.compile(r"\bmissing\b", re.IGNORECASE), 0.8),
    (re.compile(r"\brefund\b", re.IGNORECASE), 0.85),
]

BOOKING_PATTERNS: list[tuple[re.Pattern, float]] = [
    (re.compile(r"\bbook(ing)?\b", re.IGNORECASE), 0.9),
    (re.compile(r"\bschedule\b", re.IGNORECASE), 0.85),
    (re.compile(r"\breserv(e|ation)\b", re.IGNORECASE), 0.85),
    (re.compile(r"\bappoint(ment)?\b", re.IGNORECASE), 0.8),
]


def _match_patterns(
    text: str, patterns: list[tuple[re.Pattern, float]]
) -> float:
    """Match text against patterns and return highest confidence."""
    max_confidence = 0.0
    for pattern, confidence in patterns:
        if pattern.search(text):
            max_confidence = max(max_confidence, confidence)
    return max_confidence


def classify_intent(text: str) -> IntentResult:
    """
    Classify the intent of the given text.

    Args:
        text: Input text to classify

    Returns:
        IntentResult with classified intent, confidence, and extracted entities
    """
    text = text.strip()
    if not text:
        return IntentResult(
            intent=IntentType.UNKNOWN,
            confidence=0.0,
            entities={},
            geo_entities=[],
        )

    scores: dict[IntentType, float] = {
        IntentType.DELIVERY_REQUEST: _match_patterns(text, DELIVERY_PATTERNS),
        IntentType.STATUS_QUERY: _match_patterns(text, STATUS_PATTERNS),
        IntentType.COMPLAINT: _match_patterns(text, COMPLAINT_PATTERNS),
        IntentType.BOOKING: _match_patterns(text, BOOKING_PATTERNS),
    }

    best_intent = max(scores, key=lambda k: scores[k])
    best_confidence = scores[best_intent]

    if best_confidence < CONFIDENCE_THRESHOLD:
        return IntentResult(
            intent=IntentType.UNKNOWN,
            confidence=best_confidence,
            entities={},
            geo_entities=extract_geo_entities(text),
        )

    return IntentResult(
        intent=best_intent,
        confidence=best_confidence,
        entities={},
        geo_entities=extract_geo_entities(text),
    )
