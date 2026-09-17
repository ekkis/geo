import data from './loader.js';

function flat(r, depth = 1) {
    var f = (ret, v) => ret.concat(Array.isArray(v) && depth > 0 ? v.flat(depth - 1) : v);
    return r.reduce(f, []);
}
function isObj(o) {
    return o && typeof o === 'object' && !Array.isArray(o);
}
function pathify(o, delim = '/') {
    const ret = Object.keys(o).map(k => {
        return o[k] && isObj(o[k])
            ? pathify(o[k], delim).map(p => k + delim + p)
            : k + delim + JSON.stringify(o[k]);
    });
    return flat(ret);
}
function pathChk(o, path) {
    var attrs = path.split('/');
    var v = attrs.pop();
    for (const k of attrs) {
        if (!o[k]) return false;
        o = o[k];
    }
    return JSON.stringify(o) == v;
}
// Base Entity class with list and find methods
class Entity {
    constructor(info) {
        this.info = { ...info, data: info.data || {} };
    }
    keys() {
        return Object.keys(this.info.data);
    }
    meta() {
        return this.info.meta || {};
    }
    list(opts = {}) {
        var ret = this.info.data;
        if (opts.raw) return ret;
        ret = Object.values(ret);
        if (opts.name) ret = ret.map(o => o.name ?? o);
        return ret;
    }
    get(key) {
        var record = Object.hasOwn(this.info.data, key) ? this.info.data[key] : undefined;
        return record ? structuredClone(record) : undefined;
    }
    addressFormat(key) {
        var record = Object.hasOwn(this.info.data, key) ? this.info.data[key] : undefined;
        return record && record['address-format'] ? structuredClone(record['address-format']) : undefined;
    }
    addressHeaders(key) {
        var format = this.addressFormat(key);
        if (!format) return undefined;

        return Object.keys(format.fields || {}).reduce((headers, field) => {
            headers[field] = format.fields[field].header;
            return headers;
        }, {});
    }
    addressForm(key) {
        var format = this.addressFormat(key);
        if (!format) return undefined;

        var fields = structuredClone(format.fields || {});
        Object.values(fields).forEach(field => {
            if (field.validation) delete field.validation.examples;
        });

        return {
            format: format.format,
            fields
        };
    }
    find(opts = {}, legacyOpts = {}) {
        if (opts == null) throw new Error('Criteria is required for find method');
        // Accept both the options object and the previous find(criteria, opts) API.
        if (typeof opts === 'string' || Array.isArray(opts) ||
            !Object.hasOwn(opts, 'criteria')) {
            opts = { ...legacyOpts, criteria: opts };
        }
        var criteria = opts.criteria;
        if (!criteria || (isObj(criteria) && !Object.keys(criteria).length)) throw new Error('Criteria is required for find method');
        
        var ret = [];

        if (typeof criteria === 'string') {
            // user passed a key
            if (Object.hasOwn(this.info.data, criteria)) ret.push(this.info.data[criteria]);
        } else if (Array.isArray(criteria)) {
            // or an array of keys
            ret = criteria.filter(k => Object.hasOwn(this.info.data, k)).map(k => this.info.data[k]);
        } else {
            criteria = pathify(criteria);
            ret = Object.values(this.info.data).filter(v => {
                var m = criteria.filter(p => pathChk(v, p));
                return m.length == criteria.length;
            });
        }
        if (opts.hydrate && !opts.raw) {
            // Hydration must not rewrite the shared database used by later queries.
            ret = structuredClone(ret);
            for (const record of ret) {
                if (!isObj(record)) continue;
                for (const key of Object.keys(record)) {
                    const match = key.match(/^(\w+)-codes?$/);
                    if (!match || !data[match[1]]?.data) continue;
                    const values = data[match[1]].data;
                    const resolve = code => {
                        const value = Object.hasOwn(values, code) ? values[code] : code;
                        return structuredClone(opts.name ? value?.name ?? value : value);
                    };
                    const value = record[key];
                    // Structured code maps require a schema; preserve them as supplied.
                    if (typeof value !== 'string' && !Array.isArray(value)) continue;
                    const newKey = key.replace(/y-codes$/, 'ies').replace(/-code/, '');
                    record[newKey] = Array.isArray(value) ? value.map(resolve) : resolve(value);
                    delete record[key];
                }
            }
        }
        if (opts.singleton) {
            if (ret.length == 1) ret = ret[0];
        }
        return ret;
    }
}

export default Object.keys(data).reduce(
    (o, key) => (o[key] = new Entity(data[key]), o), {}
);
