import express from 'express';
import { createPoll, getPollById } from './controllers';
import { authenticate, requireAuth } from '../auth';

const router = express.Router();

// GET /api/poll/:id - Get poll by ID with details
// This route is available to anyone, but authenticated users will get their vote status
router.get('/:id', getPollById);

// POST /api/poll - Create a new poll (protected route)
// @ts-expect-error - Express handler compatibility issue with async function
router.post('/', authenticate, requireAuth, createPoll);

export default router;
