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


def parse_template(template: str | None) -> list[list[str]]:
    if not template:
        return []
    lines: list[list[str]] = []
    for line in template.split(LINE_TOKEN):
        fields = [FIELD_CODES[code] for code in FIELD_RE.findall(line)]
        if fields:
            lines.append(fields)
    return lines


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


def build_address_format(raw: dict[str, Any]) -> dict[str, Any]:
    out: dict[str, Any] = {
        "format": raw.get("fmt", ""),
    }

    if raw.get("lfmt") and raw.get("lfmt") != raw.get("fmt"):
        out["latin-format"] = raw["lfmt"]

    required = fields_from_codes(raw.get("require"))
    if required:
        out["required-fields"] = required

    uppercase = fields_from_codes(raw.get("upper"))
    if uppercase:
        out["uppercase-fields"] = uppercase

    languages = split_list(raw.get("languages"))
    if raw.get("lang") and raw["lang"] not in languages:
        languages.insert(0, raw["lang"])
    if languages:
        out["languages"] = languages

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
    if labels:
        out["field-labels"] = labels

    if raw.get("zip"):
        postal: dict[str, Any] = {"regex": anchored_regex(raw["zip"])}
        if raw.get("zfmt"):
            postal["format"] = raw["zfmt"]
        examples = split_examples(raw.get("zipex"))
        if examples:
            postal["examples"] = examples
        if raw.get("posturl"):
            postal["lookup-url"] = raw["posturl"]
        out["postal-code"] = postal

    if raw.get("postprefix"):
        out["postal-code-prefix"] = raw["postprefix"]

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
        address_format = build_address_format(raw)
        if not country_raw.get("fmt"):
            used_default_format.append(code)

        doc = json.loads(path.read_text(encoding="utf-8"))
        data = doc["data"]
        data["address-format"] = address_format

        if "postal-code" in address_format:
            postal_code_covered.append(code)

        if "postal-code" not in data and "postal-code" in address_format:
            data["postal-code"] = {
                key: value
                for key, value in address_format["postal-code"].items()
                if key in {"format", "regex", "examples"}
            }

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
