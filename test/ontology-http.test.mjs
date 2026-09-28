import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {ontologyHandler} from '../service/ontology-api.js';

test('Geo REST contract preserves codes, choices, paging, errors and cache headers', async () => {
    const server = createServer(ontologyHandler);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}`;
    const get = async path => {
        const response = await fetch(base + path);
        assert.equal(response.status, 200, path);
        return response.json();
    };
    try {
        const snapshot = await get('/v1/catalogue');
        assert.equal(snapshot.meta.ontologyVersion, '10.3.0');
        assert.ok(Object.values(snapshot.data.nodes).every(node => typeof node.Collection === 'boolean' && typeof node.Composite === 'boolean'));
        const address = await get('/v1/definitions/S:G:AD:US');
        assert.equal(address.data.Collection, true);
        assert.equal(address.data.Composite, true);
        const roles = await get('/v1/definitions/S:G:AD:US:R/choices');
        assert.equal(roles.data.length, 8);
        assert.ok(roles.data.includes('S:G:AD:RO:RE'));
        const countries = await get('/v1/definitions/S:G:AD:US:CO/choices?limit=200');
        assert.equal(countries.data.length, 200);
        assert.equal(countries.meta.total, 250);
        assert.equal(countries.meta.nextOffset, 200);
        const states = await get('/v1/datasets/states/records?limit=1');
        assert.equal(states.meta.total, 5046);
        assert.match(states.data[0].reference, /^urn:vl:data:states:2:/);
        const result = await get('/v1/definitions?parent=S:G&limit=1&offset=1');
        assert.equal(result.data.length, 1);
        assert.equal(result.meta.total, 3);
        for (const [path, status] of [
            ['/v1/definitions/S:GG', 404], ['/v1/definitions/S:G:NOPE', 404],
            ['/v1/datasets/__proto__', 404], ['/v1/definitions?limit=201', 400],
            ['/v1/definitions?offset=-1', 400], ['/v1/definitions?limit=1&limit=2', 400]
        ]) assert.equal((await fetch(base + path)).status, status, path);
        const first = await fetch(base + '/v1/definitions/S:G');
        const head = await fetch(base + '/v1/definitions/S:G', {method: 'HEAD'});
        assert.equal(head.status, 200);
        assert.equal(head.headers.get('etag'), first.headers.get('etag'));
        assert.equal(await head.text(), '');
        const cached = await fetch(base + '/v1/definitions/S:G', {headers: {'if-none-match': first.headers.get('etag')}});
        assert.equal(cached.status, 304);
        assert.equal((await fetch(base + '/v1/definitions/S:G', {method: 'POST'})).status, 405);
    } finally {
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
    }
});
