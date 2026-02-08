module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/worker/index.js',
    '!src/api/index.js',
  ],
  testMatch: ['**/tests/**/*.test.js'],
  verbose: true,
};