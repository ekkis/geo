#!/usr/bin/env python3
"""Export Geo's VowLabs Science/Geography delegated-service package.

The export follows the VowLabs Ontology contribution format v1:

- manifest.json declares service delegation for prefix S:G.
- definitions/ contains PascalCase ontology definition nodes served by Geo.
- data/countries/index.json contains typed Country reference data served by Geo.
- data/states/index.json contains typed Subdivision reference data served by Geo.

The source of truth remains the geo repository's canonical country JSON and
ISO 3166-2-backed political subdivision files. VowLabs should register Geo's
public service URL and delegate Science/Geography (S:G) to it; VowLabs should
not copy these definitions/data into its local ontology tree as the authority.
"""

from __future__ import annotations

import json
import shutil
from collections import OrderedDict
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
COUNTRY_DIR = ROOT / "data" / "country"
OUT_DIR = ROOT / "ontology" / "vowlabs" / "Science" / "Geography"
DEFINITIONS_DIR = OUT_DIR / "definitions"
DATA_DIR = OUT_DIR / "data"
PREFIX = "S:G"
REPOSITORY = "https://github.com/ekkis/Geo"
VERSION = "1.0.0"
LICENSE = "MIT"
ONTOLOGY_VERSION = "7.0.0"
SERVICE_URL = "https://geo.example/v1/"  # Replace with Geo's real public HTTPS base URL before activation.
COUNTRY_DEFINITION = "S:G:CO"
SUBDIVISION_DEFINITION = "S:G:SD"
PRIMITIVE_STRING = "S:I:D:T:S"


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=OrderedDict)


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def country_paths() -> list[Path]:
    return sorted(COUNTRY_DIR.glob("[A-Z][A-Z].json"))


def unwrap_country(path: Path) -> dict[str, Any]:
    raw = load_json(path)
    data = raw.get("data", raw) if isinstance(raw, dict) else raw
    if not isinstance(data, dict):
        raise ValueError(f"{path}: expected object country data")
    return data


def hierarchy_filename(country_code: str, hierarchy: list[dict[str, Any]], entry: dict[str, Any]) -> str:
    by_key = {item.get("key"): item for item in hierarchy if isinstance(item, dict)}
    chain = [entry.get("key")]
    parent = entry.get("parent")
    while parent:
        chain.append(parent)
        parent = by_key.get(parent, {}).get("parent")
    chain = list(reversed([part for part in chain if part]))
    return f"{country_code}." + ".".join(chain) + ".json"


def copy_existing_address_branch() -> None:
    """Preserve the existing VowLabs Geography/Address branch locally.

    The contribution guide says the actual Geography handoff must preserve the
    Address branch. We copy the current upstream branch into Geo's delegated
    export so the S:G root includes AD, CO and SD.
    """

    address_root = DEFINITIONS_DIR / "Address"
    if address_root.exists():
        shutil.rmtree(address_root)

    files = {
        "Address/index.json": {
            "Name": "Address",
            "Description": "Address formats and reusable address-use concepts. Choose a country-specific format for an address record; use Roles to constrain the Role relationship.",
            "Children": {
                "RO": {"$ref": "./Roles/index.json"},
                "US": {"$ref": "./US/index.json"},
            },
        },
        "Address/README.md": "# Address\n\nAddress formats and reusable address-use concepts preserved from the existing VowLabs `S:G:AD` branch.\n",
        "Address/Roles/index.json": {
            "Name": "Roles",
            "Description": "Reusable address role concepts.",
            "Children": {
                "B": {"$ref": "./Billing/index.json"},
                "M": {"$ref": "./Mailing/index.json"},
                "O": {"$ref": "./Office/index.json"},
                "P": {"$ref": "./Pickup/index.json"},
                "R": {"$ref": "./Residence/index.json"},
                "RO": {"$ref": "./RegisteredOffice/index.json"},
                "RT": {"$ref": "./Returns/index.json"},
                "S": {"$ref": "./Shipping/index.json"},
            },
        },
        "Address/Roles/README.md": "# Address roles\n\nReusable concepts for the role or use of an address.\n",
        "Address/US/index.json": {
            "Name": "US address",
            "Scalar": False,
            "Subjects": ["I:P", "I:O"],
            "Children": {
                "R": {"$ref": "./Role.json"},
                "L1": {"$ref": "./Line1.json"},
                "L2": {"$ref": "./Line2.json"},
                "C": {"$ref": "./City.json"},
                "RE": {"$ref": "./Region.json"},
                "PC": {"$ref": "./PostalCode.json"},
                "CO": {"$ref": "./Country.json"},
                "DI": {"$ref": "./DeliveryInstructions.json"},
            },
            "DisplayFormat": "{L1}\n{L2}\n{C}, {RE} {PC}\n{CO}\n{DI}",
            "DisplayOmitValues": {"CO": ["G:CO:US"]},
            "LabelField": "R",
            "Description": "Address record using the US-style postal layout. The format is distinct from the country concept G:CO:US; migration retains original country information, including non-US addresses entered through the former general form.",
            "Country": "G:CO:US",
        },
        "Address/US/README.md": "# US address\n\nCountry-specific postal address answer object for United States-style address records.\n",
    }

    role_defs = {
        "Billing": "Billing address",
        "Mailing": "Mailing address",
        "Office": "Office address",
        "Pickup": "Pickup address",
        "Residence": "Residence address",
        "RegisteredOffice": "Registered office address",
        "Returns": "Returns address",
        "Shipping": "Shipping address",
    }
    for dirname, name in role_defs.items():
        files[f"Address/Roles/{dirname}/index.json"] = {"Name": name, "Description": f"{name} role."}
        files[f"Address/Roles/{dirname}/README.md"] = f"# {name}\n\nAddress role concept for {name.lower()} usage.\n"

    us_fields = {
        "Role.json": ("Role", "What role does this address serve?"),
        "Line1.json": ("Address line 1", "What is the first address line?"),
        "Line2.json": ("Address line 2", "What is the second address line?"),
        "City.json": ("City", "What is the city?"),
        "Region.json": ("Region", "What is the state, province, or region?"),
        "PostalCode.json": ("Postal code", "What is the postal code?"),
        "Country.json": ("Country", "What is the country?"),
        "DeliveryInstructions.json": ("Delivery instructions", "What delivery instructions apply?"),
    }
    for filename, (name, question) in us_fields.items():
        files[f"Address/US/{filename}"] = {"Name": name, "Question": question, "Type": PRIMITIVE_STRING}

    for rel, data in files.items():
        path = DEFINITIONS_DIR / rel
        if isinstance(data, str):
            write_text(path, data)
        else:
            write_json(path, data)


def export_definitions() -> None:
    write_json(
        DEFINITIONS_DIR / "index.json",
        OrderedDict([
            ("Name", "Geography"),
            ("Description", "Places, political geography, postal address concepts and spatial context maintained by ekkis/Geo under the VowLabs Science / Geography assignment."),
            ("Children", OrderedDict([
                ("AD", {"$ref": "./Address/index.json"}),
                ("CO", {"$ref": "./Country/index.json"}),
                ("SD", {"$ref": "./Subdivision/index.json"}),
            ])),
        ]),
    )
    write_text(
        DEFINITIONS_DIR / "README.md",
        "# Geography (`S:G`)\n\nGeo-maintained VowLabs Science / Geography branch. This root preserves the existing Address branch and defines country and subdivision concepts whose instances are published as typed datasets.\n",
    )
    write_json(
        DEFINITIONS_DIR / "Country" / "index.json",
        OrderedDict([
            ("Name", "Country"),
            ("Description", "A country or country-like territory used as a geographic location or jurisdiction. Named places and ISO identifiers are reference data; inclusion does not adjudicate sovereignty."),
            ("Children", OrderedDict()),
        ]),
    )
    write_text(
        DEFINITIONS_DIR / "Country" / "README.md",
        "# Country (`S:G:CO`)\n\nA country or country-like territory used as a geographic location or jurisdiction. Instances are delivered by the `countries` dataset. Country dataset IDs use the stable `G:CO:{ISO2}` form, such as `G:CO:US`.\n",
    )
    write_json(
        DEFINITIONS_DIR / "Subdivision" / "index.json",
        OrderedDict([
            ("Name", "Subdivision"),
            ("Description", "A named administrative or constituent part of a country, such as a state, parish, province, department or district. Named subdivisions and their identifiers are reference data, not child definitions."),
            ("Children", OrderedDict()),
        ]),
    )
    write_text(
        DEFINITIONS_DIR / "Subdivision" / "README.md",
        "# Subdivision (`S:G:SD`)\n\nA named administrative or constituent part of a country. Instances are delivered by the `states` dataset for compatibility with the VowLabs Geography delegation contract; the dataset includes ISO 3166-2-backed political subdivision domains, not only US states.\n",
    )
    copy_existing_address_branch()


def export_countries() -> dict[str, Any]:
    records: list[OrderedDict[str, Any]] = []
    for path in country_paths():
        code = path.stem
        data = unwrap_country(path)
        name = data.get("name") or {}
        record = OrderedDict()
        record["id"] = f"G:CO:{code}"
        record["definitionCode"] = COUNTRY_DEFINITION
        record["name"] = name.get("common") if isinstance(name, dict) else str(name)
        if isinstance(name, dict) and name.get("official"):
            record["officialName"] = name["official"]
        record["iso2"] = code
        for source_key, target_key in [
            ("iso3", "iso3"),
            ("continent-code", "continentCode"),
            ("region-codes", "regionCodes"),
            ("capital", "capital"),
            ("currency-codes", "currencyCodes"),
            ("language-codes", "languageCodes"),
            ("phone-code", "phoneCode"),
            ("tld", "tld"),
            ("timezones", "timezones"),
            ("area", "area"),
            ("population", "population"),
            ("flag", "flag"),
            ("demonym", "demonym"),
            ("gdp", "gdp"),
            ("neighbour-codes", "neighbourCodes"),
            ("division-hierarchy", "divisionHierarchy"),
        ]:
            if source_key in data:
                record[target_key] = data[source_key]
        record["source"] = {"repository": "ekkis/geo", "path": f"data/country/{path.name}"}
        records.append(record)
    return OrderedDict([
        ("id", "countries"),
        ("name", "Countries"),
        ("description", "Countries and country-like territories derived from ekkis/geo country records."),
        ("definitionCode", COUNTRY_DEFINITION),
        ("version", 1),
        ("license", LICENSE),
        ("provenance", "Derived from ekkis/geo data/country/{ISO2}.json records."),
        ("records", records),
    ])


def export_states() -> dict[str, Any]:
    records: list[OrderedDict[str, Any]] = []
    for country_path in country_paths():
        country_code = country_path.stem
        country = unwrap_country(country_path)
        hierarchy = country.get("division-hierarchy") or []
        if not isinstance(hierarchy, list):
            continue
        for entry in hierarchy:
            if not isinstance(entry, dict):
                continue
            if entry.get("standard") != "ISO 3166-2":
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
                iso_code = subdivision.get("iso3166-2") or f"{country_code}-{suffix}"
                record = OrderedDict()
                record["id"] = iso_code
                record["definitionCode"] = SUBDIVISION_DEFINITION
                record["name"] = subdivision.get("name") or subdivision.get("iso-name")
                record["abbreviation"] = suffix
                record["country"] = f"G:CO:{country_code}"
                record["countryCode"] = country_code
                record["domain"] = domain
                for source_key, target_key in [
                    ("type", "type"),
                    ("iso3166-2", "iso3166-2"),
                    ("iso-name", "isoName"),
                    ("iso-type", "isoType"),
                    ("parent-code", "parentCode"),
                    ("division-codes", "divisionCodes"),
                ]:
                    if source_key in subdivision:
                        record[target_key] = subdivision[source_key]
                record["source"] = {"repository": "ekkis/geo", "path": f"data/country/{path.name}", "key": suffix}
                records.append(record)
    records.sort(key=lambda item: item["id"])
    return OrderedDict([
        ("id", "states"),
        ("name", "Political subdivisions"),
        ("description", "ISO 3166-2-backed first-level and special political subdivision records. The dataset id remains `states` for VowLabs delegation compatibility."),
        ("definitionCode", SUBDIVISION_DEFINITION),
        ("version", 1),
        ("license", LICENSE),
        ("provenance", "Derived from ekkis/geo data/country/{ISO2}.{domain}.json ISO 3166-2-backed political subdivision files."),
        ("records", records),
    ])


def export_data() -> tuple[int, int]:
    countries = export_countries()
    states = export_states()
    write_json(DATA_DIR / "countries" / "index.json", countries)
    write_text(
        DATA_DIR / "countries" / "README.md",
        "# Countries dataset\n\nTyped `S:G:CO` reference data for countries and country-like territories. Record IDs use `G:CO:{ISO2}` for compatibility with existing VowLabs country references.\n",
    )
    write_json(DATA_DIR / "states" / "index.json", states)
    write_text(
        DATA_DIR / "states" / "README.md",
        "# States dataset\n\nTyped `S:G:SD` reference data for political subdivisions. The dataset id remains `states` for VowLabs delegation compatibility, but records cover ISO 3166-2-backed subdivision domains globally.\n",
    )
    return len(countries["records"]), len(states["records"])


def export_manifest() -> None:
    manifest = OrderedDict([
        ("formatVersion", 1),
        ("repository", REPOSITORY),
        ("prefix", PREFIX),
        ("version", VERSION),
        ("license", LICENSE),
        ("readme", "README.md"),
        ("requires", OrderedDict([
            ("ontologyVersion", ONTOLOGY_VERSION),
            ("codes", ["I:P", "I:O", PRIMITIVE_STRING]),
        ])),
        ("datasets", [
            OrderedDict([("id", "countries"), ("definitionCode", COUNTRY_DEFINITION)]),
            OrderedDict([("id", "states"), ("definitionCode", SUBDIVISION_DEFINITION)]),
        ]),
        ("delivery", OrderedDict([("mode", "service"), ("url", SERVICE_URL)])),
    ])
    write_json(OUT_DIR / "manifest.json", manifest)


def export_readme(country_count: int, state_count: int) -> None:
    write_text(
        OUT_DIR / "README.md",
        f"""# VowLabs Science / Geography contribution

This directory is Geo's VowLabs Ontology contribution-format-v1 package for the assigned Geography branch. Geo remains the authority for definitions and data; VowLabs delegates the `Science / Geography` node (`S:G`) to Geo's service URL.

```text
prefix: S:G
repository: {REPOSITORY}
delivery: service
service-url: {SERVICE_URL}
```

## Contents

- `manifest.json` — contribution manifest.
- `definitions/` — PascalCase ontology definitions mounted at `S:G`.
- `data/countries/index.json` — `{country_count}` `S:G:CO` country records.
- `data/states/index.json` — `{state_count}` `S:G:SD` political subdivision records.

The `states` dataset name is retained for compatibility with the VowLabs Geography delegation contract. Its records cover global ISO 3166-2-backed political subdivision domains such as states, provinces, parishes, departments and districts.

## Regeneration

```bash
python3 scripts/export-vowlabs-ontology.py
python3 scripts/validate-vowlabs-ontology.py
```

## Scope and boundaries

Definitions describe concepts. Instance rows live only in dataset files and service responses. The manifest advertises delegated service delivery; replace `https://geo.example/v1/` with Geo's real public HTTPS base URL before VowLabs activates routing. Endpoint activation must not change ontology codes or dataset record IDs.

## Delegated service contract

VowLabs keeps the parent `S` branch and publishes a delegation descriptor for `S:G`. Geo serves the assigned node and descendants from the registered base URL:

```text
GET /v1/definitions/S%3AG
GET /v1/definitions/S%3AG/children
GET /v1/datasets/countries
GET /v1/datasets/countries/records
GET /v1/datasets/states
GET /v1/datasets/states/records
```

The checked-in `definitions/` and `data/` files are the canonical source for those service responses.

The Geo repository publishes the service with [`remote-lib`](https://github.com/ekkis/remote-lib):

```text
GET /health
GET /metadata
POST /invoke
```

Example remote-lib invocation:

```bash
curl -X POST $GEO_SERVICE_URL/invoke \
  -H 'Content-Type: application/json' \
  -d '{{"method":"definition","args":["S:G:CO"]}}'
```
""",
    )


def main() -> None:
    if OUT_DIR.exists():
        shutil.rmtree(OUT_DIR)
    export_definitions()
    country_count, state_count = export_data()
    export_manifest()
    export_readme(country_count, state_count)
    print("Exported VowLabs delegated-service package")
    print(f"countries={country_count} states={state_count}")


if __name__ == "__main__":
    main()
