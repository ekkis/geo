# Geo

[![npm version](https://badge.fury.io/js/geo.svg)](https://badge.fury.io/js/geo)
[![Build Status](https://travis-ci.org/i-rocky/geo.svg?branch=master)](https://travis-ci.org/i-rocky/geo) [![Version](https://img.shields.io/npm/v/geo.svg)](https://www.npmjs.com/package/geo)
[![Total Downloads](https://img.shields.io/npm/dt/geo.svg)](https://www.npmjs.com/package/geo)
[![License](https://shields.io/github/license/i-rocky/geo.svg)](https://github.com/i-rocky/geo/blob/master/LICENSE)

This module contains country information including 2 and 3 character ISO codes, country and capital names, currency information, telephone calling codes, and provinces (first-tier political subdivisions).

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

## NPM Commands
The built-in test suite may be run in the traditional way
```bash
npm test
```
and to build the minified file for web, run:
```bash
npm run build
```
and retrieve the file from `dist/geo.min.js`

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