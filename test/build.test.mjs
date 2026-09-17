import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

test('browser bundle exposes the entity API without Node modules or filesystem access', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'geo-browser-'));
    try {
        const output = join(dir, 'country.min.js');
        execFileSync(process.execPath, [fileURLToPath(new URL('../scripts/build-browser.js', import.meta.url)), output]);
        const context = { structuredClone };
        runInNewContext(await readFile(output, 'utf8'), context, { timeout: 10000 });
        assert.equal(context.geo.country.keys().length, 250);
        assert.equal(context.geo.country.find('US')[0].iso3, 'USA');
        const hydrated = context.geo.country.find({ criteria: 'US', hydrate: true, name: true });
        assert.equal(hydrated[0].currencies[0], 'United States dollar');
        assert.ok(context.geo.country.addressForm('US').fields);
        const map = JSON.parse(await readFile(output + '.map', 'utf8'));
        assert.equal(map.version, 3);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});
