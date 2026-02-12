// CRACO config requires CommonJS syntax - do not convert to ESM
const path = require('path');

module.exports = {
  webpack: {
    alias: {
      '@zanafleet/contracts': path.resolve(__dirname, '../../packages/contracts/src'),
    },
    configure: (webpackConfig) => {
      webpackConfig.resolve.plugins = webpackConfig.resolve.plugins.filter(
        (plugin) => plugin.constructor.name !== 'ModuleScopePlugin'
      );

      webpackConfig.module.rules.push({
        test: /\.m?js/,
        resolve: {
          fullySpecified: false,
        },
      });

      const contractsSrc = path.resolve(__dirname, '../../packages/contracts/src');

      const babelLoaderRule = webpackConfig.module.rules
        .find((rule) => rule.oneOf)
        ?.oneOf?.find(
          (rule) => rule.loader && rule.loader.includes('babel-loader') && rule.include
        );

      if (babelLoaderRule) {
        if (Array.isArray(babelLoaderRule.include)) {
          babelLoaderRule.include.push(contractsSrc);
        } else {
          babelLoaderRule.include = [babelLoaderRule.include, contractsSrc];
        }
      }

      return webpackConfig;
    },
  },
};
