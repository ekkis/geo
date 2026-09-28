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

export default async function handler(req, res) {
    if (ontologyHandler(req, res)) return;
    return remoteHandler(req, res);
}
