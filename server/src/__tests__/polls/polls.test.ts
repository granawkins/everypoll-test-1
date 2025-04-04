import request from 'supertest';
import { app } from '../../app';
import { reinitializeTestDatabase } from '../../database/init';
import { dbUtils } from '../../database';
import { createToken, AUTH_COOKIE_NAME } from '../../auth';
import { User } from '../../database/utils';

describe('Poll API Endpoints', () => {
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
    const uniqueEmail = `test-${timestamp}@polls-test.com`;
    testUser = dbUtils.createUser(uniqueEmail, 'Poll Test User');
    userToken = createToken(testUser);
  });

  describe('POST /api/poll', () => {
    it('should create a poll when authenticated with valid data', async () => {
      const pollData = {
        question: 'What is your favorite color?',
        answers: ['Red', 'Blue', 'Green', 'Yellow']
      };

      const response = await request(app)
        .post('/api/poll')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${userToken}`])
        .send(pollData)
        .expect(201);

      // Check response structure
      expect(response.body).toHaveProperty('poll');
      expect(response.body).toHaveProperty('answers');
      expect(response.body.poll.question).toBe(pollData.question);
      expect(response.body.poll.author_id).toBe(testUser.id);
      expect(response.body.answers).toHaveLength(pollData.answers.length);

      // Check that answers match
      const answerTexts = response.body.answers.map((a: { text: string }) => a.text);
      expect(answerTexts).toEqual(expect.arrayContaining(pollData.answers));

      // Verify poll was saved in database
      const savedPoll = dbUtils.getPollById(response.body.poll.id);
      expect(savedPoll).not.toBeNull();
      expect(savedPoll?.poll.question).toBe(pollData.question);
    });

    it('should reject poll creation with too few answers', async () => {
      const pollData = {
        question: 'What is your favorite color?',
        answers: ['Red'] // Only one answer
      };

      const response = await request(app)
        .post('/api/poll')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${userToken}`])
        .send(pollData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid answers');
      expect(response.body.message).toContain('at least 2 answer options');
    });

    it('should reject poll creation with too many answers', async () => {
      const pollData = {
        question: 'What is your favorite color?',
        // 11 answers, exceeding the limit of 10
        answers: ['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange', 'Pink', 'Brown', 'Black', 'White', 'Gray']
      };

      const response = await request(app)
        .post('/api/poll')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${userToken}`])
        .send(pollData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Too many answers');
      expect(response.body.message).toContain('cannot have more than 10 answer options');
    });

    it('should reject poll creation with empty question', async () => {
      const pollData = {
        question: '',
        answers: ['Red', 'Blue', 'Green']
      };

      const response = await request(app)
        .post('/api/poll')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${userToken}`])
        .send(pollData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Missing question');
    });

    it('should reject poll creation with empty answer', async () => {
      const pollData = {
        question: 'What is your favorite color?',
        answers: ['Red', ''] // Second answer is empty
      };

      const response = await request(app)
        .post('/api/poll')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${userToken}`])
        .send(pollData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Empty answer');
    });

    it('should reject poll creation when not authenticated', async () => {
      const pollData = {
        question: 'What is your favorite color?',
        answers: ['Red', 'Blue', 'Green']
      };

      const response = await request(app)
        .post('/api/poll')
        .send(pollData)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Authentication required');
    });
  });

  describe('GET /api/poll/:id', () => {
    let createdPollId: string;

    beforeEach(async () => {
      // Create a test poll
      const pollResult = dbUtils.createPoll(
        testUser.id,
        'Test Question',
        ['Option A', 'Option B', 'Option C']
      );
      createdPollId = pollResult.poll.id;

      // Add some votes for the poll
      // Use timestamp to ensure unique emails
      const timestamp = Date.now();
      const user2 = dbUtils.createUser(`user2-${timestamp}@example.com`, 'User 2');
      const user3 = dbUtils.createUser(`user3-${timestamp}@example.com`, 'User 3');

      dbUtils.createVote(user2.id, createdPollId, pollResult.answers[0].id);
      dbUtils.createVote(user3.id, createdPollId, pollResult.answers[1].id);
    });

    it('should return poll with answers and author info', async () => {
      const response = await request(app)
        .get(`/api/poll/${createdPollId}`)
        .expect(200);

      // Check response structure
      expect(response.body).toHaveProperty('poll');
      expect(response.body).toHaveProperty('answers');
      expect(response.body).toHaveProperty('author');
      expect(response.body).toHaveProperty('voteCounts');

      // Check poll details
      expect(response.body.poll.id).toBe(createdPollId);
      expect(response.body.poll.question).toBe('Test Question');
      
      // Check author info
      expect(response.body.author.id).toBe(testUser.id);
      expect(response.body.author.name).toBe(testUser.name);
      
      // Check answers
      expect(response.body.answers).toHaveLength(3);
      expect(response.body.answers[0].text).toBe('Option A');
      
      // Check vote counts
      expect(Object.keys(response.body.voteCounts).length).toBe(2); // Two answers have votes
    });

    it('should include user vote info when authenticated user has voted', async () => {
      // Get the poll answers
      const pollResult = dbUtils.getPollById(createdPollId);
      if (!pollResult) {
        throw new Error('Test poll not found');
      }
      
      // Cast a vote as the test user
      dbUtils.createVote(testUser.id, createdPollId, pollResult.answers[2].id);
      
      const response = await request(app)
        .get(`/api/poll/${createdPollId}`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${userToken}`])
        .expect(200);

      // Check that user vote is included
      expect(response.body).toHaveProperty('userVote');
      expect(response.body.userVote).not.toBeNull();
      expect(response.body.userVote.answerId).toBe(pollResult.answers[2].id);
    });

    it('should return 404 for non-existent poll', async () => {
      const response = await request(app)
        .get('/api/poll/non-existent-id')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Poll not found');
    });
  });

  describe('Cross-Reference Functionality', () => {
    let pollA: { poll: any; answers: any[] }; // Main poll
    let pollB: { poll: any; answers: any[] }; // First cross-reference poll
    let pollC: { poll: any; answers: any[] }; // Second cross-reference poll
    let users: User[] = []; // Array of test users
    let userTokens: string[] = []; // Auth tokens for test users

    beforeEach(async () => {
      // Reset users array
      users = [];
      userTokens = [];

      // Create multiple users for voting
      for (let i = 0; i < 6; i++) {
        const timestamp = Date.now();
        const userEmail = `xref-user-${i}-${timestamp}@example.com`;
        const user = dbUtils.createUser(userEmail, `XRef User ${i}`);
        users.push(user);
        userTokens.push(createToken(user));
      }

      // Create poll A (the main poll being queried)
      pollA = dbUtils.createPoll(
        testUser.id,
        'Do you prefer cats or dogs?',
        ['Cats', 'Dogs']
      );

      // Create poll B (first cross-reference poll)
      pollB = dbUtils.createPoll(
        testUser.id,
        'Are you a morning or night person?',
        ['Morning Person', 'Night Owl']
      );

      // Create poll C (second cross-reference poll)
      pollC = dbUtils.createPoll(
        testUser.id,
        'How do you like your coffee?',
        ['Black', 'With Milk', 'With Sugar', 'With Both']
      );

      // Create voting patterns that will show clear cross-reference results:
      
      // First 3 users vote for Cats on Poll A
      // Last 3 users vote for Dogs on Poll A
      for (let i = 0; i < 3; i++) {
        dbUtils.createVote(users[i].id, pollA.poll.id, pollA.answers[0].id); // Cats
        dbUtils.createVote(users[i + 3].id, pollA.poll.id, pollA.answers[1].id); // Dogs
      }

      // For Poll B (Morning/Night):
      // Users 0, 2, 4 vote Morning (mix of cat and dog lovers)
      // Users 1, 3, 5 vote Night Owl (mix of cat and dog lovers)
      for (let i = 0; i < 6; i++) {
        const answerIndex = i % 2; // Even users vote Morning, Odd users vote Night
        dbUtils.createVote(users[i].id, pollB.poll.id, pollB.answers[answerIndex].id);
      }

      // For Poll C (Coffee):
      // Each user votes differently to create distinct patterns
      for (let i = 0; i < 6; i++) {
        const answerIndex = i % 4; // Each user has different coffee preference
        dbUtils.createVote(users[i].id, pollC.poll.id, pollC.answers[answerIndex].id);
      }
    });

    it('should return poll with cross-reference data when valid parameters are provided', async () => {
      // Query poll A with cross-reference to poll B, answer "Morning Person"
      const response = await request(app)
        .get(`/api/poll/${pollA.poll.id}?p1=${pollB.poll.id}&a1=${pollB.answers[0].id}`)
        .expect(200);

      // Check response structure
      expect(response.body).toHaveProperty('crossReferences');
      expect(response.body.crossReferences).toHaveLength(1);
      
      // Check cross-reference data
      const xref = response.body.crossReferences[0];
      expect(xref).toHaveProperty('pollId', pollB.poll.id);
      expect(xref).toHaveProperty('answerId', pollB.answers[0].id);
      expect(xref).toHaveProperty('poll');
      expect(xref).toHaveProperty('answer');
      expect(xref).toHaveProperty('voteCounts');
      
      // Check cross-reference poll and answer details
      expect(xref.poll.question).toBe('Are you a morning or night person?');
      expect(xref.answer.text).toBe('Morning Person');
      
      // Check vote counts are filtered correctly
      // Among morning people, we should see votes for both cats and dogs
      expect(Object.keys(xref.voteCounts).length).toBeGreaterThan(0);
    });

    it('should return different results for different cross-referenced answers', async () => {
      // Query poll A with cross-reference to poll B, answer "Morning Person"
      const responseMorning = await request(app)
        .get(`/api/poll/${pollA.poll.id}?p1=${pollB.poll.id}&a1=${pollB.answers[0].id}`)
        .expect(200);

      // Query poll A with cross-reference to poll B, answer "Night Owl"
      const responseNight = await request(app)
        .get(`/api/poll/${pollA.poll.id}?p1=${pollB.poll.id}&a1=${pollB.answers[1].id}`)
        .expect(200);

      // Get the vote counts for both queries
      const morningVoteCounts = responseMorning.body.crossReferences[0].voteCounts;
      const nightVoteCounts = responseNight.body.crossReferences[0].voteCounts;

      // Verify that the vote counts are different
      expect(morningVoteCounts).not.toEqual(nightVoteCounts);
    });

    it('should support multiple cross-references', async () => {
      // Query poll A with cross-references to both poll B and poll C
      const response = await request(app)
        .get(`/api/poll/${pollA.poll.id}?p1=${pollB.poll.id}&a1=${pollB.answers[0].id}&p2=${pollC.poll.id}&a2=${pollC.answers[0].id}`)
        .expect(200);

      // Check response structure
      expect(response.body).toHaveProperty('crossReferences');
      expect(response.body.crossReferences).toHaveLength(2);
      
      // Check first cross-reference (Poll B)
      expect(response.body.crossReferences[0].pollId).toBe(pollB.poll.id);
      expect(response.body.crossReferences[0].answerId).toBe(pollB.answers[0].id);
      
      // Check second cross-reference (Poll C)
      expect(response.body.crossReferences[1].pollId).toBe(pollC.poll.id);
      expect(response.body.crossReferences[1].answerId).toBe(pollC.answers[0].id);
    });

    it('should return error for invalid cross-reference poll ID', async () => {
      const response = await request(app)
        .get(`/api/poll/${pollA.poll.id}?p1=non-existent-poll-id&a1=${pollB.answers[0].id}`)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid cross-reference');
      expect(response.body.message).toContain('not found');
    });

    it('should return error for invalid cross-reference answer ID', async () => {
      const response = await request(app)
        .get(`/api/poll/${pollA.poll.id}?p1=${pollB.poll.id}&a1=non-existent-answer-id`)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid cross-reference');
      expect(response.body.message).toContain('does not belong to poll');
    });

    it('should skip cross-reference pairs with missing parameters', async () => {
      // Missing answer ID
      const response = await request(app)
        .get(`/api/poll/${pollA.poll.id}?p1=${pollB.poll.id}`)
        .expect(200);

      // Should not have cross-references
      expect(response.body).not.toHaveProperty('crossReferences');
    });
  });

  describe('POST /api/poll/:id/vote', () => {
    let pollId: string;
    let answerId: string;

    beforeEach(() => {
      // Create a test poll
      const pollResult = dbUtils.createPoll(
        testUser.id,
        'Voting Test Question',
        ['Option A', 'Option B', 'Option C']
      );
      pollId = pollResult.poll.id;
      answerId = pollResult.answers[0].id;
    });

    it('should record a vote when authenticated with valid data', async () => {
      const voteData = {
        answerId: answerId
      };

      const response = await request(app)
        .post(`/api/poll/${pollId}/vote`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${userToken}`])
        .send(voteData)
        .expect(201);

      // Check response structure
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('vote');
      expect(response.body).toHaveProperty('voteCounts');
      expect(response.body.vote.answerId).toBe(answerId);

      // Verify vote was recorded in database
      const userVote = dbUtils.getUserVote(testUser.id, pollId);
      expect(userVote).not.toBeNull();
      expect(userVote?.answer_id).toBe(answerId);

      // Verify vote count was updated
      expect(response.body.voteCounts[answerId]).toBe(1);
    });

    it('should reject voting when not authenticated', async () => {
      const voteData = {
        answerId: answerId
      };

      const response = await request(app)
        .post(`/api/poll/${pollId}/vote`)
        .send(voteData)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Authentication required');
    });

    it('should reject voting with missing answer ID', async () => {
      const response = await request(app)
        .post(`/api/poll/${pollId}/vote`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${userToken}`])
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Missing answer ID');
    });

    it('should reject voting on non-existent poll', async () => {
      const voteData = {
        answerId: answerId
      };

      const response = await request(app)
        .post('/api/poll/non-existent-id/vote')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${userToken}`])
        .send(voteData)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Poll not found');
    });

    it('should reject voting with invalid answer ID', async () => {
      const voteData = {
        answerId: 'non-existent-answer-id'
      };

      const response = await request(app)
        .post(`/api/poll/${pollId}/vote`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${userToken}`])
        .send(voteData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid answer');
    });

    it('should prevent voting twice on the same poll', async () => {
      // Get the poll to access answer IDs
      const pollResult = dbUtils.getPollById(pollId);
      if (!pollResult) {
        throw new Error('Test poll not found');
      }
      
      // Get a different answer ID for the second vote attempt
      const firstAnswerId = pollResult.answers[0].id;
      const secondAnswerId = pollResult.answers[1].id; // Use a different but valid answer ID
      
      // First vote should succeed
      await request(app)
        .post(`/api/poll/${pollId}/vote`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${userToken}`])
        .send({ answerId: firstAnswerId })
        .expect(201);

      // Second vote should fail with "Already voted" error
      const response = await request(app)
        .post(`/api/poll/${pollId}/vote`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${userToken}`])
        .send({ answerId: secondAnswerId })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Already voted');
      expect(response.body).toHaveProperty('vote.answerId', firstAnswerId);
    });

    it('should update vote counts correctly after multiple votes', async () => {
      // Create two more users
      const timestamp = Date.now();
      const user2 = dbUtils.createUser(`user2-${timestamp}@example.com`, 'User 2');
      const user3 = dbUtils.createUser(`user3-${timestamp}@example.com`, 'User 3');
      const user2Token = createToken(user2);
      const user3Token = createToken(user3);

      // Get the poll to access all answer IDs
      const pollResult = dbUtils.getPollById(pollId);
      if (!pollResult) {
        throw new Error('Test poll not found');
      }
      
      // First user votes for option A
      await request(app)
        .post(`/api/poll/${pollId}/vote`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${userToken}`])
        .send({ answerId: pollResult.answers[0].id })
        .expect(201);

      // Second user votes for option B
      await request(app)
        .post(`/api/poll/${pollId}/vote`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${user2Token}`])
        .send({ answerId: pollResult.answers[1].id })
        .expect(201);

      // Third user votes for option A again
      const response = await request(app)
        .post(`/api/poll/${pollId}/vote`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${user3Token}`])
        .send({ answerId: pollResult.answers[0].id })
        .expect(201);

      // Check final vote counts
      expect(response.body.voteCounts[pollResult.answers[0].id]).toBe(2); // 2 votes for option A
      expect(response.body.voteCounts[pollResult.answers[1].id]).toBe(1); // 1 vote for option B
      expect(response.body.voteCounts[pollResult.answers[2].id]).toBeUndefined(); // 0 votes for option C
    });
  });
});
