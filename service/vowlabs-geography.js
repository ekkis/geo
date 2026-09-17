import { readFileSync } from 'node:fs';
import { dirname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ONTOLOGY_ROOT = join(ROOT, 'ontology', 'vowlabs', 'Science', 'Geography');
const DEFINITIONS_ROOT = join(ONTOLOGY_ROOT, 'definitions');
const DATA_ROOT = join(ONTOLOGY_ROOT, 'data');

const DEFINITION_PATHS = Object.freeze({
    'S:G': 'index.json',
    'S:G:AD': 'Address/index.json',
    'S:G:AD:US': 'Address/US/index.json',
    'S:G:AD:US:PC': 'Address/US/PostalCode.json',
    'S:G:AD:US:RG': 'Address/US/Region.json',
    'S:G:AD:US:LOC': 'Address/US/Locality.json',
    'S:G:AD:US:SA': 'Address/US/StreetAddress.json',
    'S:G:AD:US:AI': 'Address/US/AdditionalInfo.json',
    'S:G:AD:US:DI': 'Address/US/DeliveryInstructions.json',
    'S:G:CO': 'Country/index.json',
    'S:G:SD': 'Subdivision/index.json',
});

const DATASETS = Object.freeze({
    countries: {
        id: 'countries',
        definitionCode: 'S:G:CO',
        path: 'countries/index.json',
        description: 'ISO 3166-1 country and country-like territory records served by ekkis/Geo.',
    },
    states: {
        id: 'states',
        definitionCode: 'S:G:SD',
        path: 'states/index.json',
        description: 'Global ISO 3166-2-backed political subdivision records served by ekkis/Geo.',
    },
});

function readJson(base, relativePath) {
    const path = normalize(join(base, relativePath));
    if (!path.startsWith(base)) throw new Error(`Invalid path: ${relativePath}`);
    return JSON.parse(readFileSync(path, 'utf8'));
}

function normalizeCode(code) {
    if (!code || typeof code !== 'string') throw new Error('Definition code is required');
    return code.trim().toUpperCase();
}

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function definitionPath(code) {
    const normalized = normalizeCode(code);
    const path = DEFINITION_PATHS[normalized];
    if (!path) throw new Error(`Unknown definition code: ${code}`);
    return path;
}

function childCode(parentCode, childKey) {
    return `${parentCode}:${childKey}`;
}

function materializeDefinition(code) {
    const normalized = normalizeCode(code);
    const definition = readJson(DEFINITIONS_ROOT, definitionPath(normalized));
    return {
        code: normalized,
        ...definition,
    };
}

function resolveChildren(code, definition) {
    const children = definition.Children || {};
    return Object.keys(children).map(key => {
        const codeForChild = childCode(code, key);
        const child = materializeDefinition(codeForChild);
        return {
            code: codeForChild,
            Name: child.Name,
            Description: child.Description,
            hasChildren: Boolean(child.Children && Object.keys(child.Children).length),
        };
    });
}

function datasetConfig(datasetId) {
    const id = String(datasetId || '').trim();
    const config = DATASETS[id];
    if (!config) throw new Error(`Unknown dataset: ${datasetId}`);
    return config;
}

function loadDataset(datasetId) {
    const config = datasetConfig(datasetId);
    const file = readJson(DATA_ROOT, config.path);
    return {
        ...config,
        count: Array.isArray(file.records) ? file.records.length : 0,
        records: file.records,
    };
}

function paginate(records, options = {}) {
    const offset = Math.max(0, Number(options.offset || 0));
    const limitOption = options.limit === undefined ? records.length : Number(options.limit);
    const limit = Math.min(Math.max(0, limitOption), 10000);
    return {
        offset,
        limit,
        count: records.length,
        records: records.slice(offset, offset + limit),
    };
}

export function manifest() {
    return readJson(ONTOLOGY_ROOT, 'manifest.json');
}

export function root() {
    return definition('S:G');
}

export function definition(code) {
    const normalized = normalizeCode(code);
    const item = materializeDefinition(normalized);
    return clone(item);
}

export function definitionChildren(code = 'S:G') {
    const normalized = normalizeCode(code);
    const item = materializeDefinition(normalized);
    return resolveChildren(normalized, item);
}

export function definitions() {
    return Object.keys(DEFINITION_PATHS).map(code => definition(code));
}

export function dataset(datasetId) {
    const data = loadDataset(datasetId);
    const { records, ...metadata } = data;
    return clone(metadata);
}

export function datasetRecords(datasetId, options = {}) {
    const data = loadDataset(datasetId);
    return clone({
        dataset: data.id,
        definitionCode: data.definitionCode,
        ...paginate(data.records, options),
    });
}

export function datasetRecord(datasetId, id) {
    if (!id) throw new Error('Record id is required');
    const data = loadDataset(datasetId);
    const record = data.records.find(item => item.id === id);
    return clone(record || null);
}

export function countries(options = {}) {
    return datasetRecords('countries', options);
}

export function country(id) {
    return datasetRecord('countries', id);
}

export function states(options = {}) {
    return datasetRecords('states', options);
}

export function state(id) {
    return datasetRecord('states', id);
}

export function serviceInfo() {
    return {
        name: 'Geo VowLabs Science/Geography Service',
        prefix: 'S:G',
        repository: 'https://github.com/ekkis/Geo',
        delivery: manifest().delivery,
        definitions: Object.keys(DEFINITION_PATHS),
        datasets: Object.keys(DATASETS).map(id => dataset(id)),
        endpoints: [
            'GET /health',
            'GET /metadata',
            'POST /invoke',
            'GET /v1/manifest',
            'GET /v1/definitions/:code',
            'GET /v1/definitions/:code/children',
            'GET /v1/datasets/:id',
            'GET /v1/datasets/:id/records',
            'GET /v1/datasets/:id/records/:recordId',
        ],
    };
}

export default {
    manifest,
    root,
    definition,
    definitionChildren,
    definitions,
    dataset,
    datasetRecords,
    datasetRecord,
    countries,
    country,
    states,
    state,
    serviceInfo,
};
