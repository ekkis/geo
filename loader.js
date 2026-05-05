const fs = require('fs');
const path = require('path');

// Load country data
function loadCountries() {
    const file = path.join(__dirname, 'data', 'country.json');
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    return data;
}

// Load region data for a specific country
function loadRegions(countryCode) {
    const file = path.join(__dirname, 'data', 'regions', `${countryCode}.json`);
    try {
        const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
        return data;
    } catch (e) {
        return null;
    }
}

// Load all region files
function loadAllRegions() {
    const regionsDir = path.join(__dirname, 'data', 'regions');
    const files = fs.readdirSync(regionsDir);
    const allRegions = {};
    
    for (const file of files) {
        if file.endsWith('.json') {
            const countryCode = file.split('.')[0];
            const filePath = path.join(regionsDir, file);
            try {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                allRegions[countryCode] = data;
            } catch (e) {
                console.error(`Error loading ${file}:`, e);
            }
        }
    }
    
    return allRegions;
}

// Load combined data (countries with their regions)
function loadCombinedData() {
    const countries = loadCountries();
    const allRegions = loadAllRegions();
    
    const combined = {};
    for (const [code, countryData] of Object.entries(countries)) {
        combined[code] = {
            ...countryData,
            divisions: allRegions[code] || {}
        };
    }
    
    return combined;
}

module.exports = {
    loadCountries,
    loadRegions,
    loadAllRegions,
    loadCombinedData
};
