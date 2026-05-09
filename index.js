import data from './loader.js';

function flat(r, depth = 1) {
    var f = (ret, v) => ret.concat(Array.isArray(v) && depth > 0 ? v.flat(depth - 1) : v)
    return r.reduce(f, [])
}
function isObj(o) {
    return o && typeof o === 'object' && !Array.isArray(o);
}
function pathify(o, delim = '/') {
    const ret = Object.keys(o).map(k => {
        return o[k] && isObj(o[k])
            ? pathify(o[k], delim).map(p => k + delim + p)
            : k + delim + JSON.stringify(o[k])
    })
    return flat(ret)
}
function pathChk(o, path) {
    var attrs = path.split('/')
    var v = attrs.pop()
    for (const k of attrs) {
        if (!o[k]) return false
        o = o[k]
    }
    return JSON.stringify(o) == v
}
// Base Entity class with list and find methods
class Entity {
    constructor(data) {
        this.data = data;
    }
    keys() {
        return Object.keys(this.data);
    }
    list() {
        return Object.values(this.data);
    }
    find(criteria) {
        // no criteria provided
        if (!criteria) throw new Error('Criteria is required for find method')
        
        // user passed a key
        if (typeof criteria === 'string') {
            return this.data[criteria] || null;
        }
        // or an array of keys
        if (Array.isArray(criteria)) {
            return criteria.map(k => this.data[k] || null).filter(Boolean);
        }
        criteria = pathify(criteria)

        var ret = []
        for (const v of Object.values(this.data)) {
            var m = 0
            for (var i = 0; i < criteria.length; i++) {
                if (pathChk(v, criteria[i])) m++
            }
            if (m === criteria.length) {
                ret.push(v)
            }
        }
        return ret
    }
    hydrate(code) {
        var o = this.data[code]
        for (const k of Object.keys(o)) {
            if (k in this.data) o[k] = this.data[o[k]]
        }
    }
}

export default Object.keys(data).reduce(
    (o, key) => (o[key] = new Entity(data[key]), o), {}
)