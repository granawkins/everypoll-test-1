import authRoutes from './routes';
import { authenticate, requireAuth } from './middleware';
import { 
  createToken, 
  verifyToken, 
  getUserFromToken, 
  createAnonymousUser,
  getCurrentUser,
  AUTH_COOKIE_NAME,
  COOKIE_OPTIONS
} from './utils';
import {
  getGoogleAuthUrl,
  getTokensFromCode,
  getUserInfoFromToken,
  createOrUpdateUserFromGoogle,
  type GoogleUserInfo,
  type GoogleTokens
} from './google';

export {
  authRoutes,
  authenticate,
  requireAuth,
  createToken,
  verifyToken,
  getUserFromToken,
  createAnonymousUser,
  getCurrentUser,
  AUTH_COOKIE_NAME,
  COOKIE_OPTIONS,
  getGoogleAuthUrl,
  getTokensFromCode,
  getUserInfoFromToken,
  createOrUpdateUserFromGoogle
};

// Re-export types with correct syntax for isolatedModules
export type { GoogleUserInfo, GoogleTokens };
