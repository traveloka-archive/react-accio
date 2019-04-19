const babelJest = require('babel-jest');

module.exports = babelJest.createTransformer({
  plugins: [
    require.resolve('@babel/plugin-transform-react-jsx'),
    require.resolve('@babel/plugin-proposal-class-properties'),
  ],
});
