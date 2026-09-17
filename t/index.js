import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

// Retain the legacy regression check for inherited enumerable properties.
Object.prototype.__test_function__ = () => null;
let geo;
try {
    geo = (await import('../index.js')).default;
} finally {
    delete Object.prototype.__test_function__;
}

describe('Entity lists', () => {
    it('lists all countries and their names', () => {
        assert.equal(geo.country.keys().length, 250);
        assert.equal(geo.country.list().length, 250);
        assert.ok(geo.country.list({ name: true }).some(name => name.common === 'Denmark'));
        assert.ok(!geo.country.keys().includes('__test_function__'));
    });
    it('lists the continents and regions in the current dataset', () => {
        assert.deepEqual(geo.continent.keys().sort(), ['AF', 'AM', 'AN', 'AS', 'EU', 'OC']);
        assert.ok(geo.region.list({ name: true }).includes('Scandinavia'));
    });
    it('exposes capitals and subdivision supplements', () => {
        const denmark = geo.country.find('DK', { singleton: true });
        assert.equal(denmark.capital.en, 'Copenhagen');
        assert.equal(denmark.region['81']['iso3166-2'], 'DK-81');
        assert.equal(denmark.region['81'].name, 'Nordjylland');
    });
});

describe('Entity searches', () => {
    for (const [label, criteria] of [
        ['ISO2', 'DK'],
        ['ISO3', { iso3: 'DNK' }],
        ['name', { name: { common: 'Denmark' } }],
        ['capital', { capital: { en: 'Copenhagen' } }],
        ['currency', { 'currency-codes': ['DKK'] }],
        ['calling code', { 'phone-code': '45' }],
    ]) {
        it(`finds Denmark by ${label}`, () => {
            assert.ok(geo.country.find({ criteria }).some(country => country.iso3 === 'DNK'));
        });
    }
    it('returns stable results for repeated searches', () => {
        const criteria = { name: { common: 'Denmark' } };
        assert.deepEqual(geo.country.find(criteria), geo.country.find(criteria));
    });
    it('returns an empty array for missing keys and unmatched criteria', () => {
        assert.deepEqual(geo.country.find('XX'), []);
        assert.deepEqual(geo.country.find({ iso3: 'XXX' }), []);
    });
});
