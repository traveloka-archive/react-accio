module.exports = {
  testMatch: ['**/test/**/*.js'],
  transform: {
    '/test/index.js': './jest-transform.js',
  },
};
