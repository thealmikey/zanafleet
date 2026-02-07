// CRACO config requires CommonJS syntax - do not convert to ESM
const path = require('path');

module.exports = {
  webpack: {
    alias: {
      '@zanafleet/contracts': path.resolve(__dirname, '../../packages/contracts/dist'),
    },
    configure: (webpackConfig) => {
      webpackConfig.resolve.plugins = webpackConfig.resolve.plugins.filter(
        (plugin) => plugin.constructor.name !== 'ModuleScopePlugin'
      );
      return webpackConfig;
    },
  },
};
