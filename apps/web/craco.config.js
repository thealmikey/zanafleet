const path = require('path');

module.exports = {
  webpack: {
    alias: {
      '@zanafleet/contracts': path.resolve(__dirname, '../../packages/contracts/src'),
    },
  },
};
