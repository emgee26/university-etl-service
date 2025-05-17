/**
 * Jest setup file
 */

// Test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// Console methods mocks to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test timeout
jest.setTimeout(30000);
