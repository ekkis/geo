import { createHash } from 'node:crypto';
import service from './vowlabs-geography.js';

const version = service.manifest().requires.ontologyVersion;
const nodes = Object.fromEntries(service.definitions().map(({code, ...node}) => [code, {
    ...node, Code: code,
    ...(node.Children ? {Children: Object.fromEntries(Object.keys(node.Children).map(key => [key, `${code}:${key}`]))} : {}),
    reference: `urn:vl:ontology:${version}:${code}`, href: `/v1/definitions/${encodeURIComponent(code)}`,
}]));
const datasets = Object.fromEntries(service.manifest().datasets.map(({id}) => {
    const info = service.dataset(id);
    const records = service.datasetRecords(id).records.map(row => ({
        ...row, definitionCode: info.definitionCode,
        reference: `urn:vl:data:${id}:${info.version}:${encodeURIComponent(row.id)}`,
    }));
    return [id, {...info, records, href: `/v1/datasets/${id}/records`}];
}));
const meta = {authority: 'Geo', ontologyVersion: version,
    revision: createHash('sha256').update(JSON.stringify({nodes, datasets})).digest('hex')};
const fail = (status, message) => { throw Object.assign(new Error(message), {status}); };
const node = code => Object.hasOwn(nodes, code) ? nodes[code] : fail(404, 'Definition not found');
const dataset = id => Object.hasOwn(datasets, id) ? datasets[id] : fail(404, 'Dataset not found');
const describe = id => { const {records, ...info} = dataset(id); return {...info, count: records.length}; };
function list(items, params) {
    const number = (key, fallback, max) => {
        const value = params.get(key);
        if (value === null) return fallback;
        if (!/^\d+$/.test(value) || !Number.isSafeInteger(+value) || +value > max || (key === 'limit' && +value === 0)) fail(400, `Invalid ${key}`);
        return +value;
    };
    const limit = number('limit', 50, 200), offset = number('offset', 0, Number.MAX_SAFE_INTEGER);
    const q = params.get('q')?.trim().toLowerCase();
    if (q) items = items.filter(item => [item.Code, item.Name, item.Description, item.Question, item.id, item.name, typeof item === 'string' ? item : ''].some(value => typeof value === 'string' && value.toLowerCase().includes(q)));
    return {data: items.slice(offset, offset + limit), meta: {...meta, total: items.length, offset, limit, nextOffset: offset + limit < items.length ? offset + limit : null}};
}
function choices(code) {
    const value = node(code).Choices;
    if (Array.isArray(value)) return value;
    if (value?.Dataset) return dataset(value.Dataset).records.map(row => row.id);
    if (typeof value === 'string') {
        const visit = code => Object.keys(node(code).Children || {}).length ? Object.values(node(code).Children).flatMap(visit) : [code];
        return Object.values(node(value).Children || {}).flatMap(visit);
    }
    return fail(404, 'Choices not found');
}
function route(parts, params) {
    const [resource, code, subresource, id] = parts;
    if (!parts.length) return {data: service.serviceInfo(), meta};
    if (resource === 'manifest' && parts.length === 1) return {data: service.manifest(), meta};
    if (resource === 'catalogue' && parts.length === 1) return {data: {version, nodes, datasets}, meta};
    if (resource === 'definitions') {
        if (parts.length === 1) {
            let codes = params.has('codes') ? params.get('codes').split(',') : Object.keys(nodes).sort();
            if (params.has('codes') && (!codes.every(Boolean) || codes.length > 100)) fail(400, 'Supply 1–100 codes');
            if (params.has('parent')) codes = Object.values(node(params.get('parent')).Children || {});
            return list(codes.map(node), params);
        }
        const value = node(code);
        if (parts.length === 2) return {data: value, meta};
        if (parts.length === 3 && subresource === 'children') return list(Object.values(value.Children || {}).map(node), params);
        if (parts.length === 3 && subresource === 'choices') return list(choices(code), params);
    }
    if (resource === 'datasets') {
        if (parts.length === 1) return list(Object.keys(datasets).sort().map(describe), params);
        if (parts.length === 2) return {data: describe(code), meta};
        const rows = dataset(code).records;
        if (subresource === 'records' && parts.length === 3) return list(rows, params);
        if (subresource === 'records' && parts.length === 4) return {data: rows.find(row => row.id === id) || fail(404, 'Record not found'), meta};
    }
    if (['countries', 'states'].includes(resource) && parts.length <= 2) return route(['datasets', resource, 'records', ...(code ? [code] : [])], params);
    return fail(404, 'Resource not found');
}
export function ontologyHandler(req, res) {
    const url = new URL(req.url, 'http://geo.local');
    if (!/^\/v1(?:\/|$)/.test(url.pathname)) return false;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'If-None-Match');
    res.setHeader('Access-Control-Expose-Headers', 'ETag, X-Ontology-Version');
    res.setHeader('X-Ontology-Version', version);
    const send = (status, payload) => {
        const body = JSON.stringify(payload);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', status === 200 ? 'public, max-age=0, must-revalidate' : 'no-store');
        if (status === 200) {
            const etag = `"${createHash('sha256').update(body).digest('hex')}"`;
            res.setHeader('ETag', etag);
            if ((req.headers?.['if-none-match'] || '').split(',').some(tag => ['*', etag].includes(tag.trim().replace(/^W\//, '')))) { res.writeHead(304); res.end(); return; }
        }
        res.setHeader('Content-Length', Buffer.byteLength(body));
        res.writeHead(status); res.end(req.method === 'HEAD' ? undefined : body);
    };
    try {
        if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return true; }
        if (!['GET', 'HEAD'].includes(req.method)) { res.setHeader('Allow', 'GET, HEAD, OPTIONS'); fail(405, 'Read-only resource'); }
        if (req.url.length > 8192) fail(400, 'Request URL too long');
        for (const key of url.searchParams.keys()) if (!['q', 'limit', 'offset', 'parent', 'codes'].includes(key) || url.searchParams.getAll(key).length !== 1) fail(400, 'Invalid query parameter');
        let parts;
        try { parts = url.pathname.replace(/\/$/, '').split('/').slice(2).map(decodeURIComponent); } catch { fail(400, 'Invalid URL encoding'); }
        send(200, route(parts, url.searchParams));
    } catch (error) {
        const status = error.status || 500;
        send(status, {error: {code: status === 404 ? '.ontology.not-found' : status === 400 ? '.ontology.invalid-request' : '.ontology.upstream-error', message: error.status ? error.message : 'Geo service error'}, meta});
    }
    return true;
}
