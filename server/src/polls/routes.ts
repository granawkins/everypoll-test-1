import express from 'express';
import { createPoll, getPollById, voteOnPoll } from './controllers';
import { authenticate, requireAuth } from '../auth';

const router = express.Router();

// GET /api/poll/:id - Get poll by ID with details
// This route is available to anyone, but authenticated users will get their vote status
router.get('/:id', getPollById);

// POST /api/poll - Create a new poll (protected route)
router.post('/', authenticate, requireAuth, createPoll);

// POST /api/poll/:id/vote - Vote on a poll (protected route)
router.post('/:id/vote', authenticate, requireAuth, voteOnPoll);

export default router;
