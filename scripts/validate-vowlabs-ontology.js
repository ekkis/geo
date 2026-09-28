#!/usr/bin/env node
/** Validate Geo's VowLabs Science/Geography delegated-service package. */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'ontology', 'vowlabs', 'Science', 'Geography');
const countryDir = join(root, 'data', 'country');
const prefix = 'S:G';
const countryDefinition = 'S:G:CO';
const subdivisionDefinition = 'S:G:SD';
const codePattern = /^[A-Z][A-Z0-9]*(?::[A-Z][A-Z0-9]*)*$/;
const pathPattern = /^(?!\/)(?!.*(?:^|\/)[.]{1,2}(?:\/|$))[A-Za-z0-9_-]+(?:[.][A-Za-z0-9_-]+)*(?:\/[A-Za-z0-9_-]+(?:[.][A-Za-z0-9_-]+)*)*$/;

function load(path) {
    return JSON.parse(readFileSync(path, 'utf8'));
}

function fail(errors, message) {
    errors.push(message);
}

function jsonFiles(directory) {
    return readdirSync(directory, {recursive: true, withFileTypes: true})
        .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
        .map(entry => join(entry.parentPath, entry.name));
}

function validateManifest(errors) {
    const manifest = load(join(outDir, 'manifest.json'));
    for (const key of ['formatVersion', 'repository', 'prefix', 'version', 'license', 'readme', 'requires', 'datasets', 'delivery']) {
        if (!(key in manifest)) fail(errors, `manifest missing ${key}`);
    }
    if (manifest.formatVersion !== 1) fail(errors, 'manifest formatVersion must be 1');
    if (manifest.prefix !== prefix) fail(errors, `manifest prefix must be ${prefix}`);
    if (!String(manifest.repository || '').startsWith('https://')) fail(errors, 'manifest repository must be https URL');
    if (!pathPattern.test(String(manifest.readme || '')) || !String(manifest.readme || '').endsWith('README.md')) {
        fail(errors, 'manifest readme must be relative README.md path');
    }
    if (manifest.delivery?.mode !== 'service') fail(errors, 'manifest delivery mode must be service');
    if (!/^https:\/\/[^/@?#\s]+(?:\/[^?#\s]*)?\/$/.test(String(manifest.delivery?.url || ''))) {
        fail(errors, 'manifest service url must be public HTTPS base URL ending in /');
    }
    if (!/^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/.test(String(manifest.requires?.ontologyVersion || ''))) {
        fail(errors, 'requires.ontologyVersion must be semver');
    }
    for (const code of manifest.requires?.codes || []) if (!codePattern.test(code)) fail(errors, `invalid requires code ${code}`);
    for (const item of manifest.datasets || []) {
        if (!['countries', 'states'].includes(item.id)) fail(errors, `unexpected dataset id ${item.id}`);
        if (item.id === 'countries' && item.definitionCode !== countryDefinition) fail(errors, 'countries definitionCode mismatch');
        if (item.id === 'states' && item.definitionCode !== subdivisionDefinition) fail(errors, 'states definitionCode mismatch');
        if ('path' in item) fail(errors, `service dataset ${item.id} must not declare snapshot path`);
    }
}

function validateDefinitionTree(errors) {
    for (const artifact of [
        'definitions/index.json', 'definitions/README.md', 'definitions/Country/index.json', 'definitions/Country/README.md',
        'definitions/Subdivision/index.json', 'definitions/Subdivision/README.md', 'definitions/Address/index.json', 'definitions/Address/US/index.json',
    ]) {
        if (!existsSync(join(outDir, artifact))) fail(errors, `missing definition artifact ${artifact}`);
    }
    const children = load(join(outDir, 'definitions', 'index.json')).Children || {};
    for (const code of ['AD', 'CO', 'SD']) if (!(code in children)) fail(errors, `root definition missing child ${code}`);
    for (const path of jsonFiles(join(outDir, 'definitions'))) {
        const data = load(path);
        const displayPath = relative(outDir, path);
        if (typeof data.Collection !== 'boolean' || typeof data.Composite !== 'boolean') fail(errors, `${displayPath} requires boolean Collection and Composite`);
        if (typeof data.Scalar === 'boolean' && data.Collection === data.Scalar) fail(errors, `${displayPath} Collection must be the inverse of Scalar`);
        if (data.Composite && (data.Type || !data.Children)) fail(errors, `${displayPath} invalid composite value`);
        if (!('Name' in data)) fail(errors, `${displayPath} missing Name`);
    }
}

function validateDataset(path, datasetId, definitionCode, errors) {
    const data = load(path);
    if (data.id !== datasetId) fail(errors, `${path}: id mismatch`);
    if (data.definitionCode !== definitionCode) fail(errors, `${path}: definitionCode mismatch`);
    if (!Number.isInteger(data.version) || data.version < 1) fail(errors, `${path}: version must be positive integer`);
    if (!Array.isArray(data.records)) {
        fail(errors, `${path}: records must be array`);
        return [];
    }
    const seenIds = new Set();
    for (const [index, record] of data.records.entries()) {
        if (!record || typeof record !== 'object' || Array.isArray(record)) {
            fail(errors, `${path}: record ${index} is not object`);
            continue;
        }
        const recordId = record.id;
        if (!recordId) fail(errors, `${path}: record ${index} missing id`);
        else if (seenIds.has(recordId)) fail(errors, `${path}: duplicate id ${recordId}`);
        else seenIds.add(recordId);
        if (!record.name) fail(errors, `${path}: record ${recordId || index} missing name`);
        if (record.definitionCode !== definitionCode) fail(errors, `${path}: record ${recordId || index} definitionCode mismatch`);
    }
    return data.records;
}

function validateData(errors) {
    const countries = validateDataset(join(outDir, 'data', 'countries', 'index.json'), 'countries', countryDefinition, errors);
    const states = validateDataset(join(outDir, 'data', 'states', 'index.json'), 'states', subdivisionDefinition, errors);
    const countryFiles = readdirSync(countryDir).filter(file => /^[A-Z][A-Z]\.json$/.test(file));
    if (countries.length !== countryFiles.length) fail(errors, `country count mismatch: ${countries.length} != ${countryFiles.length}`);
    const countryIds = new Set(countries.map(record => record.id));
    for (const record of countries) if (record.id !== `G:CO:${record.iso2}`) fail(errors, `country ${record.id} id must equal G:CO:${record.iso2}`);
    for (const record of states) {
        if (!countryIds.has(record.country)) fail(errors, `state ${record.id} references missing country ${record.country}`);
        if (record['iso3166-2'] && record.id !== record['iso3166-2']) fail(errors, `state ${record.id} id should equal iso3166-2 ${record['iso3166-2']}`);
    }
    if (states.length !== 5046) fail(errors, `states count mismatch: ${states.length} != 5046`);
}

const errors = [];
validateManifest(errors);
validateDefinitionTree(errors);
validateData(errors);
if (errors.length) {
    console.error(`VowLabs contribution validation failed with ${errors.length} error(s)`);
    for (const error of errors.slice(0, 100)) console.error(error);
    process.exitCode = 1;
} else {
    console.log('Validated VowLabs Science/Geography delegated-service package');
    console.log('Country: 250');
    console.log('Subdivision records: 5046');
}
