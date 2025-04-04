import request from 'supertest';
import { app } from '../../app';
import { reinitializeTestDatabase } from '../../database/init';
import { dbUtils } from '../../database';
import { createToken, AUTH_COOKIE_NAME } from '../../auth';
import { User } from '../../database/utils';

// Type for poll objects returned in API responses
interface PollWithDetails {
  poll: {
    id: string;
    question: string;
    author_id: string;
    created_at: string;
  };
  answers: {
    id: string;
    text: string;
    poll_id: string;
  }[];
  author?: {
    id: string;
    name: string | null;
  };
  voteCounts?: Record<string, number>;
  userVote?: {
    answerId: string;
  } | null;
}

describe('Feed API Endpoints', () => {
  let testUser: User;
  let userToken: string;
  
  // Initialize a fresh database before all tests
  beforeAll(() => {
    // Reset the database before tests
    reinitializeTestDatabase();
  });
  
  // Create a new test user before each test
  beforeEach(() => {
    // Create a test user with a unique email to avoid unique constraint violations
    const timestamp = Date.now();
    const uniqueEmail = `test-${timestamp}@feed-test.com`;
    testUser = dbUtils.createUser(uniqueEmail, 'Feed Test User');
    userToken = createToken(testUser);
    
    // Create several test polls
    for (let i = 0; i < 15; i++) {
      const pollQuestion = `Test Poll ${i + 1} - ${timestamp}`;
      dbUtils.createPoll(
        testUser.id,
        pollQuestion,
        ['Option A', 'Option B', 'Option C']
      );
    }
    
    // Create a poll with a specific searchable term
    dbUtils.createPoll(
      testUser.id,
      `Searchable unique term ${timestamp}`,
      ['Option X', 'Option Y', 'Option Z']
    );
  });
  
  describe('GET /api/feed', () => {
    it('should return a paginated list of polls', async () => {
      const response = await request(app)
        .get('/api/feed')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${userToken}`])
        .expect(200);
      
      // Check response structure
      expect(response.body).toHaveProperty('polls');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('offset');
      expect(response.body.pagination).toHaveProperty('hasMore');
      
      // Check that polls were returned
      expect(Array.isArray(response.body.polls)).toBe(true);
      expect(response.body.polls.length).toBeGreaterThan(0);
      expect(response.body.polls.length).toBeLessThanOrEqual(10); // Default limit is 10
      
      // Check poll structure
      const firstPoll = response.body.polls[0];
      expect(firstPoll).toHaveProperty('poll');
      expect(firstPoll).toHaveProperty('answers');
      expect(firstPoll).toHaveProperty('author');
      expect(firstPoll).toHaveProperty('voteCounts');
    });
    
    it('should support pagination parameters', async () => {
      const limit = 5;
      const offset = 3;
      
      const response = await request(app)
        .get(`/api/feed?limit=${limit}&offset=${offset}`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${userToken}`])
        .expect(200);
      
      // Check pagination settings were applied
      expect(response.body.pagination.limit).toBe(limit);
      expect(response.body.pagination.offset).toBe(offset);
      expect(response.body.polls.length).toBeLessThanOrEqual(limit);
      
      // Fetch a second page and ensure different polls are returned
      const secondResponse = await request(app)
        .get(`/api/feed?limit=${limit}&offset=${offset + limit}`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${userToken}`])
        .expect(200);
      
      if (secondResponse.body.polls.length > 0 && response.body.polls.length > 0) {
        const firstPageFirstPollId = response.body.polls[0].poll.id;
        const secondPageFirstPollId = secondResponse.body.polls[0].poll.id;
        expect(firstPageFirstPollId).not.toBe(secondPageFirstPollId);
      }
    });
    
    it('should validate pagination parameters', async () => {
      // Test invalid limit
      const invalidLimitResponse = await request(app)
        .get('/api/feed?limit=invalid')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${userToken}`])
        .expect(400);
      
      expect(invalidLimitResponse.body).toHaveProperty('error', 'Invalid limit');
      
      // Test invalid offset
      const invalidOffsetResponse = await request(app)
        .get('/api/feed?offset=invalid')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${userToken}`])
        .expect(400);
      
      expect(invalidOffsetResponse.body).toHaveProperty('error', 'Invalid offset');
      
      // Test out of bounds limit
      const outOfBoundsLimitResponse = await request(app)
        .get('/api/feed?limit=100')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${userToken}`])
        .expect(400);
      
      expect(outOfBoundsLimitResponse.body).toHaveProperty('error', 'Invalid limit');
    });
    
    it('should support search functionality', async () => {
      // Create a timestamp to ensure unique search terms across test runs
      const timestamp = new Date().getTime();
      const uniqueSearchTerm = `unique-search-term-${timestamp}`;
      
      // Create a poll with the unique search term
      await dbUtils.createPoll(
        testUser.id,
        `Poll with ${uniqueSearchTerm} in the question`,
        ['Option 1', 'Option 2']
      );
      
      // Search for the unique term
      const response = await request(app)
        .get(`/api/feed?q=${uniqueSearchTerm}`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${userToken}`])
        .expect(200);
      
      // Verify at least one poll was found
      expect(response.body.polls.length).toBeGreaterThan(0);
      
      // Verify all returned polls contain the search term
      const allPollsContainTerm = response.body.polls.every(
        (poll: PollWithDetails) => poll.poll.question.includes(uniqueSearchTerm)
      );
      expect(allPollsContainTerm).toBe(true);
      
      // Search for a term that shouldn't exist
      const nonExistentResponse = await request(app)
        .get('/api/feed?q=this-term-should-not-exist-anywhere')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${userToken}`])
        .expect(200);
      
      // Verify no polls were found
      expect(nonExistentResponse.body.polls.length).toBe(0);
      expect(nonExistentResponse.body.pagination.total).toBe(0);
    });
    
    it('should support sorting options', async () => {
      // Test newest first (default)
      const newestResponse = await request(app)
        .get('/api/feed?sort=newest')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${userToken}`])
        .expect(200);
      
      // Test oldest first
      const oldestResponse = await request(app)
        .get('/api/feed?sort=oldest')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${userToken}`])
        .expect(200);
      
      // If there are multiple polls, check that the order is different
      if (newestResponse.body.polls.length > 1 && oldestResponse.body.polls.length > 1) {
        const newestFirstId = newestResponse.body.polls[0].poll.id;
        const oldestFirstId = oldestResponse.body.polls[0].poll.id;
        expect(newestFirstId).not.toBe(oldestFirstId);
      }
      
      // Test invalid sort parameter
      const invalidSortResponse = await request(app)
        .get('/api/feed?sort=invalid')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${userToken}`])
        .expect(400);
      
      expect(invalidSortResponse.body).toHaveProperty('error', 'Invalid sort parameter');
    });
  });
  
  describe('GET /api/feed/search', () => {
    it('should be an alias for /api/feed with search', async () => {
      // Create a timestamp to ensure unique search terms across test runs
      const timestamp = new Date().getTime();
      const uniqueSearchTerm = `unique-search-term-${timestamp}`;
      
      // Create a poll with the unique search term
      await dbUtils.createPoll(
        testUser.id,
        `Poll with ${uniqueSearchTerm} in the question`,
        ['Option 1', 'Option 2']
      );
      
      // Search via /api/feed/search endpoint
      const searchResponse = await request(app)
        .get(`/api/feed/search?q=${uniqueSearchTerm}`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${userToken}`])
        .expect(200);
      
      // Search via /api/feed endpoint with q parameter
      const feedResponse = await request(app)
        .get(`/api/feed?q=${uniqueSearchTerm}`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${userToken}`])
        .expect(200);
      
      // Both responses should have the same structure and similar content
      expect(searchResponse.body).toHaveProperty('polls');
      expect(feedResponse.body).toHaveProperty('polls');
      
      // Both should find the poll with the unique search term
      expect(searchResponse.body.polls.length).toBeGreaterThan(0);
      expect(feedResponse.body.polls.length).toBeGreaterThan(0);
    });
  });
  
  describe('GET /api/poll/:id/search', () => {
    it('should return polls for cross-referencing', async () => {
      // Create a main poll
      const mainPollResult = await dbUtils.createPoll(
        testUser.id,
        'Main poll for cross-referencing',
        ['Option 1', 'Option 2']
      );
      
      const response = await request(app)
        .get(`/api/poll/${mainPollResult.poll.id}/search`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${userToken}`])
        .expect(200);
      
      // Check response structure
      expect(response.body).toHaveProperty('polls');
      expect(response.body).toHaveProperty('pagination');
      
      // The main poll should not be included in the results
      const mainPollIncluded = response.body.polls.some(
        (poll: PollWithDetails) => poll.poll.id === mainPollResult.poll.id
      );
      expect(mainPollIncluded).toBe(false);
    });
    
    it('should support search functionality for cross-referencing', async () => {
      // Create a main poll
      const mainPollResult = await dbUtils.createPoll(
        testUser.id,
        'Main poll for cross-referencing',
        ['Option 1', 'Option 2']
      );
      
      // Create a timestamp to ensure unique search terms across test runs
      const timestamp = new Date().getTime();
      const uniqueSearchTerm = `xref-search-term-${timestamp}`;
      
      // Create a poll with the unique search term
      await dbUtils.createPoll(
        testUser.id,
        `Cross-ref poll with ${uniqueSearchTerm}`,
        ['Option A', 'Option B']
      );
      
      // Search for cross-reference candidates with the unique term
      const response = await request(app)
        .get(`/api/poll/${mainPollResult.poll.id}/search?q=${uniqueSearchTerm}`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${userToken}`])
        .expect(200);
      
      // Verify at least one poll was found
      expect(response.body.polls.length).toBeGreaterThan(0);
      
      // Verify all returned polls contain the search term
      const allPollsContainTerm = response.body.polls.every(
        (poll: PollWithDetails) => poll.poll.question.includes(uniqueSearchTerm)
      );
      expect(allPollsContainTerm).toBe(true);
    });
    
    it('should handle excluding already cross-referenced polls', async () => {
      // Create a main poll
      const mainPollResult = await dbUtils.createPoll(
        testUser.id,
        'Main poll for exclusion testing',
        ['Option 1', 'Option 2']
      );
      
      // Create a poll to exclude
      const excludePollResult = await dbUtils.createPoll(
        testUser.id,
        'Poll to exclude from cross-references',
        ['Option A', 'Option B']
      );
      
      // Get all cross-reference candidates without exclusions
      const noExcludeResponse = await request(app)
        .get(`/api/poll/${mainPollResult.poll.id}/search`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${userToken}`])
        .expect(200);
      
      // Check if the poll to exclude is in the results
      const pollToExcludeIncluded = noExcludeResponse.body.polls.some(
        (poll: PollWithDetails) => poll.poll.id === excludePollResult.poll.id
      );
      
      // It should be included when not excluded
      expect(pollToExcludeIncluded).toBe(true);
      
      // Get cross-reference candidates with exclusion
      const excludeResponse = await request(app)
        .get(`/api/poll/${mainPollResult.poll.id}/search?p1=${excludePollResult.poll.id}`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${userToken}`])
        .expect(200);
      
      // Check if the poll to exclude is in the results
      const pollToExcludeExcluded = excludeResponse.body.polls.every(
        (poll: PollWithDetails) => poll.poll.id !== excludePollResult.poll.id
      );
      
      // It should be excluded when specified
      expect(pollToExcludeExcluded).toBe(true);
    });
    
    it('should return 404 for non-existent poll ID', async () => {
      const response = await request(app)
        .get('/api/poll/non-existent-id/search')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${userToken}`])
        .expect(404);
      
      expect(response.body).toHaveProperty('error', 'Poll not found');
    });
  });
});
