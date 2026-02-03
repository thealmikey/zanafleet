"""Geographic entity extraction service."""

import re

from ..models.intent import GeoEntity

KENYAN_PLACES: dict[str, str] = {
    "nairobi": "city",
    "mombasa": "city",
    "kisumu": "city",
    "nakuru": "city",
    "eldoret": "city",
    "thika": "town",
    "malindi": "town",
    "kitale": "town",
    "garissa": "town",
    "nyeri": "town",
    "machakos": "town",
    "meru": "town",
    "lamu": "town",
    "westlands": "area",
    "kilimani": "area",
    "karen": "area",
    "langata": "area",
    "parklands": "area",
    "lavington": "area",
    "kileleshwa": "area",
    "upperhill": "area",
    "south b": "area",
    "south c": "area",
    "eastleigh": "area",
    "kibera": "area",
    "kawangware": "area",
    "ruaka": "area",
    "kiambu": "area",
    "kasarani": "area",
    "embakasi": "area",
    "donholm": "area",
    "umoja": "area",
    "buruburu": "area",
    "industrial area": "area",
    "cbd": "area",
}


def extract_geo_entities(text: str) -> list[GeoEntity]:
    """
    Extract geographic entities from text.

    Args:
        text: Input text to extract locations from

    Returns:
        List of GeoEntity objects for each recognized location
    """
    if not text:
        return []

    text_lower = text.lower()
    entities: list[GeoEntity] = []
    matched_positions: set[tuple[int, int]] = set()

    sorted_places = sorted(KENYAN_PLACES.keys(), key=len, reverse=True)

    for place in sorted_places:
        pattern = re.compile(rf"\b{re.escape(place)}\b", re.IGNORECASE)
        for match in pattern.finditer(text_lower):
            start, end = match.start(), match.end()
            is_overlapping = any(
                not (end <= existing_start or start >= existing_end)
                for existing_start, existing_end in matched_positions
            )
            if not is_overlapping:
                matched_positions.add((start, end))
                original_text = text[start:end]
                entities.append(
                    GeoEntity(
                        name=original_text.title() if original_text.islower() else original_text,
                        type=KENYAN_PLACES[place],
                    )
                )

    return entities
