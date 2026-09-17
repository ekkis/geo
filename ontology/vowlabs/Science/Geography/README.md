# VowLabs Science:Geography Ontology

This directory publishes the geo repository's definitions and data under the VowLabs ontology path:

```text
VowLabs:Science:Geography
```

## Files

- `index.json` — ontology package index.
- `definitions.json` — entity definitions for the geography ontology.
- `data/countries.json` — `Country` entity records derived from `data/country/{ISO2}.json`.
- `data/political-subdivisions.json` — `PoliticalSubdivision` entity records derived from ISO 3166-2-backed political-domain files such as `AD.parish.json`, `US.state.json`, and `GB.country.division.json`.
- `data/address-formats.json` — `AddressFormat` entity records derived from normalized country address metadata.

## Entity definitions

The ontology currently defines:

- `GeographicEntity` — abstract base entity.
- `Country` — ISO 3166-1 country/country-like territory.
- `PoliticalSubdivision` — ISO 3166-2-backed political or administrative subdivision.
- `DivisionHierarchyLevel` — country-level hierarchy/domain metadata.
- `AddressFormat` — physical address template and normalized field metadata.

## Regeneration

Regenerate the ontology export from canonical repository data with:

```bash
python3 scripts/export-vowlabs-ontology.py
```

Then validate all generated JSON as part of the normal repository checks.
