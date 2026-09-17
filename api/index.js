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

function sendHtml(res, status, body) {
    setCors(res);
    res.statusCode = status;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(body);
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

function routeLandingPage(req, res, pathname) {
    if (req.method !== 'GET' || pathname !== '/') return false;

    const metadata = buildLibraryMetadata(geographyService, {
        name: 'Geo VowLabs Science/Geography Service',
        version: pkg.version,
        description: 'Delegated VowLabs S:G ontology definitions and data served from ekkis/Geo via remote-lib.',
    });
    const methods = metadata.methods.map(method => `<li><code>${method}</code></li>`).join('');
    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Geo VowLabs Science/Geography Service</title>
  <style>
    :root { color-scheme: light dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; padding: 3rem 1.5rem; background: #0f172a; color: #e2e8f0; }
    main { max-width: 820px; margin: 0 auto; }
    a { color: #67e8f9; }
    code { background: rgba(148, 163, 184, 0.18); border-radius: 0.35rem; padding: 0.12rem 0.32rem; }
    pre { overflow-x: auto; padding: 1rem; border-radius: 0.75rem; background: rgba(15, 23, 42, 0.82); border: 1px solid rgba(148, 163, 184, 0.25); }
    section { margin-top: 2rem; }
    .card { background: rgba(30, 41, 59, 0.72); border: 1px solid rgba(148, 163, 184, 0.25); border-radius: 1rem; padding: 1.25rem; }
  </style>
</head>
<body>
  <main>
    <p><a href="https://github.com/ekkis/geo">ekkis/geo</a></p>
    <h1>Geo VowLabs Science/Geography Service</h1>
    <p>${metadata.description}</p>
    <div class="card">
      <strong>Status:</strong> <a href="/health">/health</a><br>
      <strong>Metadata:</strong> <a href="/metadata">/metadata</a><br>
      <strong>Manifest:</strong> <a href="/v1/manifest">/v1/manifest</a>
    </div>
    <section>
      <h2>REST endpoints</h2>
      <ul>
        <li><a href="/v1">GET /v1</a></li>
        <li><a href="/v1/manifest">GET /v1/manifest</a></li>
        <li><a href="/v1/definitions/S%3AG">GET /v1/definitions/:code</a></li>
        <li><a href="/v1/definitions/S%3AG/children">GET /v1/definitions/:code/children</a></li>
        <li><a href="/v1/datasets/countries">GET /v1/datasets/:id</a></li>
        <li><a href="/v1/datasets/countries/records?limit=5">GET /v1/datasets/:id/records</a></li>
        <li><a href="/v1/datasets/countries/records/US">GET /v1/datasets/:id/records/:recordId</a></li>
      </ul>
    </section>
    <section>
      <h2>remote-lib methods</h2>
      <ul>${methods}</ul>
      <pre><code>curl -X POST ${'${location.origin}'}/invoke \\
  -H 'Content-Type: application/json' \\
  -d '{"method":"definition","args":["S:G:CO"]}'</code></pre>
    </section>
  </main>
</body>
</html>`;

    sendHtml(res, 200, html);
    return true;
}

function routeVowLabs(req, res) {
    const url = parsePath(req);
    const pathname = url.pathname.replace(/\/$/, '') || '/';

    if (routeLandingPage(req, res, pathname)) return true;

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
