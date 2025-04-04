import path from 'path';

// Determine test database path - allow override from environment for test isolation
const testDbPath = process.env.TEST_DB_PATH 
  ? path.resolve(process.env.TEST_DB_PATH)
  : path.join(__dirname, '../../../data/test.db');

/**
 * Database configuration settings
 */
export const DB_CONFIG = {
  // Main database file path
  DB_PATH: path.join(__dirname, '../../../data/everypoll.db'),
  
  // Test database file path (used for testing)
  TEST_DB_PATH: testDbPath,
  
  // Migrations directory
  MIGRATIONS_DIR: path.join(__dirname, 'migrations'),
  
  // Flag to determine if we're in test mode
  isTest: process.env.NODE_ENV === 'test',
  
  // Get the correct database path based on environment
  getDatabasePath(): string {
    return this.isTest ? this.TEST_DB_PATH : this.DB_PATH;
  }
};
