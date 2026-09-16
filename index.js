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
function clone(o) {
    return o === undefined ? undefined : JSON.parse(JSON.stringify(o))
}
function recordData(record) {
    return record && record.data ? record.data : record
}
function words(s) {
    return s.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
function fieldsFromFormat(format) {
    var fieldCodes = {
        N: 'recipient',
        O: 'organization',
        A: 'street-address',
        D: 'dependent-locality',
        C: 'locality',
        S: 'administrative-area',
        Z: 'postal-code',
        X: 'sorting-code'
    }
    var fields = []
    var re = /%([NOADCSZX])/g
    var match
    while ((match = re.exec(format || ''))) {
        var field = fieldCodes[match[1]]
        if (field && !fields.includes(field)) fields.push(field)
    }
    return fields
}
function defaultLabel(field) {
    return {
        'recipient': 'Recipient',
        'organization': 'Organization',
        'street-address': 'Street Address',
        'dependent-locality': 'Dependent Locality',
        'locality': 'Locality',
        'administrative-area': 'Administrative Area',
        'postal-code': 'Postal Code',
        'sorting-code': 'Sorting Code'
    }[field] || words(field)
}
function labelFor(field, labels = {}) {
    var label = labels[field]
    if (label == 'zip') return 'ZIP'
    return words(label || defaultLabel(field))
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
    get(key) {
        var record = this.data[key]
        return record ? clone(record) : undefined
    }
    addressFormat(key) {
        var record = recordData(this.data[key])
        return record && record['address-format'] ? clone(record['address-format']) : undefined
    }
    addressHeaders(key) {
        var format = this.addressFormat(key)
        if (!format) return undefined

        var labels = format['field-labels'] || {}
        var fields = fieldsFromFormat(format.format)
        return fields.reduce((headers, field) => {
            headers[field] = labelFor(field, labels)
            return headers
        }, {})
    }
    addressForm(key) {
        var format = this.addressFormat(key)
        if (!format) return undefined

        var headers = this.addressHeaders(key)
        var required = new Set(format['required-fields'] || [])
        var uppercase = new Set(format['uppercase-fields'] || [])
        var fields = Object.keys(headers).map(field => {
            var ret = {
                key: field,
                required: required.has(field),
                uppercase: uppercase.has(field)
            }
            if (field == 'postal-code' && format['postal-code']) {
                ret.validation = clone(format['postal-code'])
            }
            return ret
        })

        return {
            format: format.format,
            headers,
            fields
        }
    }
    find(criteria, opts = {}) {
        // no criteria provided
        if (!criteria) throw new Error('Criteria is required for find method')
        
        var ret = []

        if (typeof criteria === 'string') {
            // user passed a key
            ret.push(this.data[criteria])
        } else if (Array.isArray(criteria)) {
            // or an array of keys
            ret.concat(criteria.map(k => this.data[k] || null).filter(Boolean))
        } else {
            criteria = pathify(criteria)
            ret = Object.values(this.data).filter(v => {
                var m = criteria.filter(p => pathChk(v, p))
                return m.length == criteria.length
            })
        }
        if (opts.hydrate) {
            function parseKey(k) {
                return [
                    k.replace(/y-codes$/, 'ies').replace(/-code/, ''),
                    k.replace(/-codes?$/, '')
                ]
            }
            function chkey(o, k, nk) {
                o[nk] = o[k]
                delete o[k]
            }
            function ho(o, levels) {
                if (typeof o == 'string')
                    return data[levels[0]][o]
                else if (Array.isArray(o))
                    return o.map(v => ho(v, levels))
                else if (typeof o == 'object') {
                    for (const k of Object.keys(o)) {
                        ho(o[k], levels.slice(1))
                        chkey(o, k, data[levels[0]][o[k]])
                    }
                }
                return o
            }
            for (var i = 0; i < ret.length; i++) {
                Object.keys(ret[i]).filter(k => {
                    var m = k.match(/(\w+)-codes?$/)
                    return m && m[1] in data
                }).forEach(k => {
                    var [newKey, domain] = parseKey(k)
                    var hasSchema = data[domain].schema
                    var val = ret[i][k]
                    if (typeof val == 'string') {
                        val = data[domain][val]
                    } else if (Array.isArray(val)) {
                        val = val.map(v => data[domain][v])
                    } else if (typeof val == 'object' && hasSchema) {
                        val = ho(val, data[domain].schema)
                    }
                    ret[i][newKey] = val
                    delete ret[i][k]
                })
                // for (const k of Object.keys(ret[i]))
                //     if (k in data) ret[i][k] = data[k][ret[i][k]]
            }
        }
        if (opts.singleton) {
            if (ret.length == 1) ret = ret[0]
        }
        return ret
    }
}

export default Object.keys(data).reduce(
    (o, key) => (o[key] = new Entity(data[key]), o), {}
)