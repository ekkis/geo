import data from './loader.js';

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
        // Initialize cache if not exists
        if (!Entity.cache) {
            Entity.cache = {};
        }
        if (!Entity.cache[this.constructor.name]) {
            Entity.cache[this.constructor.name] = {};
        }

        // Check cache for this query (normalize to lowercase for caching)
        const cacheKey = name.toLowerCase();
        if (Entity.cache[this.constructor.name][cacheKey]) {
            return Entity.cache[this.constructor.name][cacheKey];
        }

        // Search for exact name match (case-insensitive)
        const key = Object.keys(this.data).find(k => {
            const entryName = this.data[k].name;
            if (!entryName) return false;

            // If name is a string, compare directly
            if (typeof entryName === 'string') {
                return entryName.toLowerCase() === name.toLowerCase();
            }
            // If name is an object, check common and official fields
            if (typeof entryName === 'object') {
                // Handle both common and official names
                const common = entryName.common || '';
                const official = entryName.official || '';
                return common.toLowerCase() === name.toLowerCase() ||
                       official.toLowerCase() === name.toLowerCase();
            }
            return false;
        });

        if (key) {
            Entity.cache[this.constructor.name][cacheKey] = this.data[key];
            return this.data[key];
        }

        // If not found, return null
        return null;
    }

    findByCode(code) {
        return this.data[code] || null;
    }
}

const geo = Object.keys(data).map(key => new Entity(data[key]));
export default geo