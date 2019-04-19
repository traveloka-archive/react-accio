const env = process.env.NODE_ENV;

module.exports = function(api) {
  api.cache(true);

  const presets = [
    ['@babel/preset-env', { modules: env === 'test' ? 'commonjs' : false }],
    '@babel/preset-react',
    '@babel/preset-flow',
  ];
  const plugins = [
    ['@babel/plugin-proposal-class-properties', { loose: true }],
    '@babel/plugin-transform-runtime',
  ];

  return {
    presets,
    plugins,
  };
};
