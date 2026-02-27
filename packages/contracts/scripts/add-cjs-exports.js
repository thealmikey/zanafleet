const fs = require('fs');
const path = require('path');

// tsc outputs to dist/, so index.js is directly in dist/
const distIndexPath = path.join(__dirname, '..', 'dist', 'index.js');

// Check if we need to add CJS wrapper (only if output is ESM)
// Since tsc with commonjs outputs directly, we just verify the file exists
if (fs.existsSync(distIndexPath)) {
  console.log('CommonJS output verified at dist/index.js');
} else {
  console.error('Expected output not found at dist/index.js');
  process.exit(1);
}
