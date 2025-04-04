import express from 'express';
import { createPoll, getPollById, voteOnPoll } from './controllers';
import { authenticate, requireAuth } from '../auth';
import { searchCrossReferences } from '../feed/controllers';

const router = express.Router();

// GET /api/poll/:id - Get poll by ID with details
// This route is available to anyone, but authenticated users will get their vote status
router.get('/:id', getPollById);

// POST /api/poll - Create a new poll (protected route)
router.post('/', authenticate, requireAuth, createPoll);

// POST /api/poll/:id/vote - Vote on a poll (protected route)
router.post('/:id/vote', authenticate, requireAuth, voteOnPoll);

// GET /api/poll/:id/search - Search for polls to cross-reference with a specific poll
router.get('/:id/search', authenticate, searchCrossReferences);

export default router;
