/**
 * Jest Configuration for Recrutas Platform Testing
 */

export default {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js'
  ],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'server/**/*.{js,ts}',
    '!server/**/*.d.ts',
    '!server/node_modules/**',
    '!server/vite.ts', // Exclude Vite config
    '!coverage/**'
  ],
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  testTimeout: 30000, // 30 seconds for API tests
  verbose: true,
  forceExit: true,
  detectOpenHandles: true
};