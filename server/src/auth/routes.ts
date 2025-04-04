import express, { Request, Response } from 'express';
import { createToken, getCurrentUser, AUTH_COOKIE_NAME, COOKIE_OPTIONS } from './utils';

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
