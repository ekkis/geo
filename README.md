# Country List JS

[![npm version](https://badge.fury.io/js/country-list-js.svg)](https://badge.fury.io/js/country-list-js)
[![Build Status](https://travis-ci.org/i-rocky/country-list-js.svg?branch=master)](https://travis-ci.org/i-rocky/country-list-js) [![Version](https://img.shields.io/npm/v/country-list-js.svg)](https://www.npmjs.com/package/country-list-js)
[![Total Downloads](https://img.shields.io/npm/dt/country-list-js.svg)](https://www.npmjs.com/package/country-list-js)
[![License](https://shields.io/github/license/i-rocky/country-list-js.svg)](https://github.com/i-rocky/country-list-js/blob/master/LICENSE)

This module contains country information including 2 and 3 character ISO codes, country and capital names, currency information, telephone calling codes, and provinces (first-tier political subdivisions).

The functionality in this package is also available as a service, hosted using **remote-lib**. Deploy your own instance:

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
npm install --save country-list-js
```
And get an instance of the module:
```javascript
// using ES6 modules
import country from 'country-list-js';
// using CommonJS modules
var country = require('country-list-js');
```
In a web page, you can include the module like this:
```html
<script src="/path/to/country.min.js"></script>
```

## Basic Usage
The following methods are available:

### Listing
Lists can be generated using the following convenience functions:
```js
var country_names = country.names();
var continents = country.continents();
var capitals = country.capitals();
```
but, in general, any of a country's attributes can be retrieved using the `ls` method, which can also produce the above:
```js
var country_names = country.ls('name');
var continents = country.ls('continent');
var capitals = country.ls('capital');
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
const us = country.find({ iso2: 'US' });

// Find by name and capital
const japan = country.find({ name: 'Japan', capital: 'Tokyo' });

// Find by currency
const countriesUsingUSD = country.find({ currency: 'USD' });

// Find by calling code
const denmark = country.find({ callingCode: '45' });
```

If the country cannot be found, the return value is `undefined`. If a single value is found, it is returned as an object; if multiple matches are made, an array of such objects is returned.

## Notes
* Queries are cached so only the first time a country is searched by requires traversal of the internal structures and thus calls will resolve very quickly
* Search queries are case insensitive
* Province searches include aliases so you may search for either ***Sjælland*** or ***Zealand***

## NPM Commands
The built-in test suite may be run in the traditional way
```bash
npm test
```
and to build the minified file for web, run:
```bash
npm run build
```
and retrieve the file from `dist/country.min.js`

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
