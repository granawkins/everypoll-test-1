import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

/**
 * Types for database entities
 */
export interface User {
  id: string;
  email: string | null;
  name: string | null;
}

export interface Poll {
  id: string;
  author_id: string;
  created_at: string;
  question: string;
}

export interface Answer {
  id: string;
  poll_id: string;
  text: string;
}

export interface Vote {
  id: string;
  poll_id: string;
  answer_id: string;
  user_id: string;
  created_at: string;
}

// Internal types for query results
interface VoteCountRow {
  answer_id: string;
  count: number;
}

/**
 * Database utility class with CRUD operations for all entities
 */
export class DatabaseUtils {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  // ========== User Operations ==========

  /**
   * Creates a new user
   * @param email User email (optional for anonymous users)
   * @param name User name (optional)
   * @returns The created user
   */
  createUser(email: string | null = null, name: string | null = null): User {
    const id = uuidv4();
    
    this.db.prepare(`
      INSERT INTO Users (id, email, name)
      VALUES (?, ?, ?)
    `).run(id, email, name);
    
    return { id, email, name };
  }

  /**
   * Gets a user by ID
   * @param id User ID
   * @returns User or null if not found
   */
  getUserById(id: string): User | null {
    const row = this.db.prepare('SELECT * FROM Users WHERE id = ?').get(id);
    return row || null;
  }

  /**
   * Gets a user by email
   * @param email User email
   * @returns User or null if not found
   */
  getUserByEmail(email: string): User | null {
    const row = this.db.prepare('SELECT * FROM Users WHERE email = ?').get(email);
    return row || null;
  }

  /**
   * Updates a user
   * @param id User ID
   * @param data Object containing fields to update
   * @returns Updated user or null if not found
   */
  updateUser(id: string, data: { email?: string; name?: string }): User | null {
    const user = this.getUserById(id);
    if (!user) return null;

    const { email, name } = data;
    
    // Only update fields that are provided
    if (email !== undefined || name !== undefined) {
      const updates: string[] = [];
      const params: (string | undefined)[] = [];
      
      if (email !== undefined) {
        updates.push('email = ?');
        params.push(email);
      }
      
      if (name !== undefined) {
        updates.push('name = ?');
        params.push(name);
      }
      
      params.push(id);
      
      this.db.prepare(`
        UPDATE Users
        SET ${updates.join(', ')}
        WHERE id = ?
      `).run(...params);
      
      return this.getUserById(id);
    }
    
    return user;
  }

  // ========== Poll Operations ==========

  /**
   * Creates a new poll with answers
   * @param authorId User ID of the poll author
   * @param question Poll question
   * @param answers Array of answer texts
   * @returns The created poll with its answers
   */
  createPoll(authorId: string, question: string, answerTexts: string[]): { poll: Poll; answers: Answer[] } {
    // Validate input
    if (!question.trim()) {
      throw new Error('Poll question cannot be empty');
    }
    
    if (!answerTexts || answerTexts.length < 2) {
      throw new Error('Poll must have at least 2 answers');
    }
    
    if (answerTexts.length > 10) {
      throw new Error('Poll cannot have more than 10 answers');
    }
    
    // Create poll
    const pollId = uuidv4();
    const createdAt = new Date().toISOString();
    
    this.db.prepare(`
      INSERT INTO Polls (id, author_id, created_at, question)
      VALUES (?, ?, ?, ?)
    `).run(pollId, authorId, createdAt, question);
    
    const poll: Poll = {
      id: pollId,
      author_id: authorId,
      created_at: createdAt,
      question,
    };
    
    // Create answers
    const answers: Answer[] = [];
    
    for (const text of answerTexts) {
      if (!text.trim()) {
        throw new Error('Answer text cannot be empty');
      }
      
      const answerId = uuidv4();
      
      this.db.prepare(`
        INSERT INTO Answers (id, poll_id, text)
        VALUES (?, ?, ?)
      `).run(answerId, pollId, text);
      
      answers.push({
        id: answerId,
        poll_id: pollId,
        text,
      });
    }
    
    return { poll, answers };
  }

  /**
   * Gets a poll by ID, including its answers
   * @param id Poll ID
   * @returns Poll with answers or null if not found
   */
  getPollById(id: string): { poll: Poll; answers: Answer[] } | null {
    const poll = this.db.prepare('SELECT * FROM Polls WHERE id = ?').get(id);
    if (!poll) return null;
    
    const answers = this.db.prepare('SELECT * FROM Answers WHERE poll_id = ?').all(id);
    
    return { poll, answers };
  }

  /**
   * Gets polls with pagination
   * @param limit Maximum number of polls to return
   * @param offset Number of polls to skip
   * @returns Array of polls with answers
   */
  getPolls(limit: number = 10, offset: number = 0): { poll: Poll; answers: Answer[] }[] {
    const polls = this.db.prepare(
      'SELECT * FROM Polls ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).all(limit, offset);
    
    return polls.map((poll: Poll) => {
      const answers = this.db.prepare('SELECT * FROM Answers WHERE poll_id = ?').all(poll.id);
      return { poll, answers };
    });
  }

  // ========== Vote Operations ==========

  /**
   * Records a vote for a specific answer
   * @param userId User ID
   * @param pollId Poll ID
   * @param answerId Answer ID
   * @returns The created vote
   */
  createVote(userId: string, pollId: string, answerId: string): Vote | null {
    try {
      const id = uuidv4();
      const createdAt = new Date().toISOString();
      
      // Check if user already voted for this poll
      const existingVote = this.db.prepare(
        'SELECT * FROM Votes WHERE poll_id = ? AND user_id = ?'
      ).get(pollId, userId);
      
      if (existingVote) {
        throw new Error('User has already voted for this poll');
      }
      
      // Insert the vote
      this.db.prepare(`
        INSERT INTO Votes (id, poll_id, answer_id, user_id, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, pollId, answerId, userId, createdAt);
      
      return {
        id,
        poll_id: pollId,
        answer_id: answerId,
        user_id: userId,
        created_at: createdAt,
      };
    } catch (error) {
      console.error('Error creating vote:', error);
      return null;
    }
  }

  /**
   * Gets vote counts for a poll
   * @param pollId Poll ID
   * @returns Object mapping answer IDs to vote counts
   */
  getVoteCounts(pollId: string): Record<string, number> {
    const rows = this.db.prepare(`
      SELECT answer_id, COUNT(*) as count
      FROM Votes
      WHERE poll_id = ?
      GROUP BY answer_id
    `).all(pollId) as VoteCountRow[];
    
    const voteCounts: Record<string, number> = {};
    
    rows.forEach((row) => {
      voteCounts[row.answer_id] = row.count;
    });
    
    return voteCounts;
  }

  /**
   * Gets vote counts for a poll, filtered by another poll's answer
   * @param pollId Main poll ID
   * @param crossPollId Cross-reference poll ID
   * @param crossAnswerId Cross-reference answer ID
   * @returns Object mapping answer IDs to vote counts
   */
  getCrossReferencedVoteCounts(
    pollId: string,
    crossPollId: string,
    crossAnswerId: string
  ): Record<string, number> {
    const rows = this.db.prepare(`
      SELECT v1.answer_id, COUNT(*) as count
      FROM Votes v1
      JOIN Votes v2 ON v1.user_id = v2.user_id
      WHERE v1.poll_id = ?
      AND v2.poll_id = ?
      AND v2.answer_id = ?
      GROUP BY v1.answer_id
    `).all(pollId, crossPollId, crossAnswerId) as VoteCountRow[];
    
    const voteCounts: Record<string, number> = {};
    
    rows.forEach((row) => {
      voteCounts[row.answer_id] = row.count;
    });
    
    return voteCounts;
  }

  /**
   * Gets a user's vote for a poll
   * @param userId User ID
   * @param pollId Poll ID
   * @returns Vote or null if not found
   */
  getUserVote(userId: string, pollId: string): Vote | null {
    const vote = this.db.prepare(
      'SELECT * FROM Votes WHERE poll_id = ? AND user_id = ?'
    ).get(pollId, userId);
    
    return vote || null;
  }
}