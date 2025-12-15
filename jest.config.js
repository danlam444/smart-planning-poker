module.exports = {
  testPathIgnorePatterns: ['/node_modules/', '/tests/'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx', '**/*.test.js'],
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
