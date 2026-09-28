# VowLabs Science / Geography contribution

This directory is Geo's VowLabs Ontology contribution-format-v1 package for the assigned Geography branch. Geo remains the authority for definitions and data; VowLabs delegates the `Science / Geography` node (`S:G`) to Geo's service URL.

```text
prefix: S:G
repository: https://github.com/ekkis/Geo
delivery: service
service-url: https://geo-ekkis.vercel.app/v1/
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

Verify every public definition and dataset endpoint after deployment:

```bash
npm run smoke:vowlabs -- https://geo-ekkis.vercel.app
```

## Scope and boundaries

Definitions describe concepts. Instance rows live only in dataset files and service responses. The manifest registers `https://geo-ekkis.vercel.app/v1/` as the delegated REST base URL. Health and RPC endpoints use the service origin `https://geo-ekkis.vercel.app`. Public access must be enabled in Vercel Deployment Protection for ontology clients. Endpoint activation must not change ontology codes or dataset record IDs.

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
curl -X POST https://geo-ekkis.vercel.app/invoke   -H 'Content-Type: application/json'   -d '{"method":"definition","args":["S:G:CO"]}'
```

## Ontology proxy compatibility

The `/v1/` HTTP API uses `{data, meta}` envelopes for ontology version 8.2.0.
Definitions contain `Code`, canonical `Children` codes, reference URNs and `/v1/`
links. Role choices retain the established `S:G:AD:RO` leaf codes and Country
uses the `countries` dataset. These constraints preserve VowLabs stored records.

Lookup, immediate children, choices, mixed/scoped definition listings, dataset
metadata and records support the Ontology request contract. Search uses `q`;
listings default to 50 rows and accept `limit` up to 200 and nonnegative `offset`.
GET/HEAD/OPTIONS, public CORS, conditional ETags, and meaningful 400/404 errors
are supported. The existing remote-lib `/invoke` methods retain their raw return
format; only the `/v1/` HTTP surface uses the standard envelope.

`/v1/catalogue` exports this branch and its datasets for an explicit offline
snapshot. It does not contain any parent-owned Identity or Science definitions.
Country record IDs stay `G:CO:XX`; subdivision IDs include `US-CA`. The global
states dataset is version 2. Historical ontology codes and signed values are
not rewritten. Geo contains all authoritative files; Ontology only proxies them.

Local `npm start` honors `PORT` and `GEO_BIND_HOST`. Development defaults to
`0.0.0.0`; `NODE_ENV=production` defaults to `127.0.0.1` and rejects non-loopback
bind overrides. Vercel uses `api/index.js` directly. To publish the updated API:

```sh
cd ~/dev/Geo
npx vercel --prod
```

Publish Geo before deploying an Ontology release requiring its new API.

## Repeatability and composite values

Every definition declares two independent booleans. `Collection: true` means
repeatable values (a vector), not merely a branch with children. `Composite: true`
means the constituent datapoints are entered together as one value. A US address
has both flags: a person can have many addresses, and each address keeps its
street, city, region, postal code and country together. Its fields have both
flags false and are not independently selectable values in the wallet editor.
Organizing branches, roles and reference-dataset definitions have both flags
false. Dataset rows and node children do not imply vector cardinality.

The schema targets ontology 10.2.0. Existing Geography codes, values and record
IDs remain unchanged. Email in Identity is the contrasting example: repeatable
but non-composite, so a user can enter one email without unrelated fields.
