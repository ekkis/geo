#!/usr/bin/env python3
"""Generate ISO 3166-2-backed subdivision files using political names.

Files are named for the ISO subdivision type when practical, e.g.:

- AD.parish.json
- CA.province_territory.json
- US.state_district_outlying_area.json

When ISO defines more than three subdivision types for one country, the file is
named {ISO2}.subdivision.json to avoid unusably long filenames; every record
still preserves its exact `iso-type`.

Existing city/locality files are left untouched. Country records get a
`data.division-hierarchy` entry pointing to the canonical ISO 3166-2 file.
GB keeps the project-specific two-level hierarchy requested by the user:
GB.country.json for constituent countries and GB.country.division.json for the
lower ISO subdivisions.
"""

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


def display_name(name: str) -> str:
    return re.sub(r"\s*\[[^\]]*\]", "", name).strip() or name


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


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


def subdivision_record(subdivision: Any) -> dict[str, Any]:
    parent_code = (getattr(subdivision, "parent_code", None) or "").split("-")[-1]
    record: dict[str, Any] = {
        "name": display_name(subdivision.name),
        "type": subdivision.type,
        "iso3166-2": subdivision.code,
        "iso-name": subdivision.name,
        "iso-type": subdivision.type,
    }
    if parent_code:
        record["parent-code"] = parent_code
    return record


def hierarchy_entry(country_code: str, subdivisions: list[Any]) -> dict[str, Any]:
    level = target_level(subdivisions)
    labels = [type_slug.replace("_", " ").title() for type_slug in ordered_types(subdivisions)]
    return {
        "key": level,
        "label": " / ".join(labels),
        "standard": "ISO 3166-2",
        "file": f"{country_code}.{level}.json",
        "code-field": "iso3166-2",
        "type-field": "iso-type",
        "parent-field": "parent-code",
    }


def set_country_hierarchy(country_code: str, hierarchy: list[dict[str, Any]]) -> None:
    path = COUNTRY_DIR / f"{country_code}.json"
    if not path.exists():
        return
    country = load_json(path)
    if not isinstance(country, dict):
        return
    country.setdefault("data", {})["division-hierarchy"] = hierarchy
    write_json(path, country)


def remove_old_iso_file(country_code: str) -> None:
    old_path = COUNTRY_DIR / f"{country_code}.iso3166-2.json"
    if old_path.exists():
        old_path.unlink()


def generate_regular_country(country_code: str, subdivisions: list[Any]) -> tuple[str, int]:
    level = target_level(subdivisions)
    path = COUNTRY_DIR / f"{country_code}.{level}.json"
    data = {
        subdivision.code.split("-")[1]: subdivision_record(subdivision)
        for subdivision in subdivisions
    }
    write_json(path, dict(sorted(data.items())))
    remove_old_iso_file(country_code)
    set_country_hierarchy(country_code, [hierarchy_entry(country_code, subdivisions)])
    return path.name, len(data)


def generate_gb(subdivisions: list[Any]) -> tuple[list[str], int]:
    countries: dict[str, Any] = {}
    divisions: dict[str, Any] = {}

    for subdivision in subdivisions:
        suffix = subdivision.code.split("-")[1]
        record = subdivision_record(subdivision)
        if suffix in GB_TOP_LEVEL:
            if suffix == "NIR":
                # Project-facing hierarchy treats all four as constituent countries;
                # ISO's exact term remains in iso-type.
                record["type"] = "Country"
            record["division-codes"] = []
            countries[suffix] = record
        else:
            parent_code = record.get("parent-code")
            record["country-code"] = parent_code
            divisions[suffix] = record

    for suffix, record in divisions.items():
        parent_code = record.get("parent-code")
        if parent_code in countries:
            countries[parent_code]["division-codes"].append(suffix)
    for record in countries.values():
        record["division-codes"] = sorted(record["division-codes"])

    write_json(COUNTRY_DIR / "GB.country.json", dict(sorted(countries.items())))
    write_json(COUNTRY_DIR / "GB.country.division.json", dict(sorted(divisions.items())))
    remove_old_iso_file("GB")
    set_country_hierarchy(
        "GB",
        [
            {
                "key": "country",
                "label": "Constituent country",
                "standard": "ISO 3166-2",
                "file": "GB.country.json",
                "code-field": "iso3166-2",
                "type-field": "iso-type",
            },
            {
                "key": "division",
                "label": "Administrative division / local authority",
                "standard": "ISO 3166-2",
                "parent": "country",
                "file": "GB.country.division.json",
                "code-field": "iso3166-2",
                "type-field": "iso-type",
                "parent-field": "parent-code",
            },
            {
                "key": "city",
                "label": "City / locality",
                "parent": "division",
                "file": "GB.country.division.city.json",
            },
        ],
    )
    return ["GB.country.json", "GB.country.division.json"], len(countries) + len(divisions)


def main() -> None:
    country_codes = sorted({subdivision.code.split("-")[0] for subdivision in pycountry.subdivisions})
    file_count = 0
    record_count = 0

    for country_code in country_codes:
        subdivisions = sorted(
            pycountry.subdivisions.get(country_code=country_code) or [],
            key=lambda subdivision: subdivision.code,
        )
        if country_code == "GB":
            files, count = generate_gb(subdivisions)
            file_count += len(files)
        else:
            _, count = generate_regular_country(country_code, subdivisions)
            file_count += 1
        record_count += count

    print(f"Wrote {file_count} ISO 3166-2-backed subdivision files")
    print(f"Included {record_count} subdivision records")


if __name__ == "__main__":
    main()
