// Set test environment variables
process.env.NODE_ENV = 'test';

// Use in-memory database for tests
// No need to customize paths since each worker gets its own memory space

// Increase timeout for all tests
jest.setTimeout(10000);
