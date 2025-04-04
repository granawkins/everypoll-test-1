import fs from 'fs';
import path from 'path';
import { DB_CONFIG } from '../../database/config';
import { reinitializeTestDatabase } from '../../database/init';
import { DatabaseUtils, User, Poll, Answer } from '../../database/utils';
import Database from 'better-sqlite3';
import { applyMigrations } from '../../database/migrations';

// Interfaces used for testing
interface TableInfo {
  name: string;
}

interface MigrationRecord {
  id: number;
  name: string;
  applied_at: string;
}

// Create a simple test migration to test migrations system
const createTestMigration = (id: number, name: string, sql: string): void => {
  // Ensure migrations directory exists
  if (!fs.existsSync(DB_CONFIG.MIGRATIONS_DIR)) {
    fs.mkdirSync(DB_CONFIG.MIGRATIONS_DIR, { recursive: true });
  }
  
  const filename = `${id.toString().padStart(3, '0')}_${name.replace(/ /g, '_')}.sql`;
  const filePath = path.join(DB_CONFIG.MIGRATIONS_DIR, filename);
  
  // Write migration file
  fs.writeFileSync(filePath, sql);
};

// Clean up test migrations after tests
const cleanupTestMigrations = (): void => {
  if (fs.existsSync(DB_CONFIG.MIGRATIONS_DIR)) {
    const files = fs.readdirSync(DB_CONFIG.MIGRATIONS_DIR);
    
    for (const file of files) {
      fs.unlinkSync(path.join(DB_CONFIG.MIGRATIONS_DIR, file));
    }
  }
};

describe('Database Tests', () => {
  let db: Database.Database;
  let dbUtils: DatabaseUtils;
  
  // Set test environment
  beforeAll(() => {
    process.env.NODE_ENV = 'test';
  });
  
  // Reset database before each test
  beforeEach(() => {
    db = reinitializeTestDatabase();
    dbUtils = new DatabaseUtils(db);
  });
  
  // Close database after each test
  afterEach(() => {
    db.close();
    cleanupTestMigrations();
  });
  
  describe('Database Initialization', () => {
    it('should create database file if it does not exist', () => {
      expect(fs.existsSync(DB_CONFIG.TEST_DB_PATH)).toBe(true);
    });
    
    it('should create all required tables', () => {
      // Get list of tables
      const tables = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `).all() as TableInfo[];
      
      // Extract table names
      const tableNames = tables.map((t) => t.name);
      
      // Check for required tables
      expect(tableNames).toContain('Users');
      expect(tableNames).toContain('Polls');
      expect(tableNames).toContain('Answers');
      expect(tableNames).toContain('Votes');
      expect(tableNames).toContain('migrations');
    });
  });
  
  describe('Migrations System', () => {
    it('should apply migrations in order', () => {
      // Create test migrations
      createTestMigration(1, 'test migration', `
        CREATE TABLE test_table_1 (id TEXT PRIMARY KEY, name TEXT);
      `);
      
      createTestMigration(2, 'another test', `
        CREATE TABLE test_table_2 (id TEXT PRIMARY KEY, value INTEGER);
      `);
      
      // Apply migrations
      const appliedCount = applyMigrations(db);
      
      // Check that migrations were applied
      expect(appliedCount).toBe(2);
      
      // Verify tables were created
      const tables = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name LIKE 'test_table_%'
      `).all() as TableInfo[];
      
      const tableNames = tables.map((t) => t.name);
      expect(tableNames).toContain('test_table_1');
      expect(tableNames).toContain('test_table_2');
      
      // Check migrations table
      const migrations = db.prepare('SELECT * FROM migrations ORDER BY id').all() as MigrationRecord[];
      expect(migrations.length).toBe(2);
      expect(migrations[0].id).toBe(1);
      expect(migrations[1].id).toBe(2);
    });
    
    it('should not apply migrations twice', () => {
      // Create test migration
      createTestMigration(1, 'test migration', `
        CREATE TABLE test_table_3 (id TEXT PRIMARY KEY, name TEXT);
      `);
      
      // Apply migration
      let appliedCount = applyMigrations(db);
      expect(appliedCount).toBe(1);
      
      // Try to apply again
      appliedCount = applyMigrations(db);
      expect(appliedCount).toBe(0);
    });
  });
  
  describe('User Operations', () => {
    it('should create users', () => {
      const user = dbUtils.createUser('test@example.com', 'Test User');
      
      expect(user.id).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.name).toBe('Test User');
    });
    
    it('should get user by ID', () => {
      const user = dbUtils.createUser('test@example.com', 'Test User');
      const retrieved = dbUtils.getUserById(user.id);
      
      expect(retrieved).toEqual(user);
    });
    
    it('should get user by email', () => {
      const user = dbUtils.createUser('test@example.com', 'Test User');
      const retrieved = dbUtils.getUserByEmail('test@example.com');
      
      expect(retrieved).toEqual(user);
    });
    
    it('should return null for non-existent user', () => {
      const retrieved = dbUtils.getUserById('non-existent-id');
      
      expect(retrieved).toBeNull();
    });
    
    it('should update user', () => {
      const user = dbUtils.createUser('test@example.com', 'Test User');
      
      const updated = dbUtils.updateUser(user.id, {
        name: 'Updated Name',
        email: 'updated@example.com',
      });
      
      expect(updated).not.toBeNull();
      expect(updated!.name).toBe('Updated Name');
      expect(updated!.email).toBe('updated@example.com');
    });
    
    it('should create anonymous users', () => {
      const user = dbUtils.createUser();
      
      expect(user.id).toBeDefined();
      expect(user.email).toBeNull();
      expect(user.name).toBeNull();
    });
  });
  
  describe('Poll Operations', () => {
    let user: User;
    
    beforeEach(() => {
      user = dbUtils.createUser('poll@example.com', 'Poll User');
    });
    
    it('should create poll with answers', () => {
      const question = 'Test question?';
      const answers = ['Answer 1', 'Answer 2', 'Answer 3'];
      
      const result = dbUtils.createPoll(user.id, question, answers);
      
      expect(result.poll.id).toBeDefined();
      expect(result.poll.author_id).toBe(user.id);
      expect(result.poll.question).toBe(question);
      expect(result.answers.length).toBe(3);
      
      // Check answer texts
      const answerTexts = result.answers.map(a => a.text);
      expect(answerTexts).toEqual(answers);
    });
    
    it('should get poll by ID', () => {
      const { poll } = dbUtils.createPoll(
        user.id,
        'Test question?',
        ['Answer 1', 'Answer 2']
      );
      
      const retrieved = dbUtils.getPollById(poll.id);
      
      expect(retrieved).not.toBeNull();
      expect(retrieved!.poll.id).toBe(poll.id);
      expect(retrieved!.poll.question).toBe('Test question?');
      expect(retrieved!.answers.length).toBe(2);
    });
    
    it('should return null for non-existent poll', () => {
      const retrieved = dbUtils.getPollById('non-existent-id');
      
      expect(retrieved).toBeNull();
    });
    
    it('should get polls with pagination', () => {
      // Create 5 polls
      for (let i = 0; i < 5; i++) {
        dbUtils.createPoll(
          user.id,
          `Question ${i + 1}?`,
          ['Answer 1', 'Answer 2']
        );
      }
      
      // Get first 2 polls
      const firstPage = dbUtils.getPolls({ limit: 2, offset: 0 });
      expect(firstPage.polls.length).toBe(2);
      
      // Get next 2 polls
      const secondPage = dbUtils.getPolls({ limit: 2, offset: 2 });
      expect(secondPage.polls.length).toBe(2);
      
      // Make sure they're different
      expect(firstPage.polls[0].poll.id).not.toBe(secondPage.polls[0].poll.id);
    });
    
    it('should enforce poll validation', () => {
      // Test empty question
      expect(() => {
        dbUtils.createPoll(user.id, '', ['Answer 1', 'Answer 2']);
      }).toThrow('Poll question cannot be empty');
      
      // Test too few answers
      expect(() => {
        dbUtils.createPoll(user.id, 'Question?', ['Answer 1']);
      }).toThrow('Poll must have at least 2 answers');
      
      // Test too many answers
      expect(() => {
        dbUtils.createPoll(user.id, 'Question?', [
          'Answer 1', 'Answer 2', 'Answer 3', 'Answer 4', 'Answer 5',
          'Answer 6', 'Answer 7', 'Answer 8', 'Answer 9', 'Answer 10', 'Answer 11'
        ]);
      }).toThrow('Poll cannot have more than 10 answers');
      
      // Test empty answer
      expect(() => {
        dbUtils.createPoll(user.id, 'Question?', ['Answer 1', '']);
      }).toThrow('Answer text cannot be empty');
    });
  });
  
  describe('Vote Operations', () => {
    let user1: User;
    let user2: User;
    let poll: Poll;
    let pollAnswers: Answer[];
    
    beforeEach(() => {
      user1 = dbUtils.createUser('voter1@example.com', 'Voter 1');
      user2 = dbUtils.createUser('voter2@example.com', 'Voter 2');
      
      const result = dbUtils.createPoll(
        user1.id,
        'Test vote question?',
        ['Option A', 'Option B', 'Option C']
      );
      
      poll = result.poll;
      pollAnswers = result.answers;
    });
    
    it('should create a vote', () => {
      const vote = dbUtils.createVote(user2.id, poll.id, pollAnswers[1].id);
      
      expect(vote).not.toBeNull();
      expect(vote!.user_id).toBe(user2.id);
      expect(vote!.poll_id).toBe(poll.id);
      expect(vote!.answer_id).toBe(pollAnswers[1].id);
    });
    
    it('should prevent duplicate votes', () => {
      // First vote is successful
      const vote1 = dbUtils.createVote(user2.id, poll.id, pollAnswers[0].id);
      expect(vote1).not.toBeNull();
      
      // Second vote should fail
      const vote2 = dbUtils.createVote(user2.id, poll.id, pollAnswers[1].id);
      expect(vote2).toBeNull();
    });
    
    it('should get vote counts', () => {
      // Create several votes
      dbUtils.createVote(user1.id, poll.id, pollAnswers[0].id);
      dbUtils.createVote(user2.id, poll.id, pollAnswers[1].id);
      
      // Create another user and vote
      const user3 = dbUtils.createUser('voter3@example.com', 'Voter 3');
      dbUtils.createVote(user3.id, poll.id, pollAnswers[0].id);
      
      // Get vote counts
      const counts = dbUtils.getVoteCounts(poll.id);
      
      expect(counts[pollAnswers[0].id]).toBe(2);
      expect(counts[pollAnswers[1].id]).toBe(1);
      expect(counts[pollAnswers[2].id]).toBeUndefined();
    });
    
    it('should get user vote', () => {
      dbUtils.createVote(user1.id, poll.id, pollAnswers[0].id);
      
      const vote = dbUtils.getUserVote(user1.id, poll.id);
      
      expect(vote).not.toBeNull();
      expect(vote!.answer_id).toBe(pollAnswers[0].id);
    });
    
    it('should return null for non-existent vote', () => {
      const vote = dbUtils.getUserVote('non-existent-user', poll.id);
      
      expect(vote).toBeNull();
    });
  });
  
  describe('Cross-Reference Functionality', () => {
    let user1: User;
    let user2: User;
    let user3: User;
    let pollA: Poll;
    let pollB: Poll;
    let answersA: Answer[];
    let answersB: Answer[];
    
    beforeEach(() => {
      user1 = dbUtils.createUser('cross1@example.com', 'Cross User 1');
      user2 = dbUtils.createUser('cross2@example.com', 'Cross User 2');
      user3 = dbUtils.createUser('cross3@example.com', 'Cross User 3');
      
      // Create two polls
      const resultA = dbUtils.createPoll(
        user1.id,
        'Do you like chocolate?',
        ['Yes', 'No']
      );
      
      const resultB = dbUtils.createPoll(
        user1.id,
        'Do you like vanilla?',
        ['Yes', 'No']
      );
      
      pollA = resultA.poll;
      answersA = resultA.answers;
      
      pollB = resultB.poll;
      answersB = resultB.answers;
      
      // User1 likes both chocolate and vanilla
      dbUtils.createVote(user1.id, pollA.id, answersA[0].id); // Yes to chocolate
      dbUtils.createVote(user1.id, pollB.id, answersB[0].id); // Yes to vanilla
      
      // User2 likes chocolate but not vanilla
      dbUtils.createVote(user2.id, pollA.id, answersA[0].id); // Yes to chocolate
      dbUtils.createVote(user2.id, pollB.id, answersB[1].id); // No to vanilla
      
      // User3 doesn't like chocolate but likes vanilla
      dbUtils.createVote(user3.id, pollA.id, answersA[1].id); // No to chocolate
      dbUtils.createVote(user3.id, pollB.id, answersB[0].id); // Yes to vanilla
    });
    
    it('should get cross-referenced vote counts', () => {
      // Get chocolate votes filtered by people who like vanilla
      const chocolateByVanillaYes = dbUtils.getCrossReferencedVoteCounts(
        pollA.id,
        pollB.id,
        answersB[0].id // Yes to vanilla
      );
      
      // Get chocolate votes filtered by people who don't like vanilla
      const chocolateByVanillaNo = dbUtils.getCrossReferencedVoteCounts(
        pollA.id,
        pollB.id,
        answersB[1].id // No to vanilla
      );
      
      // Among vanilla lovers, 1 likes chocolate and 1 doesn't
      expect(chocolateByVanillaYes[answersA[0].id]).toBe(1); // Yes to chocolate (user1)
      expect(chocolateByVanillaYes[answersA[1].id]).toBe(1); // No to chocolate (user3)
      
      // Among vanilla haters, 1 likes chocolate and 0 don't
      expect(chocolateByVanillaNo[answersA[0].id]).toBe(1); // Yes to chocolate (user2)
      expect(chocolateByVanillaNo[answersA[1].id]).toBeUndefined(); // No to chocolate (none)
    });
  });
});