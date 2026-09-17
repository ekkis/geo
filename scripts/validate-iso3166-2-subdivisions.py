#!/usr/bin/env python3
"""Validate ISO 3166-2-backed subdivision domain files against pycountry."""

from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path
from typing import Any

import pycountry

ROOT = Path(__file__).resolve().parents[1]
COUNTRY_DIR = ROOT / "data" / "country"
GB_TOP_LEVEL = {"ENG", "SCT", "WLS", "NIR"}


def slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", value.lower()).strip("_")


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def grouped_by_type(subdivisions: list[Any]) -> dict[str, list[Any]]:
    groups: dict[str, list[Any]] = defaultdict(list)
    for subdivision in subdivisions:
        groups[slug(subdivision.type)].append(subdivision)
    return dict(sorted(groups.items()))


def target_paths(country_code: str, subdivisions: list[Any]) -> list[Path]:
    if country_code == "GB":
        return [COUNTRY_DIR / "GB.country.json", COUNTRY_DIR / "GB.country.division.json"]
    return [COUNTRY_DIR / f"{country_code}.{type_slug}.json" for type_slug in grouped_by_type(subdivisions)]


def generated_iso_file(path: Path, country_code: str) -> bool:
    if path.name == f"{country_code}.json" or not path.name.startswith(f"{country_code}."):
        return False
    if path.name.endswith(".city.json"):
        return False
    try:
        data = load_json(path)
    except Exception:
        return False
    if not isinstance(data, dict) or not data:
        return False
    values = [value for value in data.values() if isinstance(value, dict)]
    if len(values) != len(data):
        return False
    codes = [value.get("iso3166-2") for value in values]
    return bool(codes) and all(isinstance(code, str) and code.startswith(f"{country_code}-") for code in codes)


def validate_record(country_code: str, key: str, record: Any, subdivision: Any, errors: list[str]) -> None:
    if not isinstance(record, dict):
        errors.append(f"{country_code}-{key}: record is not an object")
        return
    for field, value in {
        "iso3166-2": subdivision.code,
        "iso-name": subdivision.name,
        "iso-type": subdivision.type,
    }.items():
        if record.get(field) != value:
            errors.append(f"{country_code}-{key}: {field}={record.get(field)!r}, expected {value!r}")
    parent_code = (getattr(subdivision, "parent_code", None) or "").split("-")[-1]
    if parent_code and record.get("parent-code") != parent_code:
        errors.append(f"{country_code}-{key}: parent-code={record.get('parent-code')!r}, expected {parent_code!r}")


def country_hierarchy(country_code: str) -> Any:
    path = COUNTRY_DIR / f"{country_code}.json"
    if not path.exists():
        return None
    country = load_json(path)
    if not isinstance(country, dict):
        return None
    return country.get("data", {}).get("division-hierarchy")


def main() -> None:
    errors: list[str] = []
    country_codes = sorted({subdivision.code.split("-")[0] for subdivision in pycountry.subdivisions})

    for country_code in country_codes:
        subdivisions = sorted(
            pycountry.subdivisions.get(country_code=country_code) or [],
            key=lambda subdivision: subdivision.code,
        )
        iso = {subdivision.code.split("-")[1]: subdivision for subdivision in subdivisions}
        paths = target_paths(country_code, subdivisions)
        target_names = {path.name for path in paths}

        for path in paths:
            if not path.exists():
                errors.append(f"{country_code}: missing {path.name}")

        for path in COUNTRY_DIR.glob(f"{country_code}.*.json"):
            if path.name not in target_names and generated_iso_file(path, country_code):
                errors.append(f"{country_code}: stale generated ISO subdivision file remains: {path.name}")

        if country_code == "GB":
            if not all(path.exists() for path in paths):
                continue
            top_data = load_json(COUNTRY_DIR / "GB.country.json")
            division_data = load_json(COUNTRY_DIR / "GB.country.division.json")
            if set(top_data) != GB_TOP_LEVEL:
                errors.append(f"GB.country.json keys={sorted(top_data)}, expected {sorted(GB_TOP_LEVEL)}")
            expected_divisions = set(iso) - GB_TOP_LEVEL
            if set(division_data) != expected_divisions:
                errors.append(
                    f"GB.country.division.json key mismatch missing={sorted(expected_divisions - set(division_data))[:10]} extra={sorted(set(division_data) - expected_divisions)[:10]}"
                )
            combined = {**top_data, **division_data}
        else:
            combined: dict[str, Any] = {}
            for type_slug, group in grouped_by_type(subdivisions).items():
                path = COUNTRY_DIR / f"{country_code}.{type_slug}.json"
                if not path.exists():
                    continue
                data = load_json(path)
                expected_keys = {subdivision.code.split("-")[1] for subdivision in group}
                if set(data) != expected_keys:
                    errors.append(
                        f"{path.name}: key mismatch missing={sorted(expected_keys - set(data))[:10]} extra={sorted(set(data) - expected_keys)[:10]}"
                    )
                combined.update(data)

        for key, subdivision in iso.items():
            if key in combined:
                validate_record(country_code, key, combined[key], subdivision, errors)

        hierarchy = country_hierarchy(country_code)
        if not isinstance(hierarchy, list) or not hierarchy:
            errors.append(f"{country_code}: missing data.division-hierarchy")
        else:
            hierarchy_keys = {entry.get("key") for entry in hierarchy if isinstance(entry, dict)}
            expected_hierarchy_keys = {"country", "division", "city"} if country_code == "GB" else set(grouped_by_type(subdivisions))
            if not expected_hierarchy_keys.issubset(hierarchy_keys):
                errors.append(
                    f"{country_code}: hierarchy key mismatch missing={sorted(expected_hierarchy_keys - hierarchy_keys)} extra={sorted(hierarchy_keys - expected_hierarchy_keys)}"
                )
            for entry in hierarchy:
                if not isinstance(entry, dict):
                    errors.append(f"{country_code}: hierarchy entry is not an object")
                    continue
                if "file" in entry:
                    errors.append(f"{country_code}: hierarchy entry {entry.get('key')!r} still contains redundant file key")

    if errors:
        print(f"ISO 3166-2 validation failed with {len(errors)} error(s)")
        for error in errors[:100]:
            print(error)
        raise SystemExit(1)

    total = sum(len(pycountry.subdivisions.get(country_code=country_code) or []) for country_code in country_codes)
    print(f"Validated {len(country_codes)} ISO 3166-2 country hierarchies")
    print(f"Validated {total} subdivision records")


if __name__ == "__main__":
    main()
