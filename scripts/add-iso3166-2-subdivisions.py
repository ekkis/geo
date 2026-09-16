#!/usr/bin/env python3
"""Generate canonical ISO 3166-2 subdivision files for every country.

Writes data/country/{ISO2}.iso3166-2.json for each country that has
subdivisions in pycountry's ISO 3166-2 dataset. Existing project-specific
hierarchy files are left intact for backward compatibility.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

import pycountry

ROOT = Path(__file__).resolve().parents[1]
COUNTRY_DIR = ROOT / "data" / "country"


def display_name(name: str) -> str:
    """Remove ISO bracket aliases from a user-facing name."""
    return re.sub(r"\s*\[[^\]]*\]", "", name).strip() or name


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


def main() -> None:
    country_codes = sorted({subdivision.code.split("-")[0] for subdivision in pycountry.subdivisions})
    file_count = 0
    record_count = 0

    for country_code in country_codes:
        subdivisions = sorted(
            pycountry.subdivisions.get(country_code=country_code) or [],
            key=lambda subdivision: subdivision.code,
        )
        data = {
            subdivision.code.split("-")[1]: subdivision_record(subdivision)
            for subdivision in subdivisions
        }
        path = COUNTRY_DIR / f"{country_code}.iso3166-2.json"
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        file_count += 1
        record_count += len(data)

    print(f"Wrote {file_count} ISO 3166-2 files")
    print(f"Included {record_count} subdivision records")


if __name__ == "__main__":
    main()
