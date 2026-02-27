const fs = require('fs');
const path = require('path');

const distIndexPath = path.join(__dirname, '..', 'dist', 'index.js');

const cjsExport = `// Re-export from src for backwards compatibility with require()
module.exports = require('./src/index.js');
module.exports.TEST_ACCOUNTS = require('./src/test-accounts.js').TEST_ACCOUNTS;
module.exports.TEST_PASSWORD = require('./src/test-accounts.js').TEST_PASSWORD;
module.exports.TestAccount = require('./src/test-accounts.js').TestAccount;
`;

fs.writeFileSync(distIndexPath, cjsExport);
console.log('Added CommonJS exports to dist/index.js');
