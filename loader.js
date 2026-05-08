import { readdir } from "node:fs/promises";
const root = './data'

function set(o, path, val) {
    var ls = path.split('.')
    for (var i = 0; i < ls.length - 1; i++) {
        if (!(ls[i] in o)) o[ls[i]] = {}
        o = o[ls[i]]
    }
    return o[ls[i]] = val
}
async function dir(folderPath) {
  try {
    const entries = await readdir(folderPath); // array of names (strings)
    return entries.sort((a, b) => {
        const aBase = a.replace(/^([A-Z]{2})(?:\.[^.]+)?\.json$/, "$1.json");
        const bBase = b.replace(/^([A-Z]{2})(?:\.[^.]+)?\.json$/, "$1.json");

        if (aBase !== bBase) return aBase.localeCompare(bBase);

        const aIsBase = /^[A-Z]{2}\.json$/.test(a);
        const bIsBase = /^[A-Z]{2}\.json$/.test(b);

        if (aIsBase !== bIsBase) return aIsBase ? -1 : 1;

        return a.localeCompare(b);
        })
  } catch (err) {
    throw new Error(`Failed to read folder "${folderPath}": ${err.message}`);
  }
}
async function importJson(path) {
    const type = { with: { type: "json" } }
    try {
        const data = await import(path, type)
        return data.default
    } catch (err) {
        throw new Error(`Failed to import JSON file "${path}": ${err.message}`)
    }
}
async function load(d = root) {
    var ret = {}
    try {
        const f = await dir(d)
        for (var i = 0; i < f.length; i++) {
            if (f[i].endsWith('.json')) {
                var k = f[i].slice(0, -5)
                set(ret, k, await importJson(`${d}/${f[i]}`))
            }
            else {
                ret[f[i]] = await load(`${d}/${f[i]}`)
            }
        }
        return ret
    } catch (err) {
        console.error(err);
    }
}

export default await load()