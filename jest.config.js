/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1', // Resolves path aliases like @/utils/...
  },
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.ts'],
  clearMocks: true, // Automatically clears mock calls between every test
};
