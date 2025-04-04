import express, { Request, Response } from 'express';
import { 
  createToken, 
  getCurrentUser, 
  AUTH_COOKIE_NAME, 
  COOKIE_OPTIONS 
} from './utils';
import { 
  getGoogleAuthUrl, 
  getTokensFromCode, 
  getUserInfoFromToken, 
  createOrUpdateUserFromGoogle 
} from './google';

const router = express.Router();

/**
 * GET /api/auth/me
 * Returns the current user or creates an anonymous one if no valid token
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.[AUTH_COOKIE_NAME];
    const user = await getCurrentUser(token);
    
    // Set a new cookie if:
    // 1. No token was provided, OR
    // 2. Token was invalid (checking if user.id differs from req.user.id), OR
    // 3. For some reason req.user is not defined
    const isInvalidToken = token && req.user && user.id !== req.user.id;
    if (!token || isInvalidToken || !req.user) {
      const newToken = createToken(user);
      res.cookie(AUTH_COOKIE_NAME, newToken, COOKIE_OPTIONS);
    }
    
    // Return user without sensitive fields
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      isAuthenticated: user.email !== null, // True if not anonymous
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Error in /auth/me:', error);
    }
    res.status(500).json({ 
      error: 'Server error',
      message: 'An error occurred while processing your request' 
    });
  }
});

/**
 * GET /api/auth/login
 * Redirects the user to Google's login page
 */
router.get('/login', (req: Request, res: Response) => {
  try {
    // Generate state parameter to mitigate CSRF attacks
    // In a production environment, you'd store this in a session or database
    const state = Math.random().toString(36).substring(2, 15);
    
    // Generate the Google OAuth URL with the state parameter
    const authUrl = getGoogleAuthUrl(state);
    
    // Redirect to Google's login page
    res.redirect(authUrl);
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Error in /auth/login:', error);
    }
    res.status(500).json({ 
      error: 'Server error',
      message: 'An error occurred while processing your request' 
    });
  }
});

/**
 * GET /api/auth/callback
 * Handles the callback from Google after user authentication
 */
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code, error } = req.query;
    // Note: In a production app, we would validate the state parameter
    // to prevent CSRF attacks, but we're omitting that for simplicity
    
    // Handle error from Google
    if (error) {
      if (process.env.NODE_ENV !== 'test') {
        console.error('Error from Google OAuth:', error);
      }
      return res.redirect('/?auth=error');
    }
    
    // Make sure we have an authorization code
    if (!code || typeof code !== 'string') {
      if (process.env.NODE_ENV !== 'test') {
        console.error('Missing authorization code in callback');
      }
      return res.redirect('/?auth=error');
    }
    
    // Exchange authorization code for tokens
    const { tokens, error: tokenError } = await getTokensFromCode(code);
    
    if (tokenError || !tokens?.access_token) {
      if (process.env.NODE_ENV !== 'test') {
        console.error('Error getting tokens:', tokenError);
      }
      return res.redirect('/?auth=error');
    }
    
    // Get user information from Google using the access token
    const googleUserInfo = await getUserInfoFromToken(tokens.access_token);
    
    if (!googleUserInfo) {
      if (process.env.NODE_ENV !== 'test') {
        console.error('Error getting user info from Google');
      }
      return res.redirect('/?auth=error');
    }
    
    // Create or update user in our database
    const user = await createOrUpdateUserFromGoogle(googleUserInfo);
    
    // Generate JWT token
    const jwtToken = createToken(user);
    
    // Set JWT token in cookie
    res.cookie(AUTH_COOKIE_NAME, jwtToken, COOKIE_OPTIONS);
    
    // Redirect to the home page
    res.redirect('/?auth=success');
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Error in /auth/callback:', error);
    }
    res.redirect('/?auth=error');
  }
});

/**
 * POST /api/auth/logout
 * Clears the auth cookie
 */
router.post('/logout', (req: Request, res: Response) => {
  try {
    // Clear the auth cookie
    res.clearCookie(AUTH_COOKIE_NAME, {
      ...COOKIE_OPTIONS,
      maxAge: 0
    });
    
    res.json({ 
      success: true,
      message: 'Logged out successfully' 
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Error in /auth/logout:', error);
    }
    res.status(500).json({ 
      error: 'Server error',
      message: 'An error occurred while processing your request' 
    });
  }
});

export default router;
