import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import data from '../loader.js';

const root = fileURLToPath(new URL('../', import.meta.url));
await build({
    absWorkingDir: root,
    stdin: {
        contents: "export { default } from './index.js';",
        resolveDir: root,
        sourcefile: 'browser-entry.js',
    },
    bundle: true,
    platform: 'browser',
    format: 'iife',
    globalName: 'geo',
    target: 'es2022',
    minify: true,
    sourcemap: true,
    outfile: process.argv[2] || 'dist/country.min.js',
    footer: { js: 'geo = geo.default;' },
    plugins: [{
        name: 'embedded-geography-data',
        setup(builder) {
            builder.onLoad({ filter: /[/\\]loader\.js$/ }, () => ({
                contents: `export default ${JSON.stringify(data)};`,
                loader: 'js',
            }));
        },
    }],
});
