"""Unit tests for intent classifier service."""

import pytest

from intent_ingress.models.intent import IntentType
from intent_ingress.services.intent_classifier import (
    CONFIDENCE_THRESHOLD,
    classify_intent,
)


class TestClassifyIntent:
    """Tests for classify_intent function."""

    def test_swahili_slang_delivery_request(self):
        """Test Swahili slang 'nataka delivery kwa hao' classifies as DELIVERY_REQUEST."""
        result = classify_intent("nataka delivery kwa hao")

        assert result.intent == IntentType.DELIVERY_REQUEST
        assert result.confidence >= CONFIDENCE_THRESHOLD

    def test_english_delivery_request(self):
        """Test English delivery request is classified correctly."""
        result = classify_intent("I need a delivery to Westlands")

        assert result.intent == IntentType.DELIVERY_REQUEST
        assert result.confidence >= CONFIDENCE_THRESHOLD

    def test_missing_location_returns_empty_geo_entities(self):
        """Test that text without location returns empty geo_entities list."""
        result = classify_intent("I need a delivery please")

        assert result.geo_entities == []

    def test_ambiguous_request_returns_unknown(self):
        """Test ambiguous request returns UNKNOWN intent with low confidence."""
        result = classify_intent("hello there")

        assert result.intent == IntentType.UNKNOWN
        assert result.confidence < CONFIDENCE_THRESHOLD

    def test_confidence_calibration_threshold(self):
        """Test that low confidence scores result in UNKNOWN intent."""
        result = classify_intent("maybe something")

        assert result.intent == IntentType.UNKNOWN
        assert result.confidence < CONFIDENCE_THRESHOLD

    def test_status_query_classification(self):
        """Test status query is classified correctly."""
        result = classify_intent("where is my package?")

        assert result.intent == IntentType.STATUS_QUERY
        assert result.confidence >= CONFIDENCE_THRESHOLD

    def test_swahili_status_query(self):
        """Test Swahili status query 'iko wapi' is classified correctly."""
        result = classify_intent("parcel yangu iko wapi?")

        assert result.intent == IntentType.STATUS_QUERY
        assert result.confidence >= CONFIDENCE_THRESHOLD

    def test_complaint_classification(self):
        """Test complaint is classified correctly."""
        result = classify_intent("I have a complaint about damaged goods")

        assert result.intent == IntentType.COMPLAINT
        assert result.confidence >= CONFIDENCE_THRESHOLD

    def test_booking_classification(self):
        """Test booking request is classified correctly."""
        result = classify_intent("I want to book a pickup")

        assert result.intent == IntentType.BOOKING
        assert result.confidence >= CONFIDENCE_THRESHOLD

    def test_empty_text_returns_unknown(self):
        """Test empty text returns UNKNOWN with zero confidence."""
        result = classify_intent("")

        assert result.intent == IntentType.UNKNOWN
        assert result.confidence == 0.0

    def test_whitespace_only_returns_unknown(self):
        """Test whitespace-only text returns UNKNOWN with zero confidence."""
        result = classify_intent("   ")

        assert result.intent == IntentType.UNKNOWN
        assert result.confidence == 0.0

    def test_geo_entities_extracted_with_intent(self):
        """Test that geo entities are extracted alongside intent classification."""
        result = classify_intent("I need delivery to Nairobi")

        assert result.intent == IntentType.DELIVERY_REQUEST
        assert len(result.geo_entities) == 1
        assert result.geo_entities[0].name == "Nairobi"

    def test_multiple_geo_entities_extracted(self):
        """Test that multiple geo entities are extracted."""
        result = classify_intent("deliver from Westlands to Kilimani")

        assert result.intent == IntentType.DELIVERY_REQUEST
        assert len(result.geo_entities) == 2
        names = {e.name for e in result.geo_entities}
        assert "Westlands" in names
        assert "Kilimani" in names
