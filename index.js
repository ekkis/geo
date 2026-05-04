'use strict';

var self = module.exports = {
    all: {},
    cache: {},
    ls(field) {
        return Object.keys(this.all).map(k => this.all[k][field]);
    },
    continents() {
        return this.ls('continent').unique();
    },
    names() {
        return this.ls('name');
    },
    capitals() {
        return this.ls('capital');
    },
    find(criteria) {
        if (typeof criteria === 'string') {
            criteria = { name: criteria };
        }
        criteria = criteria || {};

        if (Object.keys(criteria).length === 1 && 'name' in criteria) {
            return find('name', criteria.name);
        }

        const results = [];
        for (const [iso2, entry] of Object.entries(self.all)) {
            let matches = true;

            for (const [key, value] of Object.entries(criteria)) {
                if (!entry[key]) {
                    matches = false;
                    break;
                }

                if (Array.isArray(value)) {
                    if (!value.some(v =>
                        entry[key].toString().toLowerCase().includes(v.toString().toLowerCase())
                    )) {
                        matches = false;
                        break;
                    }
                } else if (typeof entry[key] === 'string' && typeof value === 'string') {
                    if (entry[key].toLowerCase() !== value.toLowerCase()) {
                        matches = false;
                        break;
                    }
                } else if (entry[key] !== value) {
                    matches = false;
                    break;
                }
            }

            if (matches) results.push(entry);
        }

        return results.length === 1 ? results[0] : results;
    },

    neighbours(country, direction) {
        const key = country.length === 2 ? country : Object.keys(self.all).find(k =>
            self.all[k].name.toLowerCase() === country.toLowerCase()
        );

        if (!key) return [];

        const entry = self.all[key];
        if (!entry.neighbors) return [];

        const neighbors = entry.neighbors;

        if (!direction) {
            return Object.values(neighbors).flat().map(code => self.all[code]).filter(Boolean);
        }

        const normalizedDir = direction.toUpperCase();
        if (!neighbors[normalizedDir]) return [];

        return neighbors[normalizedDir].map(code => self.all[code]).filter(Boolean);
    }
};

function find(prop, val) {
    if (!(prop in self.cache)) self.cache[prop] = {};
    if (self.cache[prop][val])
        return self.cache[prop][val];

    return self.cache[prop][val] = Object.keys(self.all)
        .filter(k => self.all[k][prop] == val)
        .map(k => self.all[k])
        .unpack(undefined);
}

function loadData() {
    const fs = require('fs');
    const path = require('path');
    const dataDir = path.join(__dirname, 'data');
    const data = {};
    const codeQueue = [];

    fs.readdirSync(dataDir)
        .filter(f => f.endsWith('.json'))
        .forEach(f => {
            const name = f.slice(0, -5);
            const isCode = name.endsWith('-code');
            const base = isCode ? name.slice(0, -5) : name;
            const content = require(path.join(dataDir, f));
            const hyphenIdx = base.indexOf('-');

            let top = null, key = base;
            if (hyphenIdx !== -1) {
                top = base.slice(0, hyphenIdx);
                const rest = base.slice(hyphenIdx + 1);
                key = rest.replace(/-(\w)/g, (_, c) => c.toUpperCase());
            }

            if (isCode) {
                codeQueue.push({ top, key, content });
            } else if (top) {
                if (!data[top]) data[top] = {};
                data[top][key] = content;
            } else {
                data[key] = content;
            }
        });

    codeQueue.forEach(({ top, key, content }) => {
        const lookup = data[key] || data[key + 's'];
        const resolved = {};
        for (const [k, code] of Object.entries(content))
            resolved[k] = lookup ? lookup[code] ?? code : code;
        if (top) {
            if (!data[top]) data[top] = {};
            data[top][key] = resolved;
        } else {
            data[key] = resolved;
        }
    });

    return data;
}

const data = loadData();

function buildCountry(code) {
  var ret = {}
  Object.keys(data.country).forEach(k => {
    ret[k] = data.country[k][code]
  })
  return ret
}
Object.keys(data.country.iso3).forEach(k => {
    self.all[k] = buildCountry(k)
})

Array.prototype.unpack = function() {
    var l = this.length;
    return l == 1 ? this[0]
        : l == 0 && arguments.length > 0
        ? undefined
        : this;
}

Array.prototype.unique = function() {
    return this.filter((e, pos) => this.indexOf(e) == pos);
}
