
const fs = require('fs');
const path = require('path');

// Load country data
function loadCountries() {
    const dir = path.join(__dirname, 'data', 'countries');
    const files = fs.readdirSync(dir);
    const countries = {};
    for (const file of files) {
        if (file.endsWith('.json')) {
            const countryCode = file.split('.')[0];
            const filePath = path.join(dir, file);
            try {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                countries[countryCode] = data;
            } catch (e) {
                console.error(`Error loading ${file}:`, e);
            }
        }
    }
    return countries;
}

// Load region data (from regions/*.json)
function loadRegions() {
    const dir = path.join(__dirname, 'data', 'regions');
    const files = fs.readdirSync(dir);
    const regions = {};
    for (const file of files) {
        if (file.endsWith('.json')) {
            const countryCode = file.split('.')[0];
            const filePath = path.join(dir, file);
            try {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                // Restructure: top-level region names contain subdivisions
                // We'll keep this structure as is
                regions[countryCode] = data;
            } catch (e) {
                console.error(`Error loading ${file}:`, e);
            }
        }
    }
    return regions;
}

// Load continent data
function loadContinents() {
    const file = path.join(__dirname, 'data', 'continent.json');
    try {
        const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
        // Convert to object with continent codes as keys and names as values
        return data;
    } catch (e) {
        console.error(`Error loading continent.json:`, e);
        return {};
    }
}

// Load language data
function loadLanguages() {
    const file = path.join(__dirname, 'data', 'language.json');
    try {
        const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
        // Convert to object with language codes as keys
        const languages = {};
        data.forEach(item => {
            if (item.code) {
                languages[item.code] = item;
            }
        });
        return languages;
    } catch (e) {
        console.error(`Error loading language.json:`, e);
        return {};
    }
}

// Load currency data
function loadCurrencies() {
    const file = path.join(__dirname, 'data', 'currency.json');
    try {
        const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
        return data;
    } catch (e) {
        console.error(`Error loading currency.json:`, e);
        return {};
    }
}

// Export all data
module.exports = {
    countries: loadCountries(),
    regions: loadRegions(),
    continents: loadContinents(),
    languages: loadLanguages(),
    currencies: loadCurrencies()
};
