"""Unit tests for geo extractor service."""

import pytest

from worker.services.geo_extractor import extract_geo_entities


class TestExtractGeoEntities:
    """Tests for extract_geo_entities function."""

    def test_extracts_nairobi(self):
        """Test extraction of Nairobi city."""
        result = extract_geo_entities("Send package to Nairobi")

        assert len(result) == 1
        assert result[0].name == "Nairobi"
        assert result[0].type == "city"

    def test_extracts_westlands_area(self):
        """Test extraction of Westlands area."""
        result = extract_geo_entities("Delivery to Westlands please")

        assert len(result) == 1
        assert result[0].name == "Westlands"
        assert result[0].type == "area"

    def test_extracts_multiple_places(self):
        """Test extraction of multiple Kenyan places."""
        result = extract_geo_entities("From Mombasa to Nairobi via Nakuru")

        assert len(result) == 3
        names = {e.name for e in result}
        assert "Mombasa" in names
        assert "Nairobi" in names
        assert "Nakuru" in names

    def test_extracts_lowercase_places(self):
        """Test extraction works with lowercase input."""
        result = extract_geo_entities("send to nairobi")

        assert len(result) == 1
        assert result[0].name == "Nairobi"

    def test_extracts_uppercase_places(self):
        """Test extraction works with uppercase input."""
        result = extract_geo_entities("deliver to WESTLANDS")

        assert len(result) == 1
        assert result[0].name == "WESTLANDS"

    def test_handles_text_with_no_location(self):
        """Test that text without locations returns empty list."""
        result = extract_geo_entities("I need a delivery please")

        assert result == []

    def test_handles_empty_text(self):
        """Test that empty text returns empty list."""
        result = extract_geo_entities("")

        assert result == []

    def test_handles_none_like_empty(self):
        """Test that whitespace-only text returns empty list."""
        result = extract_geo_entities("   ")

        assert result == []

    def test_extracts_south_b_area(self):
        """Test extraction of 'South B' multi-word area."""
        result = extract_geo_entities("Package to South B")

        assert len(result) == 1
        assert result[0].name == "South B"
        assert result[0].type == "area"

    def test_extracts_industrial_area(self):
        """Test extraction of 'Industrial Area' multi-word place."""
        result = extract_geo_entities("Pickup from Industrial Area")

        assert len(result) == 1
        assert result[0].name == "Industrial Area"
        assert result[0].type == "area"

    def test_extracts_kilimani(self):
        """Test extraction of Kilimani area."""
        result = extract_geo_entities("Meeting in Kilimani")

        assert len(result) == 1
        assert result[0].name == "Kilimani"
        assert result[0].type == "area"

    def test_extracts_karen(self):
        """Test extraction of Karen area."""
        result = extract_geo_entities("Delivery to Karen tomorrow")

        assert len(result) == 1
        assert result[0].name == "Karen"
        assert result[0].type == "area"

    def test_no_duplicate_extractions(self):
        """Test that same place mentioned twice is not duplicated."""
        result = extract_geo_entities("From Nairobi to Nairobi")

        assert len(result) == 2
        assert all(e.name == "Nairobi" for e in result)

    def test_preserves_original_case_in_name(self):
        """Test that extracted name preserves case from input for mixed case."""
        result = extract_geo_entities("Going to NaIrObI")

        assert len(result) == 1
        assert result[0].name == "NaIrObI"

    def test_extracts_cbd(self):
        """Test extraction of CBD area."""
        result = extract_geo_entities("Office in CBD")

        assert len(result) == 1
        assert result[0].name == "CBD"
        assert result[0].type == "area"
