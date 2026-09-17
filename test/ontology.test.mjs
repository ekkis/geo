import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import service from '../service/vowlabs-geography.js';

test('ontology exposes canonical address fields and every role', () => {
    assert.equal(service.definition('S:G:AD:US:C').Name, 'City');
    assert.equal(service.definition('S:G:AD:US:RE').Name, 'Region');
    assert.equal(service.definitionChildren('S:G:AD:RO').length, 8);
    assert.equal(service.definitions().length, 22);
});

test('ontology HTTP and RPC routes serve the complete registered contribution', () => {
    execFileSync(process.execPath, [fileURLToPath(new URL('../scripts/smoke-vowlabs-service.js', import.meta.url))]);
});
