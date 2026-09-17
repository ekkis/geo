import { readdir, readFile } from 'node:fs/promises';

const root = new URL('./data/', import.meta.url);

function set(object, path, value) {
    const keys = path.split('.');
    for (const key of keys.slice(0, -1)) {
        object[key] ??= {};
        object = object[key];
    }
    object[keys.at(-1)] = value;
}

async function load(folder = root) {
    const result = {};
    const entries = await readdir(folder, { withFileTypes: true });
    entries.sort((a, b) =>
        Number(a.isDirectory()) - Number(b.isDirectory()) ||
        a.name.split('.').length - b.name.split('.').length ||
        a.name.localeCompare(b.name));

    for (const entry of entries) {
        const url = new URL(entry.name, folder);
        if (entry.isDirectory()) {
            result[entry.name] ??= { meta: {} };
            result[entry.name].data = await load(new URL(`${entry.name}/`, folder));
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
            const value = JSON.parse(await readFile(url, 'utf8'));
            // Domain files retain their metadata; individual records expose their data.
            const record = folder.href === root.href ? value :
                value.data ? { ...value.data, meta: value.meta } : value;
            set(result, entry.name.slice(0, -5), record);
        }
    }
    return result;
}

export default await load();
