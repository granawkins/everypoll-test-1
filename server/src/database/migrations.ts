import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { DB_CONFIG } from './config';

// Interface for a migration object
interface Migration {
  id: number;
  name: string;
  sql: string;
}

// Interface for a migration row from database
interface MigrationRow {
  id: number;
}

/**
 * Creates the migrations table if it doesn't exist
 * @param db Database instance
 */
function createMigrationsTable(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

/**
 * Gets all applied migrations from the database
 * @param db Database instance
 * @returns Array of applied migration IDs
 */
function getAppliedMigrations(db: Database.Database): number[] {
  createMigrationsTable(db);
  
  const stmt = db.prepare('SELECT id FROM migrations ORDER BY id');
  const rows = stmt.all() as MigrationRow[];
  
  return rows.map((row) => row.id);
}

/**
 * Loads all migration files from the migrations directory
 * @returns Array of migration objects
 */
function loadMigrationFiles(): Migration[] {
  // Ensure migrations directory exists
  if (!fs.existsSync(DB_CONFIG.MIGRATIONS_DIR)) {
    fs.mkdirSync(DB_CONFIG.MIGRATIONS_DIR, { recursive: true });
    return [];
  }
  
  const migrations: Migration[] = [];
  
  // Read all .sql files from migrations directory
  const files = fs.readdirSync(DB_CONFIG.MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort();
  
  for (const file of files) {
    // Parse migration ID and name from filename (format: 001_migration_name.sql)
    const match = file.match(/^(\d+)_(.+)\.sql$/);
    if (match) {
      const id = parseInt(match[1], 10);
      const name = match[2].replace(/_/g, ' ');
      const filePath = path.join(DB_CONFIG.MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      migrations.push({ id, name, sql });
    }
  }
  
  return migrations;
}

/**
 * Applies pending migrations to the database
 * @param db Database instance
 * @returns Number of migrations applied
 */
export function applyMigrations(db: Database.Database): number {
  const appliedMigrationIds = getAppliedMigrations(db);
  const migrations = loadMigrationFiles();
  let appliedCount = 0;
  
  // Begin transaction
  db.exec('BEGIN TRANSACTION');
  
  try {
    for (const migration of migrations) {
      // Skip if already applied
      if (appliedMigrationIds.includes(migration.id)) {
        continue;
      }
      
      console.log(`Applying migration ${migration.id}: ${migration.name}`);
      
      // Execute migration SQL
      db.exec(migration.sql);
      
      // Record migration as applied
      db.prepare('INSERT INTO migrations (id, name) VALUES (?, ?)')
        .run(migration.id, migration.name);
      
      appliedCount++;
    }
    
    // Commit transaction if all went well
    db.exec('COMMIT');
  } catch (error) {
    // Rollback transaction on error
    db.exec('ROLLBACK');
    console.error('Error applying migrations:', error);
    throw error;
  }
  
  if (appliedCount > 0) {
    console.log(`Applied ${appliedCount} migrations`);
  }
  
  return appliedCount;
}
