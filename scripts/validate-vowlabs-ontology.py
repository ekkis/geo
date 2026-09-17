#!/usr/bin/env python3
"""Validate the VowLabs Science:Geography ontology export."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
ONTOLOGY_DIR = ROOT / "ontology" / "vowlabs" / "Science" / "Geography"
DATA_DIR = ONTOLOGY_DIR / "data"
EXPECTED_ONTOLOGY = "VowLabs:Science:Geography"


def load(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def fail(errors: list[str], message: str) -> None:
    errors.append(message)


def validate_dataset(path: Path, entity: str, errors: list[str]) -> int:
    data = load(path)
    if data.get("ontology") != EXPECTED_ONTOLOGY:
        fail(errors, f"{path}: ontology mismatch")
    if data.get("entity") != entity:
        fail(errors, f"{path}: entity mismatch")
    records = data.get("records")
    if not isinstance(records, dict):
        fail(errors, f"{path}: records must be object")
        return 0
    if data.get("count") != len(records):
        fail(errors, f"{path}: count {data.get('count')} != {len(records)}")
    for key, record in records.items():
        if not isinstance(record, dict):
            fail(errors, f"{path}: {key} is not object")
            continue
        if record.get("@type") != entity:
            fail(errors, f"{path}: {key} @type mismatch")
        if "id" not in record:
            fail(errors, f"{path}: {key} missing id")
        if "source" not in record:
            fail(errors, f"{path}: {key} missing source")
    return len(records)


def main() -> None:
    errors: list[str] = []
    index = load(ONTOLOGY_DIR / "index.json")
    definitions = load(ONTOLOGY_DIR / "definitions.json")

    if index.get("ontology") != EXPECTED_ONTOLOGY:
        fail(errors, "index ontology mismatch")
    if definitions.get("ontology", {}).get("id") != EXPECTED_ONTOLOGY:
        fail(errors, "definitions ontology id mismatch")

    entities = definitions.get("entities", {})
    for entity in ["GeographicEntity", "Country", "PoliticalSubdivision", "DivisionHierarchyLevel", "AddressFormat"]:
        if entity not in entities:
            fail(errors, f"definitions missing entity {entity}")

    counts = {
        "Country": validate_dataset(DATA_DIR / "countries.json", "Country", errors),
        "PoliticalSubdivision": validate_dataset(DATA_DIR / "political-subdivisions.json", "PoliticalSubdivision", errors),
        "AddressFormat": validate_dataset(DATA_DIR / "address-formats.json", "AddressFormat", errors),
    }

    index_data = index.get("data", [])
    index_counts = {item.get("entity"): item.get("count") for item in index_data if isinstance(item, dict)}
    for entity, count in counts.items():
        if index_counts.get(entity) != count:
            fail(errors, f"index count mismatch for {entity}: {index_counts.get(entity)} != {count}")

    # Cross-check expected repository cardinalities for the current export scope.
    country_files = list((ROOT / "data" / "country").glob("[A-Z][A-Z].json"))
    if counts["Country"] != len(country_files):
        fail(errors, f"country count mismatch: {counts['Country']} != {len(country_files)}")

    if errors:
        print(f"VowLabs ontology validation failed with {len(errors)} error(s)")
        for error in errors[:100]:
            print(error)
        raise SystemExit(1)

    print("Validated VowLabs Science:Geography ontology export")
    for entity, count in counts.items():
        print(f"{entity}: {count}")


if __name__ == "__main__":
    main()
