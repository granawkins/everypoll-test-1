import request from 'supertest';
import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import { authenticate, requireAuth } from '../../auth/middleware';
import { createToken, AUTH_COOKIE_NAME } from '../../auth/utils';
import { dbUtils } from '../../database';
import { User } from '../../database/utils';
import { reinitializeTestDatabase } from '../../database/init';

// Create a test app with the authentication middleware
const createTestApp = () => {
  const app = express();
  app.use(cookieParser());
  app.use(authenticate);

  // Public route - no authentication required
  app.get('/public', (req: Request, res: Response) => {
    res.json({ 
      message: 'Public route',
      user: req.user,
      isAuthenticated: req.isAuthenticated
    });
  });

  // Protected route - requires authentication
  app.get('/protected', requireAuth, (req: Request, res: Response) => {
    res.json({ 
      message: 'Protected route',
      user: req.user
    });
  });

  return app;
};

describe('Authentication Middleware', () => {
  let testApp: express.Application;
  let testUser: User;
  let userToken: string;

  // Initialize a fresh database before all tests
  beforeAll(() => {
    // Reset the database before tests
    reinitializeTestDatabase();
  });

  beforeEach(() => {
    // Create a test app
    testApp = createTestApp();
    
    // Create a test user with a domain specific to this test file
    // to avoid conflicts with other test files
    testUser = dbUtils.createUser('user@middleware-test.com', 'Middleware Test User');
    userToken = createToken(testUser);
  });

  describe('authenticate middleware', () => {
    it('should attach anonymous user when no token is provided', async () => {
      const response = await request(testApp)
        .get('/public')
        .expect(200);

      expect(response.body.user).toBeDefined();
      expect(response.body.user.id).toBeDefined();
      expect(response.body.user.email).toBeNull();
      expect(response.body.isAuthenticated).toBe(false);
    });

    it('should attach authenticated user when valid token is provided', async () => {
      const response = await request(testApp)
        .get('/public')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${userToken}`])
        .expect(200);

      expect(response.body.user).toBeDefined();
      expect(response.body.user.id).toBe(testUser.id);
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.isAuthenticated).toBe(true);
    });

    it('should create anonymous user when invalid token is provided', async () => {
      const response = await request(testApp)
        .get('/public')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=invalid.token.string`])
        .expect(200);

      expect(response.body.user).toBeDefined();
      expect(response.body.user.id).toBeDefined();
      expect(response.body.user.email).toBeNull();
      expect(response.body.isAuthenticated).toBe(false);
    });
  });

  describe('requireAuth middleware', () => {
    it('should allow access to authenticated users', async () => {
      const response = await request(testApp)
        .get('/protected')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${userToken}`])
        .expect(200);

      expect(response.body.message).toBe('Protected route');
      expect(response.body.user.id).toBe(testUser.id);
    });

    it('should block access to unauthenticated users', async () => {
      const response = await request(testApp)
        .get('/protected')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Authentication required');
    });

    it('should block access with invalid tokens', async () => {
      const response = await request(testApp)
        .get('/protected')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=invalid.token.string`])
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Authentication required');
    });
  });
});
