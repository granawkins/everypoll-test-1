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
    
    // If we had to create a new anonymous user, set token in cookie
    if (!token || !req.user) {
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
    console.error('Error in /auth/me:', error);
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
    console.error('Error in /auth/login:', error);
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
    const { code, state, error } = req.query;
    
    // Handle error from Google
    if (error) {
      console.error('Error from Google OAuth:', error);
      return res.redirect('/?auth=error');
    }
    
    // Make sure we have an authorization code
    if (!code || typeof code !== 'string') {
      console.error('Missing authorization code in callback');
      return res.redirect('/?auth=error');
    }
    
    // Exchange authorization code for tokens
    const { tokens, error: tokenError } = await getTokensFromCode(code);
    
    if (tokenError || !tokens?.access_token) {
      console.error('Error getting tokens:', tokenError);
      return res.redirect('/?auth=error');
    }
    
    // Get user information from Google using the access token
    const googleUserInfo = await getUserInfoFromToken(tokens.access_token);
    
    if (!googleUserInfo) {
      console.error('Error getting user info from Google');
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
    console.error('Error in /auth/callback:', error);
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
    console.error('Error in /auth/logout:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'An error occurred while processing your request' 
    });
  }
});

export default router;
