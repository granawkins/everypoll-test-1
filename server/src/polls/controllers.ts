import { Request, Response, NextFunction } from 'express';
import { dbUtils } from '../database';

/**
 * Creates a new poll
 */
export const createPoll = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validate request body
    const { question, answers } = req.body;

    if (!question || !question.trim()) {
      res.status(400).json({
        error: 'Missing question',
        message: 'Poll question is required'
      });
      return;
    }

    if (!answers || !Array.isArray(answers) || answers.length < 2) {
      res.status(400).json({
        error: 'Invalid answers',
        message: 'Poll must have at least 2 answer options'
      });
      return;
    }

    if (answers.length > 10) {
      res.status(400).json({
        error: 'Too many answers',
        message: 'Poll cannot have more than 10 answer options'
      });
      return;
    }

    // Check if all answers have text
    const emptyAnswerIndex = answers.findIndex((answer) => !answer || !answer.trim());
    if (emptyAnswerIndex !== -1) {
      res.status(400).json({
        error: 'Empty answer',
        message: `Answer option ${emptyAnswerIndex + 1} is empty`
      });
      return;
    }

    // Create the poll (user must be authenticated)
    if (!req.isAuthenticated || !req.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to create a poll'
      });
      return;
    }

    const result = dbUtils.createPoll(
      req.user.id,
      question,
      answers
    );

    // Return the created poll with answers
    res.status(201).json({
      poll: result.poll,
      answers: result.answers
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Gets a poll by ID, including answers and author info
 */
export const getPollById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        error: 'Missing poll ID',
        message: 'Poll ID is required'
      });
      return;
    }

    // Get the poll
    const pollResult = dbUtils.getPollById(id);

    if (!pollResult) {
      res.status(404).json({
        error: 'Poll not found',
        message: `No poll found with ID: ${id}`
      });
      return;
    }

    // Get author info
    const author = dbUtils.getUserById(pollResult.poll.author_id);

    // Get vote counts
    const voteCounts = dbUtils.getVoteCounts(id);

    // Check if user has voted
    let userVote = null;
    if (req.user) {
      userVote = dbUtils.getUserVote(req.user.id, id);
    }

    // Return the poll with answers, author, and vote counts
    res.json({
      poll: pollResult.poll,
      answers: pollResult.answers,
      author: {
        id: author?.id,
        name: author?.name
      },
      voteCounts,
      userVote: userVote ? { answerId: userVote.answer_id } : null
    });
  } catch (error) {
    next(error);
  }
};
