# VowLabs Science / Geography contribution

This directory is Geo's VowLabs Ontology contribution-format-v1 package for the assigned Geography branch. Geo remains the authority for definitions and data; VowLabs delegates the `Science / Geography` node (`S:G`) to Geo's service URL.

```text
prefix: S:G
repository: https://github.com/ekkis/Geo
delivery: service
service-url: https://geo.example/v1/
```

## Contents

- `manifest.json` — contribution manifest.
- `definitions/` — PascalCase ontology definitions mounted at `S:G`.
- `data/countries/index.json` — `250` `S:G:CO` country records.
- `data/states/index.json` — `5046` `S:G:SD` political subdivision records.

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
