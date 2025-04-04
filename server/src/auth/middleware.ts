import { Request, Response, NextFunction } from 'express';
import { getUserFromToken, createAnonymousUser, AUTH_COOKIE_NAME } from './utils';
import { User } from '../database/utils';

// Augment Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
      isAuthenticated?: boolean;
    }
  }
}

/**
 * Middleware that attaches the user to the request
 * If a valid token is found in cookies, the corresponding user is attached
 * If no valid token is found, an anonymous user is created and attached
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.cookies?.[AUTH_COOKIE_NAME];
    let user: User | null = null;
    let isAuthenticated = false;

    if (token) {
      // Try to get user from token
      user = await getUserFromToken(token);
      
      if (user) {
        isAuthenticated = user.email !== null; // Authenticated if not anonymous
      }
    }

    // If no valid user found, create an anonymous one
    if (!user) {
      user = createAnonymousUser();
      isAuthenticated = false;
    }

    // Attach user and authentication status to request
    req.user = user;
    req.isAuthenticated = isAuthenticated;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    // On error, still continue but with no user attached
    next();
  }
}

/**
 * Middleware that requires authentication
 * Should be used after the authenticate middleware
 * Rejects requests from unauthenticated users
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user || !req.isAuthenticated) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'You must be logged in to access this resource'
    });
  }
  
  next();
}
