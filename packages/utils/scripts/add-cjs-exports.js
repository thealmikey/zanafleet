const fs = require('fs');
const path = require('path');

const distIndexPath = path.join(__dirname, '..', 'dist', 'index.js');

const cjsExport = `// Re-export from src for backwards compatibility with require()
module.exports = require('./src/index.js');
module.exports.hashPassword = require('./src/password.util.js').hashPassword;
module.exports.verifyPassword = require('./src/password.util.js').verifyPassword;
`;

fs.writeFileSync(distIndexPath, cjsExport);
console.log('Added CommonJS exports to dist/index.js');
