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

// Internal types for database rows
interface UserRow {
  id: string;
  email: string | null;
  name: string | null;
}

interface PollRow {
  id: string;
  author_id: string;
  created_at: string;
  question: string;
}

interface AnswerRow {
  id: string;
  poll_id: string;
  text: string;
}

interface VoteRow {
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
    const row = this.db.prepare('SELECT * FROM Users WHERE id = ?').get(id) as UserRow | undefined;
    if (!row) return null;
    
    return {
      id: row.id,
      email: row.email,
      name: row.name
    };
  }

  /**
   * Gets a user by email
   * @param email User email
   * @returns User or null if not found
   */
  getUserByEmail(email: string): User | null {
    const row = this.db.prepare('SELECT * FROM Users WHERE email = ?').get(email) as UserRow | undefined;
    if (!row) return null;
    
    return {
      id: row.id,
      email: row.email,
      name: row.name
    };
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
    const pollRow = this.db.prepare('SELECT * FROM Polls WHERE id = ?').get(id) as PollRow | undefined;
    if (!pollRow) return null;
    
    const poll: Poll = {
      id: pollRow.id,
      author_id: pollRow.author_id,
      created_at: pollRow.created_at,
      question: pollRow.question
    };
    
    const answerRows = this.db.prepare('SELECT * FROM Answers WHERE poll_id = ?').all(id) as AnswerRow[];
    const answers: Answer[] = answerRows.map(row => ({
      id: row.id,
      poll_id: row.poll_id,
      text: row.text
    }));
    
    return { poll, answers };
  }

  /**
   * Gets polls with pagination, sorting, and optional filtering
   * @param options Object with pagination, sorting, and filtering options
   * @returns Object containing array of polls with answers and total count
   */
  getPolls(options: {
    limit?: number;
    offset?: number;
    sortBy?: 'newest' | 'oldest';
    query?: string;
    authorId?: string;
  } = {}): { polls: { poll: Poll; answers: Answer[] }[]; totalCount: number }  {
    // Set default values
    const { 
      limit = 10, 
      offset = 0, 
      sortBy = 'newest', 
      query = null, 
      authorId = null 
    } = options;
    
    // Build WHERE clause
    const whereClauses = [];
    const params = [];
    
    if (query) {
      whereClauses.push('question LIKE ?');
      params.push(`%${query}%`);
    }
    
    if (authorId) {
      whereClauses.push('author_id = ?');
      params.push(authorId);
    }
    
    const whereClause = whereClauses.length > 0 
      ? `WHERE ${whereClauses.join(' AND ')}` 
      : '';
    
    // Set sorting order
    const order = sortBy === 'oldest' ? 'ASC' : 'DESC';
    
    // Get total count for pagination
    const countSql = `
      SELECT COUNT(*) as count 
      FROM Polls 
      ${whereClause}
    `;
    const countResult = this.db.prepare(countSql).get(...params) as { count: number };
    const totalCount = countResult ? countResult.count : 0;
    
    // Get poll rows
    const sql = `
      SELECT * FROM Polls 
      ${whereClause}
      ORDER BY created_at ${order}
      LIMIT ? OFFSET ?
    `;
    
    // Create a copy of params and add limit/offset
    const queryParams = [...params, limit, offset];
    const pollRows = this.db.prepare(sql).all(...queryParams) as PollRow[];
    
    // Map to poll objects with answers
    const polls = pollRows.map(row => {
      const poll: Poll = {
        id: row.id,
        author_id: row.author_id,
        created_at: row.created_at,
        question: row.question
      };
      
      const answerRows = this.db.prepare('SELECT * FROM Answers WHERE poll_id = ?').all(poll.id) as AnswerRow[];
      const answers: Answer[] = answerRows.map(aRow => ({
        id: aRow.id,
        poll_id: aRow.poll_id,
        text: aRow.text
      }));
      
      return { poll, answers };
    });
    
    return { polls, totalCount };
  }
  
  /**
   * Searches for polls by query string
   * @param query Search query string
   * @param limit Maximum number of polls to return
   * @param offset Number of polls to skip
   * @returns Array of polls with answers that match the query
   */
  searchPolls(query: string, limit: number = 10, offset: number = 0): { polls: { poll: Poll; answers: Answer[] }[]; totalCount: number } {
    return this.getPolls({
      query,
      limit,
      offset
    });
  }
  
  /**
   * Gets polls that can be cross-referenced with a given poll
   * This excludes the main poll and considers any existing cross-references
   * @param mainPollId ID of the poll to find cross-references for
   * @param query Optional search query
   * @param excludePollIds Array of poll IDs to exclude (e.g., already cross-referenced polls)
   * @param limit Maximum number of polls to return
   * @param offset Number of polls to skip
   * @returns Array of polls with answers suitable for cross-referencing
   */
  getCrossReferenceCandidates(
    mainPollId: string,
    options: {
      query?: string;
      excludePollIds?: string[];
      limit?: number;
      offset?: number;
    } = {}
  ): { polls: { poll: Poll; answers: Answer[] }[]; totalCount: number } {
    const { 
      query = null, 
      excludePollIds = [], 
      limit = 10, 
      offset = 0 
    } = options;
    
    // Always exclude the main poll
    const allExcludedIds = [...excludePollIds, mainPollId];
    
    // Build WHERE clause
    const whereClauses = ['id NOT IN (' + allExcludedIds.map(() => '?').join(',') + ')'];
    const params = [...allExcludedIds];
    
    if (query) {
      whereClauses.push('question LIKE ?');
      params.push(`%${query}%`);
    }
    
    const whereClause = `WHERE ${whereClauses.join(' AND ')}`;
    
    // Get total count
    const countSql = `
      SELECT COUNT(*) as count 
      FROM Polls 
      ${whereClause}
    `;
    const countResult = this.db.prepare(countSql).get(...params) as { count: number };
    const totalCount = countResult ? countResult.count : 0;
    
    // Get poll rows
    const sql = `
      SELECT * FROM Polls 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    // Create a copy of params and add limit/offset
    const queryParams = [...params, limit, offset];
    const pollRows = this.db.prepare(sql).all(...queryParams) as PollRow[];
    
    // Map to poll objects with answers
    const polls = pollRows.map(row => {
      const poll: Poll = {
        id: row.id,
        author_id: row.author_id,
        created_at: row.created_at,
        question: row.question
      };
      
      const answerRows = this.db.prepare('SELECT * FROM Answers WHERE poll_id = ?').all(poll.id) as AnswerRow[];
      const answers: Answer[] = answerRows.map(aRow => ({
        id: aRow.id,
        poll_id: aRow.poll_id,
        text: aRow.text
      }));
      
      return { poll, answers };
    });
    
    return { polls, totalCount };
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
    const voteRow = this.db.prepare(
      'SELECT * FROM Votes WHERE poll_id = ? AND user_id = ?'
    ).get(pollId, userId) as VoteRow | undefined;
    
    if (!voteRow) return null;
    
    return {
      id: voteRow.id,
      poll_id: voteRow.poll_id,
      answer_id: voteRow.answer_id,
      user_id: voteRow.user_id,
      created_at: voteRow.created_at
    };
  }
}