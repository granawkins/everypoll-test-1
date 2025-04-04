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
 * Supports cross-referencing with other polls via query parameters
 * Format: /api/poll/:id?p1=pollId1&a1=answerId1&p2=pollId2&a2=answerId2
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

    // Check for cross-reference parameters in the query string
    const crossReferences: {
      pollId: string;
      answerId: string;
      poll?: { id: string; question: string };
      answer?: { id: string; text: string };
      voteCounts?: Record<string, number>;
    }[] = [];

    // Parse cross-reference pairs (p1/a1, p2/a2, etc.)
    const queryParams = req.query;
    const pollParams = Object.keys(queryParams).filter(key => key.startsWith('p') && /^p\d+$/.test(key));
    
    for (const pollParam of pollParams) {
      const index = pollParam.substring(1); // Extract the number from 'p1', 'p2', etc.
      const answerParam = `a${index}`;
      
      const crossPollId = queryParams[pollParam] as string;
      const crossAnswerId = queryParams[answerParam] as string;
      
      // Skip if either pollId or answerId is missing
      if (!crossPollId || !crossAnswerId) {
        continue;
      }
      
      // Verify the cross-referenced poll exists
      const crossPoll = dbUtils.getPollById(crossPollId);
      if (!crossPoll) {
        res.status(400).json({
          error: 'Invalid cross-reference',
          message: `Cross-referenced poll (${crossPollId}) not found`
        });
        return;
      }
      
      // Verify the cross-referenced answer belongs to the cross-referenced poll
      const answerBelongsToPoll = crossPoll.answers.some(answer => answer.id === crossAnswerId);
      if (!answerBelongsToPoll) {
        res.status(400).json({
          error: 'Invalid cross-reference',
          message: `Cross-referenced answer (${crossAnswerId}) does not belong to poll (${crossPollId})`
        });
        return;
      }
      
      // Find the answer object for additional info
      const crossAnswer = crossPoll.answers.find(answer => answer.id === crossAnswerId);
      
      // Get cross-referenced vote counts
      const crossReferencedVoteCounts = dbUtils.getCrossReferencedVoteCounts(
        id,
        crossPollId,
        crossAnswerId
      );
      
      // Add to the collection of cross-references
      crossReferences.push({
        pollId: crossPollId,
        answerId: crossAnswerId,
        poll: {
          id: crossPoll.poll.id,
          question: crossPoll.poll.question
        },
        answer: {
          id: crossAnswer!.id,
          text: crossAnswer!.text
        },
        voteCounts: crossReferencedVoteCounts
      });
    }

    // Return the poll with answers, author, vote counts, and cross-references
    res.json({
      poll: pollResult.poll,
      answers: pollResult.answers,
      author: {
        id: author?.id,
        name: author?.name
      },
      voteCounts,
      userVote: userVote ? { answerId: userVote.answer_id } : null,
      crossReferences: crossReferences.length > 0 ? crossReferences : undefined
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Records a vote for a poll
 */
export const voteOnPoll = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // User must be authenticated to vote
    if (!req.isAuthenticated || !req.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to vote'
      });
      return;
    }

    const { id: pollId } = req.params;
    const { answerId } = req.body;

    if (!pollId) {
      res.status(400).json({
        error: 'Missing poll ID',
        message: 'Poll ID is required'
      });
      return;
    }

    if (!answerId) {
      res.status(400).json({
        error: 'Missing answer ID',
        message: 'Answer ID is required'
      });
      return;
    }

    // Check if poll exists
    const pollResult = dbUtils.getPollById(pollId);
    if (!pollResult) {
      res.status(404).json({
        error: 'Poll not found',
        message: `No poll found with ID: ${pollId}`
      });
      return;
    }

    // Check if answer belongs to this poll
    const answerBelongsToPoll = pollResult.answers.some(answer => answer.id === answerId);
    if (!answerBelongsToPoll) {
      res.status(400).json({
        error: 'Invalid answer',
        message: 'The provided answer ID does not belong to this poll'
      });
      return;
    }

    // Check if user has already voted on this poll
    const existingVote = dbUtils.getUserVote(req.user.id, pollId);
    if (existingVote) {
      res.status(400).json({
        error: 'Already voted',
        message: 'You have already voted on this poll',
        vote: {
          answerId: existingVote.answer_id
        }
      });
      return;
    }

    // Record the vote
    const vote = dbUtils.createVote(req.user.id, pollId, answerId);
    
    if (!vote) {
      res.status(500).json({
        error: 'Vote failed',
        message: 'Failed to record your vote. Please try again.'
      });
      return;
    }

    // Get updated vote counts
    const voteCounts = dbUtils.getVoteCounts(pollId);

    // Return success with vote details and updated counts
    res.status(201).json({
      success: true,
      message: 'Vote recorded successfully',
      vote: {
        id: vote.id,
        answerId: vote.answer_id,
        pollId: vote.poll_id,
        createdAt: vote.created_at
      },
      voteCounts
    });
  } catch (error) {
    next(error);
  }
};
