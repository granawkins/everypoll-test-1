import express from 'express';
import { getFeed } from './controllers';
import { authenticate } from '../auth';

const router = express.Router();

// GET /api/feed - Get paginated feed of polls with optional search
// This is a protected route but uses 'authenticate' middleware which allows anonymous access
router.get('/', authenticate, getFeed);

// GET /api/feed/search - Search for polls (alias for /api/feed?q=...)
router.get('/search', authenticate, getFeed);

export default router;
