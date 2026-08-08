module.exports = {
  testEnvironment: 'node',
  verbose: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  testPathIgnorePatterns: ['/node_modules/', '/src/matching-engine/test/'],
  coveragePathIgnorePatterns: ['/node_modules/', '/src/generated/'],
};
