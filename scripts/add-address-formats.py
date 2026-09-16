#!/usr/bin/env python3
"""Populate country address formatting metadata from libaddressinput.

Source endpoint: https://chromium-i18n.appspot.com/ssl-address/data/{ISO2}
"""
from __future__ import annotations

import json
import re
import urllib.request
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
COUNTRY_DIR = ROOT / "data" / "country"
BASE_URL = "https://chromium-i18n.appspot.com/ssl-address/data"

FIELD_CODES = {
    "N": "recipient",
    "O": "organization",
    "A": "street-address",
    "D": "dependent-locality",
    "C": "locality",
    "S": "administrative-area",
    "Z": "postal-code",
    "X": "sorting-code",
}

LINE_TOKEN = "%n"
FIELD_RE = re.compile(r"%([NOADCSZX])")


def fetch_json(url: str) -> dict[str, Any]:
    req = urllib.request.Request(url, headers={"User-Agent": "geo-address-format-import/1.0"})
    with urllib.request.urlopen(req, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def split_list(value: str | None) -> list[str]:
    if not value:
        return []
    return [part for part in value.split("~") if part]


def fields_from_template(template: str | None) -> list[str]:
    fields: list[str] = []
    if not template:
        return fields
    for code in FIELD_RE.findall(template):
        field = FIELD_CODES[code]
        if field not in fields:
            fields.append(field)
    return fields


def fields_from_codes(codes: str | None) -> list[str]:
    if not codes:
        return []
    return [FIELD_CODES[code] for code in codes if code in FIELD_CODES]


def split_examples(value: str | None) -> list[str]:
    if not value:
        return []
    return [part.strip() for part in re.split(r"[~,]", value) if part.strip()]


def anchored_regex(pattern: str) -> str:
    if pattern.startswith("^") and pattern.endswith("$"):
        return pattern
    return f"^(?:{pattern})$"


def words(value: str) -> str:
    return re.sub(r"\b\w", lambda m: m.group(0).upper(), value.replace("-", " ").replace("_", " "))


def default_label(field: str) -> str:
    return {
        "recipient": "Recipient",
        "organization": "Organization",
        "street-address": "Street Address",
        "dependent-locality": "Dependent Locality",
        "locality": "Locality",
        "administrative-area": "Administrative Area",
        "postal-code": "Postal Code",
        "sorting-code": "Sorting Code",
    }.get(field, words(field))


def label_for(field: str, labels: dict[str, str]) -> str:
    label = labels.get(field)
    if label == "zip":
        return "ZIP"
    return words(label or default_label(field))


def placeholder_for(field: str, labels: dict[str, str], postal: dict[str, Any]) -> str:
    if field == "postal-code":
        if postal.get("examples"):
            return postal["examples"][0]
        if postal.get("format"):
            return postal["format"]

    label = labels.get(field, "").lower().replace("_", " ")
    examples = {
        "recipient": "Jane Smith",
        "organization": "Example Company",
        "street-address": "123 Main St",
        "dependent-locality": "Neighborhood",
        "locality": "City",
        "administrative-area": "State / Province",
        "postal-code": "Postal Code",
        "sorting-code": "Sorting Code",
    }
    label_examples = {
        "area": "Area",
        "city": "City",
        "county": "County",
        "department": "Department",
        "district": "District",
        "do si": "Do/Si",
        "emirate": "Emirate",
        "island": "Island",
        "neighborhood": "Neighborhood",
        "oblast": "Oblast",
        "parish": "Parish",
        "post town": "Post Town",
        "prefecture": "Prefecture",
        "province": "Province",
        "state": "State",
        "suburb": "Suburb",
        "townland": "Townland",
        "village township": "Village / Township",
        "zip": "95014",
    }
    return label_examples.get(label) or examples.get(field) or default_label(field)


def build_address_format(raw: dict[str, Any], existing_postal: dict[str, Any] | None = None) -> dict[str, Any]:
    postal: dict[str, Any] = dict(existing_postal or {})
    if raw.get("zip"):
        postal.update({"regex": anchored_regex(raw["zip"])})
        if raw.get("zfmt"):
            postal["format"] = raw["zfmt"]
        examples = split_examples(raw.get("zipex"))
        if examples:
            postal["examples"] = examples
        if raw.get("posturl"):
            postal["lookup-url"] = raw["posturl"]
    if raw.get("postprefix"):
        postal["prefix"] = raw["postprefix"]

    labels: dict[str, str] = {}
    label_map = {
        "state_name_type": "administrative-area",
        "locality_name_type": "locality",
        "sublocality_name_type": "dependent-locality",
        "zip_name_type": "postal-code",
    }
    for raw_key, field_name in label_map.items():
        if raw.get(raw_key):
            labels[field_name] = raw[raw_key]

    required = set(fields_from_codes(raw.get("require")))
    uppercase = set(fields_from_codes(raw.get("upper")))
    fields: dict[str, Any] = {}
    for field in fields_from_template(raw.get("fmt")):
        field_data: dict[str, Any] = {
            "header": label_for(field, labels),
            "placeholder": placeholder_for(field, labels, postal),
            "required": field in required,
            "uppercase": field in uppercase,
        }
        if field == "postal-code" and postal:
            field_data["validation"] = postal
        fields[field] = field_data

    out: dict[str, Any] = {
        "format": raw.get("fmt", ""),
        "fields": fields,
    }

    if raw.get("lfmt") and raw.get("lfmt") != raw.get("fmt"):
        out["latin-format"] = raw["lfmt"]

    languages = split_list(raw.get("languages"))
    if raw.get("lang") and raw["lang"] not in languages:
        languages.insert(0, raw["lang"])
    if languages:
        out["languages"] = languages

    return out

def main() -> None:
    default_raw = fetch_json(f"{BASE_URL}/ZZ")
    country_files = sorted(COUNTRY_DIR.glob("[A-Z][A-Z].json"))

    updated: list[str] = []
    missing: list[str] = []
    used_default_format: list[str] = []
    postal_code_covered: list[str] = []

    for path in country_files:
        code = path.stem
        try:
            country_raw = fetch_json(f"{BASE_URL}/{code}")
        except Exception:
            missing.append(code)
            continue

        raw = {**default_raw, **country_raw}
        doc = json.loads(path.read_text(encoding="utf-8"))
        data = doc["data"]
        existing_postal = data.pop("postal-code", None)
        address_format = build_address_format(raw, existing_postal)
        if not country_raw.get("fmt"):
            used_default_format.append(code)

        data["address-format"] = address_format

        postal_field = address_format.get("fields", {}).get("postal-code", {})
        if "validation" in postal_field:
            postal_code_covered.append(code)

        path.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        updated.append(code)

    meta = {
        "source": {
            "name": "Google libaddressinput / Chromium international address metadata",
            "url": BASE_URL,
            "retrieved": "2026-09-16",
        },
        "field-codes": FIELD_CODES,
        "format-token": {
            "%n": "line break",
        },
        "notes": [
            "Country data stores the original libaddressinput format template.",
            "Top-level country postal-code metadata is merged into address-format.fields.postal-code.validation.",
            "Postal-code regexes are anchored for full-string validation.",
            "Countries whose country-specific record omits a format inherit libaddressinput's ZZ default format."
        ],
        "coverage": {
            "country-files": len(country_files),
            "updated": len(updated),
            "missing-from-source": missing,
            "used-default-format": used_default_format,
            "postal-code-metadata": len(postal_code_covered)
        },
    }
    (ROOT / "data" / "address-format-meta.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(f"Updated {len(updated)} countries")
    print(f"Missing from source: {', '.join(missing) if missing else 'none'}")
    print(f"Used default format for {len(used_default_format)} countries")
    print(f"Included postal-code metadata for {len(postal_code_covered)} countries")


if __name__ == "__main__":
    main()

