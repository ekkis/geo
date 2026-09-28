import { createServer } from 'node:http';
import handler from '../api/index.js';

const port = Number(process.env.PORT || 3000);

const production = process.env.NODE_ENV === 'production';
const host = String(process.env.GEO_BIND_HOST || (production ? '127.0.0.1' : '0.0.0.0')).trim();
if (production && !['127.0.0.1', '::1', 'localhost'].includes(host)) throw new Error('GEO_BIND_HOST must be loopback in production');
const server = createServer((req, res) => {
    handler(req, res);
});

server.listen(port, host, () => {
    console.log(`Geo VowLabs Science/Geography service listening on http://${host}:${port}`);
});
