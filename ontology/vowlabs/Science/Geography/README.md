# VowLabs Science / Geography contribution

This directory is a VowLabs Ontology contribution-format-v1 snapshot for the assigned Geography branch:

```text
prefix: S:G
repository: https://github.com/ekkis/Geo
delivery: snapshot
entry: definitions/index.json
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

Definitions describe concepts. Instance rows live only in dataset files. Routing URLs, service credentials and application storage keys are not embedded in definitions. This snapshot does not activate live service delegation; VowLabs must register and route a public service URL separately if service delivery is desired.
