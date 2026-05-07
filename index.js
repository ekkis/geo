
'use strict';

const data = require('./loader');

// Base Entity class with list and find methods
class Entity {
    constructor(data) {
        this.data = data;
    }
    
    list() {
        return Object.values(this.data);
    }
    
    find(criteria) {
        if (typeof criteria === 'string') {
            criteria = { name: criteria };
        }
        criteria = criteria || {};
    
        if (Object.keys(criteria).length === 1 && 'name' in criteria) {
            return this.findByName(criteria.name);
        }
    
        const results = [];
        for (const [key, entry] of Object.entries(this.data)) {
            let matches = true;
    
            for (const [key2, value] of Object.entries(criteria)) {
                if (!entry[key2]) {
                    matches = false;
                    break;
                }
    
                if (Array.isArray(value)) {
                    if (!value.some(v => 
                        entry[key2].toString().toLowerCase().includes(v.toString().toLowerCase())
                    )) {
                        matches = false;
                        break;
                    }
                } else if (typeof entry[key2] === 'string' && typeof value === 'string') {
                    if (entry[key2].toLowerCase() !== value.toLowerCase()) {
                        matches = false;
                        break;
                    }
                } else if (entry[key2] !== value) {
                    matches = false;
                    break;
                }
            }
    
            if (matches) results.push(entry);
        }
    
        return results.length === 1 ? results[0] : results;
    }
    
    findByName(name) {
        // First check cache
        if (!(this.constructor.name in Entity.cache)) {
            Entity.cache[this.constructor.name] = {};
        }
        if (Entity.cache[this.constructor.name][name]) {
            return Entity.cache[this.constructor.name][name];
        }
        
        // Search for exact name match (case-insensitive)
        const key = Object.keys(this.data).find(k => 
            this.data[k].name && this.data[k].name.toLowerCase() === name.toLowerCase()
        );
        
        if (key) {
            Entity.cache[this.constructor.name][name] = this.data[key];
            return this.data[key];
        }
        
        // If not found, try partial match?
        return null;
    }
    
    findByCode(code) {
        // For countries, codes are ISO alpha-2
        // For regions, codes are subdivision codes
        // For continents, codes are continent codes
        // For languages, codes are language codes
        return this.data[code] || null;
    }
    
    // Additional helper methods can be added as needed
}

// Extend Entity for specific entity types
class CountryEntity extends Entity {
    neighbours(country, direction) {
        // country can be ISO code or country name
        let key = country;
        if (country.length !== 2) {
            key = Object.keys(this.data).find(k => 
                this.data[k].name && this.data[k].name.toLowerCase() === country.toLowerCase()
            );
        }
        if (!key) return [];
        
        const entry = this.data[key];
        if (!entry.neighbours) return [];
        
        const neighbors = entry.neighbours;
        if (!direction) {
            return Object.values(neighbors).flat().map(code => this.findByCode(code)).filter(Boolean);
        }
        
        const normalizedDir = direction.toUpperCase();
        if (!neighbors[normalizedDir]) return [];
        
        return neighbors[normalizedDir].map(code => this.findByCode(code)).filter(Boolean);
    }
    
    // Additional country-specific methods can go here
}

class RegionEntity extends Entity {
    // Regions are structured with top-level region names containing subdivisions
    // list() returns all regions as objects with their subdivisions
    // find() can search by region name or by subdivision code
    
    findSubdivision(code) {
        for (const [regionName, subdivisions] of Object.entries(this.data)) {
            if (code in subdivisions) {
                return { region: regionName, subdivision: subdivisions[code] };
            }
        }
        return null;
    }
}

class ContinentEntity extends Entity {
    // Continents are simple mapping of code to name
    // list() returns array of continent objects with code and name
    list() {
        return Object.keys(this.data).map(code => ({ code, name: this.data[code] }));
    }
}

class LanguageEntity extends Entity {
    // Languages are array of objects with name and code
    // Already loaded as object with code as key
    list() {
        return Object.values(this.data);
    }
}

class CurrencyEntity extends Entity {
    // Currencies are object with currency codes as keys
    list() {
        return Object.values(this.data);
    }
}

// Create entity instances
const country = new CountryEntity(data.countries);
const region = new RegionEntity(data.regions);
const continent = new ContinentEntity(data.continents);
const language = new LanguageEntity(data.languages);
const currency = new CurrencyEntity(data.currencies);

// Export entities
module.exports = {
    country,
    region,
    continent,
    language,
    currency,
    
    // Legacy aliases for backward compatibility (optional)
    all: country.list(),
    allCountries: country.list,
    allRegions: region.list,
    allContinents: continent.list,
    allLanguages: language.list,
    allCurrencies: currency.list,
    
    // Legacy methods (can be kept for compatibility)
    names: () => country.list().map(c => c.name),
    capitals: () => country.list().map(c => c.capital).filter(c => c),
    find: country.find.bind(country),
    continents: () => continent.list(),
    neighbours: country.neighbours.bind(country)
};
