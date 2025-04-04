import { OAuth2Client } from 'google-auth-library';
import { dbUtils } from '../database';
import { User } from '../database/utils';

// Google OAuth configuration
// In production, these should be set as environment variables
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'dummy-client-id-for-development';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'dummy-client-secret-for-development';
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:5000/api/auth/callback';

// Create OAuth2 client
const oauth2Client = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  REDIRECT_URI
);

/**
 * Google user profile information received after authentication
 */
export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

/**
 * Google OAuth tokens returned after authentication
 */
export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
  id_token?: string;
  token_type?: string;
  scope?: string;
}

/**
 * Generates the Google OAuth URL for authentication
 * @param state Optional state parameter to track the user's session
 * @returns URL to redirect the user to for Google login
 */
export function getGoogleAuthUrl(state?: string): string {
  const scopes = [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email'
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
    state
  });
}

/**
 * Exchanges the authorization code for tokens
 * @param code Authorization code from Google redirect
 * @returns Object containing tokens and expiry information
 */
export async function getTokensFromCode(code: string): Promise<{ tokens: GoogleTokens | null; error?: string }> {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    return { tokens: tokens as GoogleTokens };
  } catch (error) {
    console.error('Error getting tokens from code:', error);
    return { tokens: null, error: 'Failed to exchange authorization code for tokens' };
  }
}

/**
 * Gets user information from Google using the access token
 * @param accessToken Google access token
 * @returns User profile information or null if there was an error
 */
export async function getUserInfoFromToken(accessToken: string): Promise<GoogleUserInfo | null> {
  try {
    // Set credentials for the client
    oauth2Client.setCredentials({ access_token: accessToken });
    
    // Fetch user information
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Google API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      picture: data.picture
    };
  } catch (error) {
    console.error('Error getting user info from token:', error);
    return null;
  }
}

/**
 * Creates or updates a user based on Google profile information
 * @param googleInfo Google user profile information
 * @returns The created or updated user
 */
export async function createOrUpdateUserFromGoogle(googleInfo: GoogleUserInfo): Promise<User> {
  // Check if user with this email already exists
  const existingUser = dbUtils.getUserByEmail(googleInfo.email);
  
  if (existingUser) {
    // Update existing user
    return dbUtils.updateUser(existingUser.id, {
      name: googleInfo.name
    }) as User;
  } else {
    // Create new user
    return dbUtils.createUser(googleInfo.email, googleInfo.name);
  }
}
