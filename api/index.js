import { ontologyHandler } from "../service/ontology-api.js";
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

function sendHtml(res, status, body) {
    res.statusCode = status;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(body);
}

function parsePath(req) {
    return new URL(req.url, 'http://localhost');
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

export default async function handler(req, res) {
    if (routeLandingPage(req, res, parsePath(req).pathname.replace(/\/$/, '') || '/')) return;
    if (ontologyHandler(req, res)) return;
    return remoteHandler(req, res);
}
