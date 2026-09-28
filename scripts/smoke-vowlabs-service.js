#!/usr/bin/env node
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import handler from '../api/index.js';
import service from '../service/vowlabs-geography.js';

class MockReq extends EventEmitter {
    constructor(method, url, body) {
        super();
        this.method = method;
        this.url = url;
        this.body = body;
    }
}

class MockRes {
    constructor() {
        this.statusCode = 200;
        this.headers = {};
        this.body = '';
    }

    setHeader(key, value) {
        this.headers[key.toLowerCase()] = value;
    }

    writeHead(status) {
        this.statusCode = status;
    }

    end(chunk = '') {
        this.body += chunk;
        this.done?.();
    }
}

const liveOrigin = process.argv[2] ? new URL(process.argv[2]).origin : null;

async function call(method, url, body) {
    if (liveOrigin) {
        const response = await fetch(new URL(url, liveOrigin), {
            method,
            headers: body ? { 'Content-Type': 'application/json' } : {},
            body: body ? JSON.stringify(body) : undefined,
            redirect: 'manual',
            signal: AbortSignal.timeout(15000),
        });
        assert.ok(response.status < 300,
            `${url}: HTTP ${response.status}; the public endpoint must return JSON without authentication redirects`);
        return { status: response.status, body: await response.json() };
    }
    const req = new MockReq(method, url, body);
    const res = new MockRes();
    const done = new Promise(resolve => {
        res.done = resolve;
    });
    await handler(req, res);
    await done;
    return {
        status: res.statusCode,
        headers: res.headers,
        body: res.body ? JSON.parse(res.body) : null,
    };
}

assert.equal(service.manifest().prefix, 'S:G');
assert.equal(service.definition('S:G').Name, 'Geography');
assert.equal(service.definitionChildren('S:G').length, 3);
assert.equal(service.dataset('countries').count, 250);
assert.equal(service.datasetRecords('states', { limit: 1 }).records.length, 1);

let response = await call('GET', '/health');
assert.equal(response.status, 200);
assert.equal(response.body.status, 'ok');

response = await call('GET', '/metadata');
assert.equal(response.status, 200);
assert.equal(response.body.success, true);
assert(response.body.metadata.methods.includes('definition'));

response = await call('POST', '/invoke', { method: 'definition', args: ['S:G:CO'] });
assert.equal(response.status, 200);
assert.equal(response.body.success, true);
assert.equal(response.body.result.Name, 'Country');

response = await call('GET', '/v1/definitions/S%3AG/children');
assert.equal(response.status, 200);
assert.deepEqual(response.body.data.map(item => item.Code).sort(), ['S:G:AD', 'S:G:CO', 'S:G:SD']);

response = await call('GET', '/v1/datasets/countries/records?limit=1');
assert.equal(response.status, 200);
assert.equal(response.body.data.length, 1);
assert.equal(response.body.data[0].definitionCode, 'S:G:CO');

response = await call('GET', '/v1/datasets/states/records/US-CA');
assert.equal(response.status, 200);
assert.equal(response.body.data.id, 'US-CA');

response = await call('POST', '/invoke', { method: 'country', args: ['G:CO:US'] });
assert.equal(response.status, 200);
assert.equal(response.body.result.iso2, 'US');

response = await call('GET', '/v1/manifest');
assert.equal(response.body.data.delivery.url, 'https://geo-ekkis.vercel.app/v1/');

// Exercise every advertised definition and child route, including address roles.
for (const definition of service.definitions()) {
    const path = `/v1/definitions/${encodeURIComponent(definition.code)}`;
    response = await call('GET', path);
    assert.equal(response.status, 200);
    assert.equal(response.body.data.Name, definition.Name);
    response = await call('GET', `${path}/children`);
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data.map(child => child.Code).sort(),
        Object.keys(definition.Children || {}).map(key => `${definition.code}:${key}`).sort());
}

for (const dataset of service.manifest().datasets) {
    response = await call('GET', `/v1/datasets/${dataset.id}`);
    assert.equal(response.status, 200);
    assert.equal(response.body.data.definitionCode, dataset.definitionCode);
    assert.equal(response.body.data.count, service.dataset(dataset.id).count);
}

console.log(`VowLabs service smoke test passed (${liveOrigin || 'local handler'})`);
