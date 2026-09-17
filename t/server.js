import assert from 'node:assert/strict';
import { once } from 'node:events';
import { describe, it, before, after } from 'node:test';
import micro from 'micro';
import handler from '../server.js';

describe('Server fetches', () => {
    let service, url;
    before(async () => {
        service = micro(handler);
        service.listen(0, '127.0.0.1');
        await once(service, 'listening');
        url = `http://127.0.0.1:${service.address().port}/`;
    });
    after(async () => {
        if (service?.listening) {
            const closed = once(service, 'close');
            service.close();
            service.closeAllConnections();
            await closed;
        }
    });
    async function call(query, status = 200) {
        const response = await fetch(url + '?' + new URLSearchParams(query));
        assert.equal(response.status, status);
        return response.json();
    }
    it('lists continent names', async () => {
        const names = await call({ domain: 'continent', method: 'list', name: 'true' });
        assert.deepEqual(names.sort(), ['Africa', 'America', 'Antarctica', 'Asia', 'Europe', 'Oceania']);
    });
    it('finds a country by code', async () => {
        const country = await call({ method: 'find', code: 'DK', singleton: 'true' });
        assert.equal(country.iso3, 'DNK');
        assert.equal(country.capital.en, 'Copenhagen');
    });
    it('accepts JSON criteria and hydration options', async () => {
        const countries = await call({ method: 'find', criteria: '{"iso3":"USA"}', hydrate: 'true', name: 'true' });
        assert.deepEqual(countries[0].currencies, ['United States dollar']);
    });
    it('honors false flags and raw output', async () => {
        const currencies = await call({ domain: 'currency', method: 'list', raw: 'true' });
        assert.equal(currencies.USD.code, 'USD');
        const countries = await call({ method: 'find', code: 'DK', singleton: 'false' });
        assert.ok(Array.isArray(countries));
    });
    it('rejects unknown and inherited methods and invalid criteria', async () => {
        for (const query of [
            {}, { domain: 'missing', method: 'list' }, { domain: '__proto__', method: 'list' },
            { method: 'constructor' }, { method: 'find' },
            { method: 'find', criteria: '{bad' }, { method: 'find', criteria: 'null' },
            { method: 'find', criteria: '42' },
        ]) {
            assert.equal(typeof (await call(query, 400)).error, 'string');
        }
    });
});
