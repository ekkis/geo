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

async function call(method, url, body) {
    const req = new MockReq(method, url, body);
    const res = new MockRes();
    const done = new Promise(resolve => {
        res.done = resolve;
    });
    await handler(req, res);
    await done;
    const contentType = res.headers['content-type'] || '';
    return {
        status: res.statusCode,
        headers: res.headers,
        body: res.body && contentType.includes('application/json') ? JSON.parse(res.body) : res.body,
    };
}

assert.equal(service.manifest().prefix, 'S:G');
assert.equal(service.definition('S:G').Name, 'Geography');
assert.equal(service.definitionChildren('S:G').length, 3);
assert.equal(service.dataset('countries').count, 250);
assert.equal(service.datasetRecords('states', { limit: 1 }).records.length, 1);

let response = await call('GET', '/');
assert.equal(response.status, 200);
assert(response.headers['content-type'].includes('text/html'));
assert(response.body.includes('Geo VowLabs Science/Geography Service'));
assert(response.body.includes('/v1/manifest'));

response = await call('GET', '/health');
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
assert.deepEqual(response.body.map(item => item.code).sort(), ['S:G:AD', 'S:G:CO', 'S:G:SD']);

response = await call('GET', '/v1/datasets/countries/records?limit=1');
assert.equal(response.status, 200);
assert.equal(response.body.records.length, 1);
assert.equal(response.body.records[0].definitionCode, 'S:G:CO');

response = await call('GET', '/v1/datasets/states/records/US-CA');
assert.equal(response.status, 200);
assert.equal(response.body.id, 'US-CA');

console.log('VowLabs remote-lib service smoke test passed');
