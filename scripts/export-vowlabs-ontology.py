#!/usr/bin/env python3
"""Export geo definitions and data under the VowLabs Science:Geography ontology.

The export is intentionally derived from the repository's canonical JSON data:
country records, normalized address formats, and ISO 3166-2-backed political
subdivision files. Entity ids are stable VowLabs ontology ids and source file
references point back to the canonical geo data.
"""

from __future__ import annotations

import json
from collections import OrderedDict
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
COUNTRY_DIR = ROOT / "data" / "country"
OUT_DIR = ROOT / "ontology" / "vowlabs" / "Science" / "Geography"
DATA_DIR = OUT_DIR / "data"
ONTOLOGY_ID = "VowLabs:Science:Geography"
BASE_IRI = "https://ontology.vowlabs.com/Science/Geography"
GENERATED_BY = "scripts/export-vowlabs-ontology.py"


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=OrderedDict)


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def vowlabs_id(entity: str, key: str) -> str:
    return f"{ONTOLOGY_ID}:{entity}:{key}"


def unwrap_country(path: Path) -> dict[str, Any]:
    raw = load_json(path)
    data = raw.get("data", raw) if isinstance(raw, dict) else raw
    if not isinstance(data, dict):
        raise ValueError(f"{path}: expected object country data")
    return data


def country_paths() -> list[Path]:
    return sorted(COUNTRY_DIR.glob("[A-Z][A-Z].json"))


def hierarchy_filename(country_code: str, hierarchy: list[dict[str, Any]], entry: dict[str, Any]) -> str:
    by_key = {item.get("key"): item for item in hierarchy if isinstance(item, dict)}
    chain = [entry.get("key")]
    parent = entry.get("parent")
    while parent:
        chain.append(parent)
        parent = by_key.get(parent, {}).get("parent")
    chain = list(reversed([part for part in chain if part]))
    return f"{country_code}." + ".".join(chain) + ".json"


def definitions() -> dict[str, Any]:
    return OrderedDict(
        [
            ("$schema", "https://ontology.vowlabs.com/schema/ontology-definition/v1.json"),
            ("ontology", OrderedDict([
                ("id", ONTOLOGY_ID),
                ("name", "Geography"),
                ("path", ["Science", "Geography"]),
                ("base-iri", BASE_IRI),
                ("description", "Geographic entities, physical address formats, and ISO 3166-2 political subdivisions."),
                ("source", "ekkis/geo"),
            ])),
            ("entities", OrderedDict([
                ("GeographicEntity", OrderedDict([
                    ("description", "An entity with geographic meaning in the VowLabs Science:Geography ontology."),
                    ("abstract", True),
                    ("key", "id"),
                    ("properties", OrderedDict([
                        ("id", {"type": "string", "required": True, "description": "Stable VowLabs ontology entity id."}),
                        ("name", {"type": "string", "required": True}),
                        ("source", {"type": "object", "description": "Source file/key in the geo repository."}),
                    ])),
                ])),
                ("Country", OrderedDict([
                    ("extends", "GeographicEntity"),
                    ("description", "A sovereign state or country-like territory identified by ISO 3166-1 alpha-2 and alpha-3 codes."),
                    ("key", "iso2"),
                    ("properties", OrderedDict([
                        ("iso2", {"type": "string", "pattern": "^[A-Z]{2}$", "required": True}),
                        ("iso3", {"type": "string", "pattern": "^[A-Z]{3}$"}),
                        ("name", {"type": "object", "description": "Common and official country names."}),
                        ("capital", {"type": "object", "description": "Localized capital names."}),
                        ("continent-code", {"type": "string"}),
                        ("region-codes", {"type": "array", "items": "string"}),
                        ("currency-codes", {"type": "array", "items": "string"}),
                        ("language-codes", {"type": "array", "items": "string"}),
                        ("division-hierarchy", {"type": "array", "items": "DivisionHierarchyLevel"}),
                    ])),
                ])),
                ("PoliticalSubdivision", OrderedDict([
                    ("extends", "GeographicEntity"),
                    ("description", "A political/administrative subdivision of a country, backed by ISO 3166-2 where available."),
                    ("key", ["country-code", "subdivision-code"]),
                    ("properties", OrderedDict([
                        ("country-code", {"type": "string", "pattern": "^[A-Z]{2}$", "required": True}),
                        ("subdivision-code", {"type": "string", "required": True, "description": "The country-local ISO 3166-2 suffix/key."}),
                        ("domain", {"type": "string", "required": True, "description": "Political domain key from division-hierarchy, e.g. state, parish, province."}),
                        ("iso3166-2", {"type": "string", "description": "Full ISO 3166-2 code when ISO-backed."}),
                        ("iso-name", {"type": "string"}),
                        ("iso-type", {"type": "string"}),
                        ("parent-code", {"type": "string"}),
                    ])),
                ])),
                ("DivisionHierarchyLevel", OrderedDict([
                    ("description", "A level/domain in a country's political subdivision hierarchy. Backing file names are derived, not stored."),
                    ("properties", OrderedDict([
                        ("key", {"type": "string", "required": True}),
                        ("label", {"type": "string", "required": True}),
                        ("parent", {"type": "string"}),
                        ("standard", {"type": "string"}),
                        ("code-field", {"type": "string"}),
                        ("type-field", {"type": "string"}),
                        ("parent-field", {"type": "string"}),
                    ])),
                ])),
                ("AddressFormat", OrderedDict([
                    ("description", "A country-specific physical mailing address template and normalized field metadata."),
                    ("key", "country-code"),
                    ("properties", OrderedDict([
                        ("country-code", {"type": "string", "pattern": "^[A-Z]{2}$", "required": True}),
                        ("format", {"type": "string", "required": True, "description": "libaddressinput address template."}),
                        ("fields", {"type": "object", "required": True, "description": "Address field metadata keyed by normalized field name."}),
                        ("languages", {"type": "array", "items": "string"}),
                    ])),
                ])),
            ])),
        ]
    )


def export_countries() -> dict[str, Any]:
    records: OrderedDict[str, Any] = OrderedDict()
    for path in country_paths():
        code = path.stem
        data = unwrap_country(path)
        record = OrderedDict()
        record["id"] = vowlabs_id("Country", code)
        record["@type"] = "Country"
        record["iso2"] = code
        for key in [
            "iso3",
            "name",
            "capital",
            "continent-code",
            "region-codes",
            "currency-codes",
            "language-codes",
            "phone-code",
            "tld",
            "timezones",
            "area",
            "population",
            "flag",
            "demonym",
            "gdp",
            "neighbour-codes",
            "division-hierarchy",
        ]:
            if key in data:
                record[key] = data[key]
        record["source"] = {"repository": "ekkis/geo", "path": f"data/country/{path.name}"}
        records[code] = record
    return dataset("Country", records)


def export_address_formats() -> dict[str, Any]:
    records: OrderedDict[str, Any] = OrderedDict()
    for path in country_paths():
        code = path.stem
        data = unwrap_country(path)
        fmt = data.get("address-format")
        if not isinstance(fmt, dict):
            continue
        record = OrderedDict()
        record["id"] = vowlabs_id("AddressFormat", code)
        record["@type"] = "AddressFormat"
        record["country-code"] = code
        record.update(fmt)
        record["source"] = {"repository": "ekkis/geo", "path": f"data/country/{path.name}", "field": "data.address-format"}
        records[code] = record
    return dataset("AddressFormat", records)


def export_subdivisions() -> dict[str, Any]:
    records: OrderedDict[str, Any] = OrderedDict()
    for country_path in country_paths():
        country_code = country_path.stem
        country = unwrap_country(country_path)
        hierarchy = country.get("division-hierarchy") or []
        if not isinstance(hierarchy, list):
            continue
        for entry in hierarchy:
            if not isinstance(entry, dict):
                continue
            standard = entry.get("standard")
            # GB city/locality is project data, not ISO 3166-2-backed subdivision data.
            if standard and standard != "ISO 3166-2":
                continue
            if not standard and entry.get("key") == "city":
                continue
            filename = hierarchy_filename(country_code, hierarchy, entry)
            path = COUNTRY_DIR / filename
            if not path.exists():
                continue
            domain = entry.get("key")
            raw = load_json(path)
            if not isinstance(raw, dict):
                continue
            for suffix, subdivision in raw.items():
                if not isinstance(subdivision, dict):
                    continue
                key = f"{country_code}-{suffix}"
                record = OrderedDict()
                record["id"] = vowlabs_id("PoliticalSubdivision", key)
                record["@type"] = "PoliticalSubdivision"
                record["country-code"] = country_code
                record["subdivision-code"] = suffix
                record["domain"] = domain
                for field in ["name", "type", "iso3166-2", "iso-name", "iso-type", "parent-code", "country-code", "division-codes"]:
                    if field in subdivision:
                        record[field] = subdivision[field]
                # Restore the actual containing country after preserving source field values.
                record["country-code"] = country_code
                record["source"] = {"repository": "ekkis/geo", "path": f"data/country/{path.name}", "key": suffix}
                records[key] = record
    return dataset("PoliticalSubdivision", records)


def dataset(entity: str, records: OrderedDict[str, Any]) -> dict[str, Any]:
    return OrderedDict([
        ("$schema", "https://ontology.vowlabs.com/schema/entity-data/v1.json"),
        ("ontology", ONTOLOGY_ID),
        ("entity", entity),
        ("generated-by", GENERATED_BY),
        ("count", len(records)),
        ("records", records),
    ])


def index(datasets: list[tuple[str, str, int]]) -> dict[str, Any]:
    return OrderedDict([
        ("ontology", ONTOLOGY_ID),
        ("path", ["Science", "Geography"]),
        ("generated-by", GENERATED_BY),
        ("definitions", "definitions.json"),
        ("data", [OrderedDict([("entity", entity), ("file", file), ("count", count)]) for entity, file, count in datasets]),
    ])


def main() -> None:
    defs = definitions()
    countries = export_countries()
    subdivisions = export_subdivisions()
    addresses = export_address_formats()

    write_json(OUT_DIR / "definitions.json", defs)
    write_json(DATA_DIR / "countries.json", countries)
    write_json(DATA_DIR / "political-subdivisions.json", subdivisions)
    write_json(DATA_DIR / "address-formats.json", addresses)
    write_json(
        OUT_DIR / "index.json",
        index([
            ("Country", "data/countries.json", countries["count"]),
            ("PoliticalSubdivision", "data/political-subdivisions.json", subdivisions["count"]),
            ("AddressFormat", "data/address-formats.json", addresses["count"]),
        ]),
    )
    print(f"Exported VowLabs {ONTOLOGY_ID}")
    print(f"countries={countries['count']} subdivisions={subdivisions['count']} address_formats={addresses['count']}")


if __name__ == "__main__":
    main()
