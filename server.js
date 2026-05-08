const { parse } = require('url');
const country = require('./index');

function argumentFor(query) {
    return query.code || query.name || query.capital || query.currency || query.phone || query.province;
}

module.exports = async function handler(req) {
    const { query } = parse(req.url, true);
    const method = query.method;

    if (!method || typeof country[method] !== 'function') {
        return { error: 'Unknown method' };
    }

    if (method === 'findByPhoneNbr') {
        return country[method](query.phone || query.code);
    }

    if (argumentFor(query)) {
        return country[method](argumentFor(query));
    }

    return country[method]();
};
