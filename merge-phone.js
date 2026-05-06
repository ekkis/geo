// Merge phone codes into country.json
const fs = require('fs');

// Load country data
const countryData = JSON.parse(fs.readFileSync('./data/country.json', 'utf8'));
const phoneData = JSON.parse(fs.readFileSync('./data/country-phone.json', 'utf8'));

// Add phone_code to each country if available
for (const [countryCode, country] of Object.entries(countryData)) {
  if (phoneData[countryCode]) {
    country.phone_code = phoneData[countryCode];
  } else {
    country.phone_code = null; // or undefined, but null is cleaner
  }
}

// Write updated country.json
fs.writeFileSync('./data/country.json', JSON.stringify(countryData, null, 2) + '\n');

// Remove country-phone.json
fs.unlinkSync('./data/country-phone.json');

console.log('Merged phone codes into country.json and removed country-phone.json');