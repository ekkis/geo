#!/usr/bin/env python3
"""Validate Geo's VowLabs Science/Geography delegated-service package."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "ontology" / "vowlabs" / "Science" / "Geography"
COUNTRY_DIR = ROOT / "data" / "country"
PREFIX = "S:G"
COUNTRY_DEFINITION = "S:G:CO"
SUBDIVISION_DEFINITION = "S:G:SD"
CODE_RE = re.compile(r"^[A-Z][A-Z0-9]*(?::[A-Z][A-Z0-9]*)*$")
PATH_RE = re.compile(r"^(?!/)(?!.*(?:^|/)[.]{1,2}(?:/|$))[A-Za-z0-9_-]+(?:[.][A-Za-z0-9_-]+)*(?:/[A-Za-z0-9_-]+(?:[.][A-Za-z0-9_-]+)*)*$")


def load(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def fail(errors: list[str], message: str) -> None:
    errors.append(message)


def validate_manifest(errors: list[str]) -> dict[str, Any]:
    path = OUT_DIR / "manifest.json"
    manifest = load(path)
    required = ["formatVersion", "repository", "prefix", "version", "license", "readme", "requires", "datasets", "delivery"]
    for key in required:
        if key not in manifest:
            fail(errors, f"manifest missing {key}")
    if manifest.get("formatVersion") != 1:
        fail(errors, "manifest formatVersion must be 1")
    if manifest.get("prefix") != PREFIX:
        fail(errors, f"manifest prefix must be {PREFIX}")
    if not str(manifest.get("repository", "")).startswith("https://"):
        fail(errors, "manifest repository must be https URL")
    if not PATH_RE.match(str(manifest.get("readme", ""))) or not str(manifest.get("readme", "")).endswith("README.md"):
        fail(errors, "manifest readme must be relative README.md path")
    delivery = manifest.get("delivery", {})
    if delivery.get("mode") != "service":
        fail(errors, "manifest delivery mode must be service")
    service_url = str(delivery.get("url", ""))
    if not re.match(r"^https://[^/@?#\s]+(?:/[^?#\s]*)?/$", service_url):
        fail(errors, "manifest service url must be public HTTPS base URL ending in /")
    requires = manifest.get("requires", {})
    if not re.match(r"^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$", str(requires.get("ontologyVersion", ""))):
        fail(errors, "requires.ontologyVersion must be semver")
    for code in requires.get("codes", []):
        if not CODE_RE.match(code):
            fail(errors, f"invalid requires code {code}")
    for item in manifest.get("datasets", []):
        if item.get("id") not in {"countries", "states"}:
            fail(errors, f"unexpected dataset id {item.get('id')}")
        if item.get("id") == "countries" and item.get("definitionCode") != COUNTRY_DEFINITION:
            fail(errors, "countries definitionCode mismatch")
        if item.get("id") == "states" and item.get("definitionCode") != SUBDIVISION_DEFINITION:
            fail(errors, "states definitionCode mismatch")
        if "path" in item:
            fail(errors, f"service dataset {item.get('id')} must not declare snapshot path")
    return manifest


def validate_definition_tree(errors: list[str]) -> None:
    required = [
        "definitions/index.json",
        "definitions/README.md",
        "definitions/Country/index.json",
        "definitions/Country/README.md",
        "definitions/Subdivision/index.json",
        "definitions/Subdivision/README.md",
        "definitions/Address/index.json",
        "definitions/Address/US/index.json",
    ]
    for rel in required:
        if not (OUT_DIR / rel).exists():
            fail(errors, f"missing definition artifact {rel}")
    root = load(OUT_DIR / "definitions" / "index.json")
    children = root.get("Children", {})
    for code in ["AD", "CO", "SD"]:
        if code not in children:
            fail(errors, f"root definition missing child {code}")
    for json_path in (OUT_DIR / "definitions").rglob("*.json"):
        data = load(json_path)
        if "Name" not in data:
            fail(errors, f"{json_path.relative_to(OUT_DIR)} missing Name")


def validate_dataset(path: Path, dataset_id: str, definition_code: str, errors: list[str]) -> list[dict[str, Any]]:
    data = load(path)
    if data.get("id") != dataset_id:
        fail(errors, f"{path}: id mismatch")
    if data.get("definitionCode") != definition_code:
        fail(errors, f"{path}: definitionCode mismatch")
    if not isinstance(data.get("version"), int) or data.get("version") < 1:
        fail(errors, f"{path}: version must be positive integer")
    records = data.get("records")
    if not isinstance(records, list):
        fail(errors, f"{path}: records must be array")
        return []
    seen_ids: set[str] = set()
    for idx, record in enumerate(records):
        if not isinstance(record, dict):
            fail(errors, f"{path}: record {idx} is not object")
            continue
        record_id = record.get("id")
        if not record_id:
            fail(errors, f"{path}: record {idx} missing id")
        elif record_id in seen_ids:
            fail(errors, f"{path}: duplicate id {record_id}")
        else:
            seen_ids.add(record_id)
        if not record.get("name"):
            fail(errors, f"{path}: record {record_id or idx} missing name")
        if record.get("definitionCode") != definition_code:
            fail(errors, f"{path}: record {record_id or idx} definitionCode mismatch")
    return records


def validate_data(errors: list[str]) -> None:
    countries = validate_dataset(OUT_DIR / "data" / "countries" / "index.json", "countries", COUNTRY_DEFINITION, errors)
    states = validate_dataset(OUT_DIR / "data" / "states" / "index.json", "states", SUBDIVISION_DEFINITION, errors)
    country_files = list(COUNTRY_DIR.glob("[A-Z][A-Z].json"))
    if len(countries) != len(country_files):
        fail(errors, f"country count mismatch: {len(countries)} != {len(country_files)}")
    country_ids = {record.get("id") for record in countries}
    for record in countries:
        iso2 = record.get("iso2")
        if record.get("id") != f"G:CO:{iso2}":
            fail(errors, f"country {record.get('id')} id must equal G:CO:{iso2}")
    for record in states:
        country = record.get("country")
        if country not in country_ids:
            fail(errors, f"state {record.get('id')} references missing country {country}")
        iso_code = record.get("iso3166-2")
        if iso_code and record.get("id") != iso_code:
            fail(errors, f"state {record.get('id')} id should equal iso3166-2 {iso_code}")
    if len(states) != 5046:
        fail(errors, f"states count mismatch: {len(states)} != 5046")


def main() -> None:
    errors: list[str] = []
    validate_manifest(errors)
    validate_definition_tree(errors)
    validate_data(errors)
    if errors:
        print(f"VowLabs contribution validation failed with {len(errors)} error(s)")
        for error in errors[:100]:
            print(error)
        raise SystemExit(1)
    print("Validated VowLabs Science/Geography delegated-service package")
    print("Country: 250")
    print("Subdivision records: 5046")


if __name__ == "__main__":
    main()
