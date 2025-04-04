// Set test environment variables
process.env.NODE_ENV = 'test';

// Ensure proper isolation between test files for database tests
if (process.env.JEST_WORKER_ID) {
  // Customize test database path for parallel test execution
  process.env.TEST_DB_PATH = `./data/test-${process.env.JEST_WORKER_ID}.db`;
}

// Increase timeout for all tests
jest.setTimeout(10000);
