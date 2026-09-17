import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import geo from '../index.js';

const cli = fileURLToPath(new URL('../cli', import.meta.url));
const run = (...args) => JSON.parse(execFileSync(process.execPath, [cli, ...args], { encoding: 'utf8', cwd: '/tmp', maxBuffer: 16 * 1024 * 1024 }));

test('loads domain metadata, country records, and nested supplement files', () => {
    assert.equal(geo.country.keys().length, 250);
    assert.equal(geo.country.meta().name, 'Country');
    const us = geo.country.list({ raw: true }).US;
    assert.equal(us.name.common, 'United States');
    assert.equal(us.meta.division, 'region');
    assert.equal(us.state.CA.name, 'California');
    assert.ok(us.region.city.CA.length > 0);
    assert.deepEqual(geo.neighbour.keys(), []);
    assert.ok(geo.currency.list({ name: true }).includes('United States dollar'));
    assert.ok(geo.organisation.list({ name: true }).includes('North Atlantic Treaty Organization'));
});

test('find supports keys, arrays, nested criteria, and previous calling convention', () => {
    assert.equal(geo.country.find({ criteria: 'US', singleton: true }).iso3, 'USA');
    assert.equal(geo.country.find({ criteria: ['US', 'CA', 'missing'] }).length, 2);
    assert.equal(geo.country.find({ criteria: { name: { common: 'United States' } } })[0].iso3, 'USA');
    assert.equal(geo.country.find('US', { singleton: true }).iso3, 'USA');
    assert.equal(geo.country.find({ iso3: 'USA' })[0].iso3, 'USA');
    assert.deepEqual(geo.country.find({ criteria: 'missing', hydrate: true }), []);
    assert.throws(() => geo.country.find(), /Criteria is required/);
});

test('hydration resolves known codes without changing raw records or losing unknown codes', () => {
    const before = structuredClone(geo.country.find('US'));
    const us = geo.country.find({ criteria: 'US', hydrate: true, name: true, singleton: true });
    assert.deepEqual(us.currencies, ['United States dollar']);
    assert.deepEqual(us.regions, ['North America']);
    assert.equal(us.continent, 'NA'); // Unresolved reference in the source data.
    assert.deepEqual(us['neighbour-codes'], before[0]['neighbour-codes']);
    assert.deepEqual(geo.country.find('US'), before);
    const hydrated = geo.country.find({ criteria: 'US', hydrate: true, singleton: true });
    hydrated.currencies[0].name = 'changed';
    assert.equal(geo.currency.find('USD')[0].name, 'United States dollar');
    assert.deepEqual(geo.country.find({ criteria: 'US', hydrate: true, raw: true }), before);
});

test('CLI supports keys, JSON criteria, flags, and invocation from another directory', () => {
    assert.equal(run('country', 'find', '-c', 'US')[0].iso3, 'USA');
    assert.equal(run('country', 'find', '-c', '{"iso3":"USA"}')[0].iso3, 'USA');
    assert.equal(run('country', 'find', '-c', '["US","CA"]').length, 2);
    assert.deepEqual(run('country', 'find', '-c', 'US', '-H', '-n')[0].currencies, ['United States dollar']);
    assert.ok(run('currency', 'list', '-n').includes('United States dollar'));
    assert.equal(run('currency', 'list', '-r').USD.code, 'USD');
    assert.match(execFileSync(process.execPath, [cli, '-h'], { encoding: 'utf8' }), /Usage:/);
    for (const args of [['bad', 'list'], ['country', 'constructor'], ['country', 'find', '-c', '{bad']]) {
        assert.equal(spawnSync(process.execPath, [cli, ...args]).status, 1);
    }
});
