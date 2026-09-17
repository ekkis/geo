import { pathToFileURL } from 'node:url';
import micro from 'micro';
import geo from './index.js';

export default async function handler(req, res) {
    const query = new URL(req.url, 'http://localhost').searchParams;
    const domain = query.get('domain') || 'country';
    const method = query.get('method');
    if (!Object.hasOwn(geo, domain) || !['keys', 'meta', 'list', 'find'].includes(method)) {
        res.statusCode = 400;
        return { error: 'Unknown domain or method' };
    }

    const opts = {};
    for (const flag of ['name', 'hydrate', 'raw', 'singleton']) {
        opts[flag] = query.has(flag) && query.get(flag) !== 'false';
    }
    const criteria = query.get('criteria') ?? query.get('code');
    if (criteria !== null) {
        try {
            opts.criteria = JSON.parse(criteria);
        } catch {
            if (/^[\s]*[\[{"]/.test(criteria)) {
                res.statusCode = 400;
                return { error: 'Invalid JSON criteria' };
            }
            opts.criteria = criteria;
        }
    }
    if (method === 'find' && (!opts.criteria ||
        (typeof opts.criteria !== 'string' && !Array.isArray(opts.criteria) &&
            (typeof opts.criteria !== 'object' || !Object.keys(opts.criteria).length)))) {
        res.statusCode = 400;
        return { error: 'Criteria must be a key, an array of keys, or a nonempty object' };
    }
    return geo[domain][method](opts);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    micro(handler).listen(Number(process.env.PORT || 3000));
}
