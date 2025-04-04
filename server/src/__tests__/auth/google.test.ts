import request from 'supertest';
import { app } from '../../app';
import { AUTH_COOKIE_NAME } from '../../auth';
import { dbUtils } from '../../database';
import { reinitializeTestDatabase } from '../../database/init';
import * as googleAuth from '../../auth/google';

// Mock the Google OAuth functions
jest.mock('../../auth/google', () => {
  const originalModule = jest.requireActual('../../auth/google');
  
  return {
    __esModule: true,
    ...originalModule,
    getGoogleAuthUrl: jest.fn(),
    getTokensFromCode: jest.fn(),
    getUserInfoFromToken: jest.fn(),
    createOrUpdateUserFromGoogle: jest.fn(),
  };
});

describe('Google OAuth Integration', () => {
  // Reset database before all tests
  beforeAll(() => {
    reinitializeTestDatabase();
  });
  
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('GET /api/auth/login', () => {
    it('should redirect to Google login', async () => {
      // Mock the Google auth URL
      const mockGoogleAuthUrl = 'https://accounts.google.com/o/oauth2/auth?mock-url';
      (googleAuth.getGoogleAuthUrl as jest.Mock).mockReturnValue(mockGoogleAuthUrl);
      
      const response = await request(app)
        .get('/api/auth/login')
        .expect(302); // Redirect status
      
      // Verify that it redirects to the Google auth URL
      expect(response.headers.location).toBe(mockGoogleAuthUrl);
      
      // Verify that the getGoogleAuthUrl function was called
      expect(googleAuth.getGoogleAuthUrl).toHaveBeenCalled();
    });
  });

  describe('GET /api/auth/callback', () => {
    it('should handle successful Google authentication', async () => {
      // Mock Google's responses
      const mockCode = 'mock-auth-code';
      const mockAccessToken = 'mock-access-token';
      const mockUserInfo = {
        id: 'google-123',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/profile.jpg'
      };
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User'
      };
      
      // Set up mocks
      (googleAuth.getTokensFromCode as jest.Mock).mockResolvedValue({ 
        tokens: { access_token: mockAccessToken } 
      });
      (googleAuth.getUserInfoFromToken as jest.Mock).mockResolvedValue(mockUserInfo);
      (googleAuth.createOrUpdateUserFromGoogle as jest.Mock).mockResolvedValue(mockUser);
      
      // Test the callback route
      const response = await request(app)
        .get(`/api/auth/callback?code=${mockCode}`)
        .expect(302); // Redirect status
      
      // Verify that it redirects to the success URL
      expect(response.headers.location).toBe('/?auth=success');
      
      // Verify that the JWT token was set in cookies
      expect(response.headers['set-cookie']).toBeDefined();
      expect(response.headers['set-cookie'][0]).toContain(AUTH_COOKIE_NAME);
      
      // Verify that all necessary functions were called with the right parameters
      expect(googleAuth.getTokensFromCode).toHaveBeenCalledWith(mockCode);
      expect(googleAuth.getUserInfoFromToken).toHaveBeenCalledWith(mockAccessToken);
      expect(googleAuth.createOrUpdateUserFromGoogle).toHaveBeenCalledWith(mockUserInfo);
    });
    
    it('should handle error from Google', async () => {
      const response = await request(app)
        .get('/api/auth/callback?error=access_denied')
        .expect(302); // Redirect status
      
      // Verify that it redirects to the error URL
      expect(response.headers.location).toBe('/?auth=error');
      
      // No auth cookie should be set
      expect(response.headers['set-cookie']).toBeUndefined();
    });
    
    it('should handle missing code parameter', async () => {
      const response = await request(app)
        .get('/api/auth/callback')
        .expect(302); // Redirect status
      
      // Verify that it redirects to the error URL
      expect(response.headers.location).toBe('/?auth=error');
      
      // No auth cookie should be set
      expect(response.headers['set-cookie']).toBeUndefined();
    });
    
    it('should handle token exchange failure', async () => {
      // Mock token exchange failure
      (googleAuth.getTokensFromCode as jest.Mock).mockResolvedValue({ 
        tokens: null, 
        error: 'Invalid authorization code' 
      });
      
      const response = await request(app)
        .get('/api/auth/callback?code=invalid-code')
        .expect(302); // Redirect status
      
      // Verify that it redirects to the error URL
      expect(response.headers.location).toBe('/?auth=error');
      
      // Verify the function was called
      expect(googleAuth.getTokensFromCode).toHaveBeenCalledWith('invalid-code');
      
      // No auth cookie should be set
      expect(response.headers['set-cookie']).toBeUndefined();
    });
    
    it('should handle user info retrieval failure', async () => {
      // Mock successful token exchange but failed user info retrieval
      (googleAuth.getTokensFromCode as jest.Mock).mockResolvedValue({ 
        tokens: { access_token: 'valid-token' } 
      });
      (googleAuth.getUserInfoFromToken as jest.Mock).mockResolvedValue(null);
      
      const response = await request(app)
        .get('/api/auth/callback?code=valid-code')
        .expect(302); // Redirect status
      
      // Verify that it redirects to the error URL
      expect(response.headers.location).toBe('/?auth=error');
      
      // Verify functions were called
      expect(googleAuth.getTokensFromCode).toHaveBeenCalledWith('valid-code');
      expect(googleAuth.getUserInfoFromToken).toHaveBeenCalledWith('valid-token');
      
      // No auth cookie should be set
      expect(response.headers['set-cookie']).toBeUndefined();
    });
  });

  describe('User Management', () => {
    it('should create a new user from Google profile', async () => {
      // Setup
      const googleInfo = {
        id: 'google-new-user',
        email: 'new-user@example.com',
        name: 'New User'
      };
      
      // Use the actual implementation for this test
      const createOrUpdateUserFromGoogle = jest.requireActual('../../auth/google').createOrUpdateUserFromGoogle;
      
      // Call the function directly
      const user = await createOrUpdateUserFromGoogle(googleInfo);
      
      // Verify user was created correctly
      expect(user).toBeDefined();
      expect(user.email).toBe(googleInfo.email);
      expect(user.name).toBe(googleInfo.name);
      
      // Verify user exists in database
      const dbUser = dbUtils.getUserByEmail(googleInfo.email);
      expect(dbUser).not.toBeNull();
      expect(dbUser?.email).toBe(googleInfo.email);
    });
    
    it('should update an existing user from Google profile', async () => {
      // Create a user first
      const existingUser = dbUtils.createUser('existing@example.com', 'Old Name');
      
      // Setup Google profile with updated name
      const googleInfo = {
        id: 'google-existing-user',
        email: existingUser.email!,
        name: 'Updated Name'
      };
      
      // Use the actual implementation for this test
      const createOrUpdateUserFromGoogle = jest.requireActual('../../auth/google').createOrUpdateUserFromGoogle;
      
      // Call the function directly
      const updatedUser = await createOrUpdateUserFromGoogle(googleInfo);
      
      // Verify user was updated correctly
      expect(updatedUser).toBeDefined();
      expect(updatedUser.id).toBe(existingUser.id); // Same user ID
      expect(updatedUser.email).toBe(existingUser.email); // Same email
      expect(updatedUser.name).toBe(googleInfo.name); // Updated name
      
      // Verify user was updated in database
      const dbUser = dbUtils.getUserById(existingUser.id);
      expect(dbUser?.name).toBe(googleInfo.name);
    });
  });
});
