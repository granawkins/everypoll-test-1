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
  GoogleUserInfo
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
  createOrUpdateUserFromGoogle,
  GoogleUserInfo
};
