import { createServer } from 'node:http';
import handler from '../api/index.js';

const port = Number(process.env.PORT || 3000);

const server = createServer((req, res) => {
    handler(req, res);
});

server.listen(port, () => {
    console.log(`Geo VowLabs Science/Geography service listening on http://localhost:${port}`);
});
