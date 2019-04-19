module.exports = function(api) {
  api.cache(true);

  // prettier-ignore
  const presets = [
    ['@babel/preset-env', { modules: false }],
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
