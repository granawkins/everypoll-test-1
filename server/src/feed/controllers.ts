import { Request, Response, NextFunction } from 'express';
import { dbUtils } from '../database';

/**
 * Get a paginated feed of polls with optional search functionality
 * 
 * Query parameters:
 * - limit: Maximum number of polls to return (default: 10)
 * - offset: Number of polls to skip (default: 0)
 * - q: Search query (optional)
 * - sort: Sort order - 'newest' or 'oldest' (default: 'newest')
 */
export const getFeed = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Parse query parameters
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
    const query = req.query.q as string | undefined;
    const sortBy = (req.query.sort as 'newest' | 'oldest' | undefined) || 'newest';
    
    // Validate pagination parameters
    if (isNaN(limit) || limit < 1 || limit > 50) {
      res.status(400).json({
        error: 'Invalid limit',
        message: 'Limit must be a number between 1 and 50'
      });
      return;
    }
    
    if (isNaN(offset) || offset < 0) {
      res.status(400).json({
        error: 'Invalid offset',
        message: 'Offset must be a non-negative number'
      });
      return;
    }
    
    // Validate sort parameter
    if (sortBy !== 'newest' && sortBy !== 'oldest') {
      res.status(400).json({
        error: 'Invalid sort parameter',
        message: 'Sort must be either "newest" or "oldest"'
      });
      return;
    }
    
    // Get polls from database
    const result = dbUtils.getPolls({
      limit,
      offset,
      sortBy,
      query
    });
    
    // Enhance poll data with author info
    const pollsWithAuthors = await Promise.all(
      result.polls.map(async ({ poll, answers }) => {
        const author = dbUtils.getUserById(poll.author_id);
        const voteCounts = dbUtils.getVoteCounts(poll.id);
        
        // Check if authenticated user has voted
        let userVote = null;
        if (req.user) {
          userVote = dbUtils.getUserVote(req.user.id, poll.id);
        }
        
        return {
          poll,
          answers,
          author: {
            id: author?.id,
            name: author?.name
          },
          voteCounts,
          userVote: userVote ? { answerId: userVote.answer_id } : null
        };
      })
    );
    
    // Return paginated results
    res.json({
      polls: pollsWithAuthors,
      pagination: {
        total: result.totalCount,
        limit,
        offset,
        hasMore: offset + limit < result.totalCount
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Search for polls that can be cross-referenced with a given poll
 * 
 * Path parameters:
 * - id: The ID of the poll to find cross-references for
 * 
 * Query parameters:
 * - q: Search query (optional)
 * - limit: Maximum number of polls to return (default: 10)
 * - offset: Number of polls to skip (default: 0)
 * - p1, p2, etc.: IDs of already cross-referenced polls to exclude
 */
export const searchCrossReferences = async (
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
    
    // Check if main poll exists
    const poll = dbUtils.getPollById(id);
    if (!poll) {
      res.status(404).json({
        error: 'Poll not found',
        message: `No poll found with ID: ${id}`
      });
      return;
    }
    
    // Parse query parameters
    const query = req.query.q as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
    
    // Validate pagination parameters
    if (isNaN(limit) || limit < 1 || limit > 50) {
      res.status(400).json({
        error: 'Invalid limit',
        message: 'Limit must be a number between 1 and 50'
      });
      return;
    }
    
    if (isNaN(offset) || offset < 0) {
      res.status(400).json({
        error: 'Invalid offset',
        message: 'Offset must be a non-negative number'
      });
      return;
    }
    
    // Extract any existing cross-referenced poll IDs to exclude
    const excludePollIds: string[] = [];
    Object.keys(req.query).forEach(key => {
      if (key.startsWith('p') && /^p\d+$/.test(key)) {
        const pollId = req.query[key] as string;
        if (pollId) {
          excludePollIds.push(pollId);
        }
      }
    });
    
    // Get cross-reference candidates
    const result = dbUtils.getCrossReferenceCandidates(id, {
      query,
      excludePollIds,
      limit,
      offset
    });
    
    // Enhance poll data with author info
    const pollsWithAuthors = await Promise.all(
      result.polls.map(async ({ poll, answers }) => {
        const author = dbUtils.getUserById(poll.author_id);
        
        return {
          poll,
          answers,
          author: {
            id: author?.id,
            name: author?.name
          }
        };
      })
    );
    
    // Return paginated results
    res.json({
      polls: pollsWithAuthors,
      pagination: {
        total: result.totalCount,
        limit,
        offset,
        hasMore: offset + limit < result.totalCount
      }
    });
  } catch (error) {
    next(error);
  }
};
