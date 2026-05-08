const fs = require('fs');
const path = require('path');

function readJson(file) {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function loadJsonDirectory(name) {
    const dir = path.join(__dirname, 'data', name);
    const data = {};

    for (const file of fs.readdirSync(dir)) {
        if (!file.endsWith('.json')) continue;

        const key = path.basename(file, '.json');
        data[key] = readJson(path.join(dir, file));
    }

    return data;
}

function loadLanguages() {
    const languages = readJson(path.join(__dirname, 'data', 'language.json'));
    if (!Array.isArray(languages)) return languages;

    return languages.reduce((indexed, language) => {
        if (language.code) indexed[language.code] = language;
        return indexed;
    }, {});
}

module.exports = {
    countries: loadJsonDirectory('country'),
    countryRegions: loadJsonDirectory('region'),
    continents: readJson(path.join(__dirname, 'data', 'continent.json')),
    currencies: readJson(path.join(__dirname, 'data', 'currency.json')),
    languages: loadLanguages(),
    regions: readJson(path.join(__dirname, 'data', 'region.json')),
};
