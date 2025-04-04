import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { DB_CONFIG } from './config';
import { applyMigrations } from './migrations';

/**
 * Ensures the data directory exists
 */
function ensureDataDirectory(): void {
  const dataDir = path.dirname(DB_CONFIG.getDatabasePath());
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

/**
 * Creates the initial database schema with required tables
 * @param db Database instance
 */
function createInitialSchema(db: Database.Database): void {
  // Create Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS Users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      name TEXT
    );
  `);

  // Create Polls table
  db.exec(`
    CREATE TABLE IF NOT EXISTS Polls (
      id TEXT PRIMARY KEY,
      author_id TEXT NOT NULL,
      created_at DATETIME NOT NULL,
      question TEXT NOT NULL,
      FOREIGN KEY (author_id) REFERENCES Users(id)
    );
  `);

  // Create Answers table
  db.exec(`
    CREATE TABLE IF NOT EXISTS Answers (
      id TEXT PRIMARY KEY,
      poll_id TEXT NOT NULL,
      text TEXT NOT NULL,
      FOREIGN KEY (poll_id) REFERENCES Polls(id) ON DELETE CASCADE
    );
  `);

  // Create Votes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS Votes (
      id TEXT PRIMARY KEY,
      poll_id TEXT NOT NULL,
      answer_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at DATETIME NOT NULL,
      FOREIGN KEY (poll_id) REFERENCES Polls(id) ON DELETE CASCADE,
      FOREIGN KEY (answer_id) REFERENCES Answers(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES Users(id),
      UNIQUE(poll_id, user_id)
    );
  `);
}

/**
 * Initializes the database by creating it if it doesn't exist
 * and setting up the schema
 * @returns A connected database instance
 */
export function initializeDatabase(): Database.Database {
  // Ensure the data directory exists
  ensureDataDirectory();

  // Connect to the database (creates it if it doesn't exist)
  const dbPath = DB_CONFIG.getDatabasePath();
  const db = new Database(dbPath, { 
    readonly: false, // Ensure we have write access
    fileMustExist: false // Create if it doesn't exist
  });

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Create initial schema if tables don't exist
  createInitialSchema(db);

  // Apply any pending migrations
  applyMigrations(db);

  return db;
}

/**
 * For testing purposes - creates an in-memory test database
 * @returns A connected in-memory test database instance
 */
export function reinitializeTestDatabase(): Database.Database {
  // Ensure we're in test mode
  if (!DB_CONFIG.isTest) {
    throw new Error('reinitializeTestDatabase() should only be called in test mode');
  }

  try {
    // Create an in-memory database for testing
    // This avoids file permission issues entirely
    const db = new Database(':memory:');
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    // Create initial schema
    createInitialSchema(db);
    
    // Create migrations table
    db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    return db;
  } catch (error) {
    console.error('Error initializing in-memory test database:', error);
    throw error;
  }
}
