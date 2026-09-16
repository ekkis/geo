#!/usr/bin/env python3
"""Validate canonical ISO 3166-2 subdivision files against pycountry."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pycountry

ROOT = Path(__file__).resolve().parents[1]
COUNTRY_DIR = ROOT / "data" / "country"


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> None:
    errors: list[str] = []
    country_codes = sorted({subdivision.code.split("-")[0] for subdivision in pycountry.subdivisions})

    for country_code in country_codes:
        path = COUNTRY_DIR / f"{country_code}.iso3166-2.json"
        if not path.exists():
            errors.append(f"{country_code}: missing {path.name}")
            continue

        data = load_json(path)
        iso = {
            subdivision.code.split("-")[1]: subdivision
            for subdivision in pycountry.subdivisions.get(country_code=country_code) or []
        }

        actual_keys = set(data)
        expected_keys = set(iso)
        if actual_keys != expected_keys:
            missing = sorted(expected_keys - actual_keys)[:10]
            extra = sorted(actual_keys - expected_keys)[:10]
            errors.append(f"{country_code}: key mismatch missing={missing} extra={extra}")
            continue

        for key, record in data.items():
            subdivision = iso[key]
            if not isinstance(record, dict):
                errors.append(f"{country_code}-{key}: record is not an object")
                continue
            expected = {
                "iso3166-2": subdivision.code,
                "iso-name": subdivision.name,
                "iso-type": subdivision.type,
            }
            for field, value in expected.items():
                if record.get(field) != value:
                    errors.append(
                        f"{country_code}-{key}: {field}={record.get(field)!r}, expected {value!r}"
                    )
            parent_code = (getattr(subdivision, "parent_code", None) or "").split("-")[-1]
            if parent_code and record.get("parent-code") != parent_code:
                errors.append(
                    f"{country_code}-{key}: parent-code={record.get('parent-code')!r}, expected {parent_code!r}"
                )

    if errors:
        print(f"ISO 3166-2 validation failed with {len(errors)} error(s)")
        for error in errors[:100]:
            print(error)
        raise SystemExit(1)

    total = sum(len(load_json(COUNTRY_DIR / f"{country_code}.iso3166-2.json")) for country_code in country_codes)
    print(f"Validated {len(country_codes)} ISO 3166-2 country files")
    print(f"Validated {total} subdivision records")


if __name__ == "__main__":
    main()
