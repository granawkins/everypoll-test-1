import { initializeDatabase, reinitializeTestDatabase } from './init';
import { DatabaseUtils } from './utils';
import { DB_CONFIG } from './config';

// Initialize the database based on the environment
const db = process.env.NODE_ENV === 'test' 
  ? reinitializeTestDatabase() 
  : initializeDatabase();

// Create a database utilities instance
const dbUtils = new DatabaseUtils(db);

export {
  db,
  dbUtils,
  DB_CONFIG,
  DatabaseUtils,
  initializeDatabase,
  reinitializeTestDatabase,
};
