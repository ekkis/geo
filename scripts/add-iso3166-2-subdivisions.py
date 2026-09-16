#!/usr/bin/env python3
"""Generate ISO 3166-2-backed subdivision files using political domain names.

Files are named for each ISO subdivision domain, e.g.:

- AD.parish.json
- CA.province.json and CA.territory.json
- US.state.json, US.outlying_area.json, and US.district.json

Each file uses the ISO subdivision suffix as the key and preserves exact ISO
audit fields. Country records get a `data.division-hierarchy` array pointing to
the political subdivision files.

GB keeps the project-specific hierarchy requested by the user: GB.country.json
for constituent countries and GB.country.division.json for lower ISO
subdivisions, both with ISO audit fields.
"""

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


def display_name(name: str) -> str:
    return re.sub(r"\s*\[[^\]]*\]", "", name).strip() or name


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


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


def grouped_by_type(subdivisions: list[Any]) -> dict[str, list[Any]]:
    groups: dict[str, list[Any]] = defaultdict(list)
    for subdivision in subdivisions:
        groups[slug(subdivision.type)].append(subdivision)
    return dict(sorted(groups.items()))


def file_for(country_code: str, type_slug: str) -> str:
    return f"{country_code}.{type_slug}.json"


def generated_iso_file(path: Path, country_code: str) -> bool:
    """Return true if path appears to be generated ISO 3166-2 subdivision data."""
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
    iso_values = [value.get("iso3166-2") for value in values]
    return bool(iso_values) and all(isinstance(code, str) and code.startswith(f"{country_code}-") for code in iso_values)


def remove_stale_generated_files(country_code: str, keep_files: set[str]) -> None:
    for path in COUNTRY_DIR.glob(f"{country_code}.*.json"):
        if path.name in keep_files:
            continue
        if generated_iso_file(path, country_code):
            path.unlink()


def hierarchy_entry(country_code: str, type_slug: str, subdivisions: list[Any]) -> dict[str, Any]:
    label = type_slug.replace("_", " ").title()
    entry: dict[str, Any] = {
        "key": type_slug,
        "label": label,
        "standard": "ISO 3166-2",
        "file": file_for(country_code, type_slug),
        "code-field": "iso3166-2",
        "type-field": "iso-type",
    }
    if any(getattr(subdivision, "parent_code", None) for subdivision in subdivisions):
        entry["parent-field"] = "parent-code"
    return entry


def set_country_hierarchy(country_code: str, hierarchy: list[dict[str, Any]]) -> None:
    path = COUNTRY_DIR / f"{country_code}.json"
    if not path.exists():
        return
    country = load_json(path)
    if not isinstance(country, dict):
        return
    country.setdefault("data", {})["division-hierarchy"] = hierarchy
    write_json(path, country)


def generate_regular_country(country_code: str, subdivisions: list[Any]) -> tuple[list[str], int]:
    groups = grouped_by_type(subdivisions)
    keep_files: set[str] = set()
    hierarchy: list[dict[str, Any]] = []
    count = 0

    for type_slug, group in groups.items():
        filename = file_for(country_code, type_slug)
        keep_files.add(filename)
        data = {
            subdivision.code.split("-")[1]: subdivision_record(subdivision)
            for subdivision in sorted(group, key=lambda subdivision: subdivision.code)
        }
        write_json(COUNTRY_DIR / filename, dict(sorted(data.items())))
        hierarchy.append(hierarchy_entry(country_code, type_slug, group))
        count += len(data)

    remove_stale_generated_files(country_code, keep_files)
    set_country_hierarchy(country_code, hierarchy)
    return sorted(keep_files), count


def generate_gb(subdivisions: list[Any]) -> tuple[list[str], int]:
    countries: dict[str, Any] = {}
    divisions: dict[str, Any] = {}

    for subdivision in sorted(subdivisions, key=lambda subdivision: subdivision.code):
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

    keep_files = {"GB.country.json", "GB.country.division.json"}
    write_json(COUNTRY_DIR / "GB.country.json", dict(sorted(countries.items())))
    write_json(COUNTRY_DIR / "GB.country.division.json", dict(sorted(divisions.items())))
    remove_stale_generated_files("GB", keep_files)
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
    return sorted(keep_files), len(countries) + len(divisions)


def main() -> None:
    country_codes = sorted({subdivision.code.split("-")[0] for subdivision in pycountry.subdivisions})
    file_count = 0
    record_count = 0

    for country_code in country_codes:
        subdivisions = list(pycountry.subdivisions.get(country_code=country_code) or [])
        if country_code == "GB":
            files, count = generate_gb(subdivisions)
        else:
            files, count = generate_regular_country(country_code, subdivisions)
        file_count += len(files)
        record_count += count

    print(f"Wrote {file_count} ISO 3166-2-backed subdivision files")
    print(f"Included {record_count} subdivision records")


if __name__ == "__main__":
    main()
