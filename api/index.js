import { readFileSync } from 'node:fs';
import { createHttpHandler, createRpcHandler, buildLibraryMetadata } from 'remote-lib';
import geographyService from '../service/vowlabs-geography.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const rpcHandler = createRpcHandler(geographyService);
const remoteHandler = createHttpHandler(
    rpcHandler,
    buildLibraryMetadata(geographyService, {
        name: 'Geo VowLabs Science/Geography Service',
        version: pkg.version,
        description: 'Delegated VowLabs S:G ontology definitions and data served from ekkis/Geo via remote-lib.',
    }),
);

function setCors(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res, status, body) {
    setCors(res);
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(body));
}

function parsePath(req) {
    return new URL(req.url, 'http://localhost');
}

function decodeCode(encoded) {
    return decodeURIComponent(encoded || '').replace(/\//g, ':');
}

function parsePageParams(searchParams) {
    return {
        offset: searchParams.has('offset') ? Number(searchParams.get('offset')) : undefined,
        limit: searchParams.has('limit') ? Number(searchParams.get('limit')) : undefined,
    };
}

function routeVowLabs(req, res) {
    const url = parsePath(req);
    const pathname = url.pathname.replace(/\/$/, '') || '/';

    if (req.method === 'OPTIONS') {
        setCors(res);
        res.statusCode = 204;
        res.end();
        return true;
    }

    if (req.method !== 'GET') return false;

    if (pathname === '/v1' || pathname === '/v1/') {
        sendJson(res, 200, geographyService.serviceInfo());
        return true;
    }

    if (pathname === '/v1/manifest') {
        sendJson(res, 200, geographyService.manifest());
        return true;
    }

    let match = pathname.match(/^\/v1\/definitions\/([^/]+)\/children$/);
    if (match) {
        sendJson(res, 200, geographyService.definitionChildren(decodeCode(match[1])));
        return true;
    }

    match = pathname.match(/^\/v1\/definitions\/([^/]+)$/);
    if (match) {
        sendJson(res, 200, geographyService.definition(decodeCode(match[1])));
        return true;
    }

    match = pathname.match(/^\/v1\/datasets\/([^/]+)\/records\/([^/]+)$/);
    if (match) {
        const record = geographyService.datasetRecord(decodeURIComponent(match[1]), decodeURIComponent(match[2]));
        sendJson(res, record ? 200 : 404, record || { error: 'Record not found' });
        return true;
    }

    match = pathname.match(/^\/v1\/datasets\/([^/]+)\/records$/);
    if (match) {
        sendJson(
            res,
            200,
            geographyService.datasetRecords(decodeURIComponent(match[1]), parsePageParams(url.searchParams)),
        );
        return true;
    }

    match = pathname.match(/^\/v1\/datasets\/([^/]+)$/);
    if (match) {
        sendJson(res, 200, geographyService.dataset(decodeURIComponent(match[1])));
        return true;
    }

    return false;
}

export default async function handler(req, res) {
    try {
        if (routeVowLabs(req, res)) return;
        return remoteHandler(req, res);
    } catch (error) {
        sendJson(res, 500, {
            success: false,
            error: {
                message: error.message,
                name: error.name,
            },
        });
    }
}
