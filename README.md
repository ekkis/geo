# Geo

[![npm version](https://badge.fury.io/js/geo.svg)](https://badge.fury.io/js/geo)
[![Build Status](https://travis-ci.org/i-rocky/geo.svg?branch=master)](https://travis-ci.org/i-rocky/geo) [![Version](https://img.shields.io/npm/v/geo.svg)](https://www.npmjs.com/package/geo)
[![Total Downloads](https://img.shields.io/npm/dt/geo.svg)](https://www.npmjs.com/package/geo)
[![License](https://shields.io/github/license/i-rocky/geo.svg)](https://github.com/i-rocky/geo/blob/master/LICENSE)

This module contains country information including 2 and 3 character ISO codes, country and capital names, currency information, telephone calling codes, provinces (first-tier political subdivisions), postal-code rules, and country-specific physical address formats.

The functionality in this module is also available as a service, hosted using **remote-lib**. Deploy your own instance:

```bash
# 1. Fork this repository
# 2. Deploy to Vercel
npx vercel --prod
```

You can then access the API at your Vercel URL. Example usage:

```bash
# Health check
curl https://your-app.vercel.app/health

# Metadata
curl https://your-app.vercel.app/metadata

# Invoke a method
curl -X POST https://your-app.vercel.app/invoke \
  -H 'Content-Type: application/json' \
  -d '{"method": "find", "args": [{"iso2": "US"}]}'
```

## Install

Add to your project from the NPM repository:
```bash
npm install --save geo
```

And get an instance of the module:
```javascript
// using ES6 modules
import geo from 'geo';
// using CommonJS modules
var geo = require('geo');
```

In a web page, you can include the module like this:
```html
<script src="/path/to/geo.min.js"></script>
```

## Entity API

The current ES module API exposes domains such as `country`, `currency`,
`continent`, `region`, `language`, and `organisation`:

```js
import geo from 'geo';

geo.country.keys();
geo.country.meta();
geo.country.list();
geo.currency.list({ name: true });
geo.country.list({ raw: true }); // Records keyed by ISO2 code
geo.country.find({ criteria: 'US', singleton: true });
geo.country.find({ criteria: ['US', 'CA'] });
geo.country.find({ criteria: { name: { common: 'United States' } } });
geo.country.find({ criteria: 'US', hydrate: true, name: true });
```

`find(criteria, options)` is also supported. Hydration expands known scalar
and array code references without changing the database; `name` uses referenced
names when available. Unknown references and structured code maps are preserved.
`raw` disables hydration. Country records include metadata and subdivision
supplements (for example, `state` and `region.city` for the US).

```sh
./cli country find -c US
./cli country find -c '{"iso3":"USA"}' -H -n
./cli currency list --name
./cli country meta
./cli --help
node --test test/entities.test.mjs
```

Run `npm test` to lint the source and run the entity, HTTP, and CLI regression
suites. Use Node.js 22 or newer. Tests use installed dependencies and do not run
`npm install` automatically.

Run the entity query server with `node server.js` (port 3000, or `$PORT`).
This server exposes the same entity operations:

```sh
curl 'http://localhost:3000/?domain=continent&method=list&name=true'
curl 'http://localhost:3000/?domain=country&method=find&code=DK&singleton=true'
curl --get 'http://localhost:3000/' \
  --data-urlencode 'method=find' \
  --data-urlencode 'criteria={"iso3":"USA"}'
```

`domain` defaults to `country`. `criteria` accepts JSON or an unquoted key;
`code` is a key alias. Boolean options accept `true` or `false`. Invalid methods,
domains, or criteria receive HTTP 400 responses.

The examples below describe the legacy API and have not yet been migrated.

## Basic Usage

The following methods are available:

### Listing
Lists can be generated using the following convenience functions:
```js
var country_names = geo.names();
var continents = geo.continents();
var capitals = geo.capitals();
```
but, in general, any of a country's attributes can be retrieved using the `ls` method, which can also produce the above:
```js
var country_names = geo.ls('name');
var continents = geo.ls('continent');
var capitals = geo.ls('capital');
```

### Searching
**Deprecated methods (use `find` instead):**
- `findByIso2(code)`
- `findByIso3(code)`
- `findByName(name)`
- `findByCapital(capital)`
- `findByCurrency(currency)`
- `findByProvince(province)`

**New flexible search:**
```js
// Find by ISO code
const us = geo.find({ iso2: 'US' });

// Find by name and capital
const japan = geo.find({ name: 'Japan', capital: 'Tokyo' });

// Find by currency
const countriesUsingUSD = geo.find({ currency: 'USD' });

// Find by calling code
const denmark = geo.find({ callingCode: '45' });

// Shortcut: string as name search
const germany = geo.find('Germany');

// Array support: find countries using EUR or USD
const euroCountries = geo.find({ currency: ['EUR', 'USD'] });

// Find countries with names containing "land"
const landCountries = geo.find({ name: /land/i });

// Find countries with multiple provinces
const bigProvinces = geo.find({ province: ['California', 'Texas'] });
```

If the country cannot be found, the return value is `undefined`. If a single value is found, it is returned as an object; if multiple matches are made, an array of such objects is returned.

## Neighbors

Get neighboring countries with optional cardinal direction filtering:

```js
// Get all neighbors of France
const franceNeighbors = geo.neighbours('France');

// Get only northern neighbors of the US
const northernNeighbors = geo.neighbours('US', 'N');

// Get northeastern neighbors of Germany
const northEastNeighbors = geo.neighbours('DE', 'NE');

// Get all neighbors (any direction)
const allNeighbors = geo.neighbours('CA');
```

## Address formats

Each country record may include an `address-format` object sourced from Google libaddressinput/Chromium international address metadata. It stores the original format template and a `fields` object keyed by address field name. Each field can include country-specific `header`, `placeholder`, `required`, `uppercase`, and postal-code `validation` metadata where available. Postal-code metadata is stored only under the postal-code field validation, not as a duplicate top-level country property.

Format tokens use libaddressinput's field codes:

- `%N`: recipient
- `%O`: organization
- `%A`: street address
- `%D`: dependent locality / neighborhood / suburb
- `%C`: locality / city / post town
- `%S`: administrative area / state / province
- `%Z`: postal code
- `%X`: sorting code
- `%n`: line break

Import metadata and coverage are stored in `data/address-format-meta.json`; the reproducible importer is `scripts/add-address-formats.py`.

Canonical ISO 3166-2 subdivisions are available in politically named files under `data/country/`. A country with multiple political subdivision domains gets one file per domain, such as `US.state.json`, `US.outlying_area.json`, and `US.district.json`; single-domain countries use names such as `AD.parish.json`. These files use ISO subdivision suffixes as keys, include the full ISO code in `iso3166-2`, preserve exact ISO names/types in `iso-name` and `iso-type`, and include `parent-code` where ISO defines a parent subdivision. Each country file's `data.division-hierarchy` describes the political subdivision hierarchy by domain key; backing filenames are derived from the country code plus hierarchy path (for example `AD.parish.json` or `GB.country.division.json`). Regenerate them with `scripts/add-iso3166-2-subdivisions.py` and validate them with `scripts/validate-iso3166-2-subdivisions.py`.

The same definitions and data are also published as a VowLabs Ontology contribution-format-v1 delegated-service package under `ontology/vowlabs/Science/Geography/`. Geo remains the authority for the `S:G` branch; VowLabs should register Geo's public service URL and delegate `Science / Geography` to it. The package includes the service manifest, PascalCase `definitions/`, and typed `countries` (`S:G:CO`) and `states`/political-subdivisions (`S:G:SD`) datasets. Regenerate it with `scripts/export-vowlabs-ontology.py` and validate it with `scripts/validate-vowlabs-ontology.py`.

The delegated VowLabs service is exposed with [`remote-lib`](https://github.com/ekkis/remote-lib). `api/index.js` publishes remote-lib endpoints (`/health`, `/metadata`, `/invoke`) and VowLabs REST convenience endpoints under `/v1`. Run locally with `npm start` (port 3000, or `$PORT`), use `npm run dev` for automatic restarts, or smoke-test without binding a port with `npm run smoke:vowlabs`.

Clients can retrieve this data from the country entity:

```js
const usFormat = geo.country.addressFormat('US')
// usFormat.format === '%N%n%O%n%A%n%C, %S %Z'

const usHeaders = geo.country.addressHeaders('US')
// Still available as a compact lookup map:
// {
//   recipient: 'Recipient',
//   organization: 'Organization',
//   'street-address': 'Street Address',
//   locality: 'City',
//   'administrative-area': 'State',
//   'postal-code': 'ZIP'
// }

const usForm = geo.country.addressForm('US')
// Returns { format, fields }
// fields is an object keyed by address field name; the format string controls layout/order.
// Each field includes header, placeholder, required, uppercase, and postal-code validation metadata.
// Postal-code examples remain on addressFormat(), while addressForm() exposes only one placeholder example.
```

## NPM Commands
The built-in test suite may be run in the traditional way
```bash
npm test
```
and to build the minified file for web, run:
```bash
npm run build
```
The build writes `dist/country.min.js` and its source map. Load the script in a
modern browser to access the entity API through the global `geo` object.
The geography data is embedded at build time; no filesystem access is needed.

## Module-as-a-service
The functionality in this module is also available as a service using **remote-lib**. Deploy your own instance:

```bash
# 1. Fork this repository
# 2. Deploy to Vercel
npx vercel --prod
```

You can then access the API at your Vercel URL. Example:

```bash
# Health
curl https://your-app.vercel.app/health

# Invoke
curl -X POST https://your-app.vercel.app/invoke \
  -H 'Content-Type: application/json' \
  -d '{"method": "find", "args": [{"iso2": "US"}]}'
```

## Licence
MIT