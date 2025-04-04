import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { dbUtils } from '../database';
import { User } from '../database/utils';

// Secret for JWT signing - in production, this should be set as an environment variable
// Using a hardcoded value for simplicity in development
const JWT_SECRET = process.env.JWT_SECRET || 'everypoll-jwt-secret-key';

// Token expiration time (1 week)
const TOKEN_EXPIRATION = '7d'; 

// Cookie settings
export const COOKIE_OPTIONS = {
  httpOnly: true,      // Prevents JavaScript access to the cookie
  secure: process.env.NODE_ENV === 'production',  // Secure in production
  sameSite: 'strict' as const,  // Prevents CSRF attacks
  maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days in milliseconds
  path: '/'  // Cookie available for the entire domain
};

// Cookie name
export const AUTH_COOKIE_NAME = 'everypoll_auth';

/**
 * JWT payload interface
 */
export interface JwtPayload {
  userId: string;
  // Additional fields can be added in the future if needed
}

/**
 * Creates a JWT token for a user
 * @param user User object
 * @returns JWT token string
 */
export function createToken(user: User): string {
  const payload: JwtPayload = {
    userId: user.id
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRATION });
}

/**
 * Verifies and decodes a JWT token
 * @param token JWT token string
 * @returns Decoded payload or null if token is invalid
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (error) {
    console.error('JWT verification error:', error);
    return null;
  }
}

/**
 * Gets a user from a JWT token
 * @param token JWT token string
 * @returns User object or null if token is invalid
 */
export function getUserFromToken(token: string): Promise<User | null> {
  const payload = verifyToken(token);
  if (!payload) return Promise.resolve(null);

  const user = dbUtils.getUserById(payload.userId);
  return Promise.resolve(user);
}

/**
 * Creates a new anonymous user
 * @returns Newly created anonymous user
 */
export function createAnonymousUser(): User {
  return dbUtils.createUser();  // No email or name for anonymous user
}

/**
 * Gets current user from JWT token or creates anonymous user if no valid token
 * @param token JWT token string or undefined
 * @returns User object (either existing or newly created anonymous user)
 */
export async function getCurrentUser(token?: string): Promise<User> {
  // If token exists, attempt to get user from it
  if (token) {
    const user = await getUserFromToken(token);
    if (user) return user;
  }
  
  // If no token or invalid token, create an anonymous user
  return createAnonymousUser();
}
