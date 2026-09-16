#!/usr/bin/env python3
"""Validate ISO 3166-2-backed subdivision files against pycountry."""

from __future__ import annotations

import json
import re
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


def ordered_types(subdivisions: list[Any]) -> list[str]:
    types: list[str] = []
    for subdivision in subdivisions:
        type_slug = slug(subdivision.type)
        if type_slug not in types:
            types.append(type_slug)
    return types


def target_level(subdivisions: list[Any]) -> str:
    types = ordered_types(subdivisions)
    return "_".join(types) if len(types) <= 3 else "subdivision"


def target_paths(country_code: str, subdivisions: list[Any]) -> list[Path]:
    if country_code == "GB":
        return [COUNTRY_DIR / "GB.country.json", COUNTRY_DIR / "GB.country.division.json"]
    return [COUNTRY_DIR / f"{country_code}.{target_level(subdivisions)}.json"]


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
        for path in paths:
            if not path.exists():
                errors.append(f"{country_code}: missing {path.name}")
        stale = COUNTRY_DIR / f"{country_code}.iso3166-2.json"
        if stale.exists():
            errors.append(f"{country_code}: stale generic ISO filename remains: {stale.name}")

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
            path = paths[0]
            if not path.exists():
                continue
            combined = load_json(path)
            if set(combined) != set(iso):
                errors.append(
                    f"{path.name}: key mismatch missing={sorted(set(iso) - set(combined))[:10]} extra={sorted(set(combined) - set(iso))[:10]}"
                )
                continue

        for key, subdivision in iso.items():
            if key in combined:
                validate_record(country_code, key, combined[key], subdivision, errors)

        hierarchy = country_hierarchy(country_code)
        if not isinstance(hierarchy, list) or not hierarchy:
            errors.append(f"{country_code}: missing data.division-hierarchy")
        else:
            for entry in hierarchy:
                file_name = entry.get("file") if isinstance(entry, dict) else None
                if file_name and not (COUNTRY_DIR / file_name).exists():
                    errors.append(f"{country_code}: hierarchy references missing file {file_name}")

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
