import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import service from '../service/vowlabs-geography.js';

test('ontology exposes canonical address fields and every role', () => {
    assert.equal(service.definition('S:G:AD:US:C').Name, 'City');
    assert.equal(service.definition('S:G:AD:US:RE').Name, 'Region');
    assert.equal(service.definitionChildren('S:G:AD:RO').length, 8);
    assert.equal(service.definitions().length, 33);
});

test('ontology HTTP and RPC routes serve the complete registered contribution', () => {
    execFileSync(process.execPath, [fileURLToPath(new URL('../scripts/smoke-vowlabs-service.js', import.meta.url))]);
});


test('Geo distinguishes repeatable values from composite datapoints', () => {
    for (const node of service.definitions()) {
        assert.equal(typeof node.Collection, 'boolean', node.code);
        assert.equal(typeof node.Composite, 'boolean', node.code);
    }
    const address = service.definition('S:G:AD:US');
    assert.equal(address.Collection, true);
    assert.equal(address.Composite, true);
    for (const field of service.definitionChildren('S:G:AD:US')) {
        assert.equal(field.Collection, false, field.code);
        assert.equal(field.Composite, false, field.code);
    }
    for (const code of ['S:G', 'S:G:CO', 'S:G:SD', 'S:G:AD:RO']) {
        assert.equal(service.definition(code).Collection, false, code);
        assert.equal(service.definition(code).Composite, false, code);
    }
    assert.equal(service.manifest().requires.ontologyVersion, '10.2.0');
});

test('Address selects Geo country formats and keeps historical US records', () => {
    const address = service.definition('S:G:AD');
    assert.equal(address.Composite, true);
    assert.equal(address.Collection, true);
    assert.equal(address.AddressFormat.CountryField, 'CO');
    assert.deepEqual(address.RequiredFields, ['CO']);
    assert.equal(service.definition('S:G:AD:US').Legacy, true);
    const countries = service.datasetRecords('countries').records;
    assert.ok(countries.every(country => country.addressFormat?.format));
    assert.equal(countries.find(country => country.iso2 === 'US').addressFormat.fields['administrative-area'].header, 'State');
    assert.equal(countries.find(country => country.iso2 === 'GB').addressFormat.fields['administrative-area'], undefined);
});
