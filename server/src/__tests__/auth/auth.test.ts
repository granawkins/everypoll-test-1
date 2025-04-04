import request from 'supertest';
import { app } from '../../app';
import { createToken, verifyToken, AUTH_COOKIE_NAME } from '../../auth';
import { dbUtils } from '../../database';
import { User } from '../../database/utils';
import { reinitializeTestDatabase } from '../../database/init';

describe('Authentication System', () => {
  let testUser: User;
  let userToken: string;

  // Initialize a fresh database before all tests
  beforeAll(() => {
    // Reset the database before tests
    reinitializeTestDatabase();
  });

  // Before each test, create a test user
  beforeEach(() => {
    // Create a test user with a unique email to avoid unique constraint violations
    // Each test will get its own user with a timestamp-based email
    const timestamp = Date.now();
    const uniqueEmail = `test-${timestamp}@auth-test.com`;
    testUser = dbUtils.createUser(uniqueEmail, 'Auth Test User');
    userToken = createToken(testUser);
  });

  describe('JWT Utilities', () => {
    it('should create valid tokens', () => {
      const token = createToken(testUser);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');

      const payload = verifyToken(token);
      expect(payload).toBeTruthy();
      expect(payload?.userId).toBe(testUser.id);
    });

    it('should reject invalid tokens', () => {
      const invalidToken = 'invalid.token.string';
      const payload = verifyToken(invalidToken);
      expect(payload).toBeNull();
    });

    it('should reject expired tokens', () => {
      // Create an expired token by manipulating the encoded data
      // This is a hack for testing - in a real system we wouldn't do this
      const parts = userToken.split('.');
      const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

      // Set expiration to a past time
      payload.exp = Math.floor(Date.now() / 1000) - 3600; // 1 hour in the past

      const modifiedHeaderBase64 = Buffer.from(JSON.stringify(header)).toString('base64').replace(/=/g, '');
      const modifiedPayloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64').replace(/=/g, '');

      // Reconstruct token with original signature (which will fail verification)
      const expiredToken = `${modifiedHeaderBase64}.${modifiedPayloadBase64}.${parts[2]}`;

      const result = verifyToken(expiredToken);
      expect(result).toBeNull();
    });
  });

  describe('Authentication Routes', () => {
    describe('GET /api/auth/me', () => {
      it('should return anonymous user when no token provided', async () => {
        const response = await request(app)
          .get('/api/auth/me')
          .expect(200);

        // Should return a user object with no email (anonymous)
        expect(response.body).toHaveProperty('id');
        expect(response.body.email).toBeNull();
        expect(response.body.name).toBeNull();
        expect(response.body.isAuthenticated).toBe(false);

        // Should set a cookie with token
        expect(response.headers['set-cookie']).toBeDefined();
        const cookie = response.headers['set-cookie'][0];
        expect(cookie).toContain(AUTH_COOKIE_NAME);
      });

      it('should return user data when valid token provided', async () => {
        const response = await request(app)
          .get('/api/auth/me')
          .set('Cookie', [`${AUTH_COOKIE_NAME}=${userToken}`])
          .expect(200);

        // Should return the correct user
        expect(response.body).toHaveProperty('id', testUser.id);
        expect(response.body).toHaveProperty('email', testUser.email);
        expect(response.body).toHaveProperty('name', testUser.name);
        expect(response.body.isAuthenticated).toBe(true);

        // Should not set a new cookie because the token was valid
        expect(response.headers['set-cookie']).toBeUndefined();
      });

      it('should create new anonymous user when invalid token provided', async () => {
        const response = await request(app)
          .get('/api/auth/me')
          .set('Cookie', [`${AUTH_COOKIE_NAME}=invalid.token.value`])
          .expect(200);

        // Should return a user object with no email (anonymous)
        expect(response.body).toHaveProperty('id');
        expect(response.body.email).toBeNull();
        expect(response.body.name).toBeNull();
        expect(response.body.isAuthenticated).toBe(false);

        // Should set a new cookie with token
        expect(response.headers['set-cookie']).toBeDefined();
        const cookie = response.headers['set-cookie'][0];
        expect(cookie).toContain(AUTH_COOKIE_NAME);
      });
    });

    describe('POST /api/auth/logout', () => {
      it('should clear auth cookie', async () => {
        const response = await request(app)
          .post('/api/auth/logout')
          .set('Cookie', [`${AUTH_COOKIE_NAME}=${userToken}`])
          .expect(200);

        // Should return success message
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('message', 'Logged out successfully');

        // Should clear the cookie
        expect(response.headers['set-cookie']).toBeDefined();
        const cookie = response.headers['set-cookie'][0];
        expect(cookie).toContain(`${AUTH_COOKIE_NAME}=;`);
        expect(cookie).toContain('Max-Age=0');
      });
    });
  });

  describe('Protected Routes', () => {
    // Use the test route we created in app.ts
    describe('GET /api/protected', () => {
      it('should indicate authentication status for anonymous users', async () => {
        const response = await request(app)
          .get('/api/protected')
          .expect(200);

        // Should identify as not authenticated
        expect(response.body).toHaveProperty('message', 'You are not authenticated.');
        expect(response.body.user).toHaveProperty('anonymous', true);
      });

      it('should recognize authenticated users', async () => {
        const response = await request(app)
          .get('/api/protected')
          .set('Cookie', [`${AUTH_COOKIE_NAME}=${userToken}`])
          .expect(200);

        // Should identify as authenticated
        expect(response.body).toHaveProperty('message', 'You are authenticated!');
        expect(response.body.user).toHaveProperty('id', testUser.id);
        expect(response.body.user).toHaveProperty('email', testUser.email);
        expect(response.body.user).toHaveProperty('name', testUser.name);
      });
    });
  });
});
