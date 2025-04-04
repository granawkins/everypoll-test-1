import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PollCard from '../../components/PollCard';

// Define types for the mock data
interface Poll {
  id: string;
  question: string;
  created_at: string;
}

interface Answer {
  id: string;
  text: string;
}

interface Author {
  id: string;
  name: string | null;
}

interface PollData {
  poll: Poll;
  answers: Answer[];
  author: Author;
  voteCounts: Record<string, number>;
  userVote: { answerId: string } | null;
}

interface VoteResponse {
  success: boolean;
  message: string;
  vote: {
    id: string;
    answerId: string;
    pollId: string;
    createdAt: string;
  };
  voteCounts: Record<string, number>;
}

interface ErrorResponse {
  error: string;
  message: string;
}

// Type for the fetch response
interface MockResponse {
  ok: boolean;
  json: () => Promise<PollData | VoteResponse | ErrorResponse>;
}

// Mock the fetch function
const mockFetch = vi.fn();
globalThis.fetch = mockFetch as unknown as typeof fetch;

// Mock data for tests
const mockPollData: PollData = {
  poll: {
    id: 'poll-123',
    question: 'What is your favorite color?',
    created_at: '2025-04-01T12:00:00Z',
  },
  answers: [
    { id: 'answer-1', text: 'Red' },
    { id: 'answer-2', text: 'Blue' },
    { id: 'answer-3', text: 'Green' },
  ],
  author: {
    id: 'user-123',
    name: 'Test User',
  },
  voteCounts: {},
  userVote: null,
};

// Mock response for fetch
const mockFetchResponse = (
  data: PollData | VoteResponse | ErrorResponse, 
  ok = true
): MockResponse => {
  return {
    ok,
    json: () => Promise.resolve(data),
  };
};

describe('PollCard Component', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should display poll question and answer buttons', () => {
    render(<PollCard pollData={mockPollData} />);
    
    // Check if question is displayed
    expect(screen.getByText('What is your favorite color?')).toBeInTheDocument();
    
    // Check if all answer options are displayed as buttons
    expect(screen.getByText('Red')).toBeInTheDocument();
    expect(screen.getByText('Blue')).toBeInTheDocument();
    expect(screen.getByText('Green')).toBeInTheDocument();
    
    // Check if author name is displayed
    expect(screen.getByText(/Test User/)).toBeInTheDocument();
    
    // Check vote count
    expect(screen.getByText('0 votes')).toBeInTheDocument();
  });

  it('should call API and update UI when voting', async () => {
    // Setup mock response for voting API
    const mockVoteResponse: VoteResponse = {
      success: true,
      message: 'Vote recorded successfully',
      vote: {
        id: 'vote-123',
        answerId: 'answer-1',
        pollId: 'poll-123',
        createdAt: '2025-04-01T12:05:00Z',
      },
      voteCounts: {
        'answer-1': 1,
      },
    };
    
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse(mockVoteResponse)
    );
    
    render(<PollCard pollData={mockPollData} />);
    
    // Click on an answer to vote
    fireEvent.click(screen.getByText('Red'));
    
    // Check if API was called with correct parameters
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/poll/poll-123/vote',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({ answerId: 'answer-1' }),
        })
      );
    });
    
    // Check if UI updates to show results instead of buttons
    await waitFor(() => {
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
    
    // Check if vote count updates
    expect(screen.getByText('1 vote')).toBeInTheDocument();
  });

  it('should display column chart after voting', async () => {
    // Mock data with existing vote
    const pollDataWithVote: PollData = {
      ...mockPollData,
      voteCounts: {
        'answer-1': 2,
        'answer-2': 1,
      },
      userVote: {
        answerId: 'answer-1',
      },
    };
    
    render(<PollCard pollData={pollDataWithVote} />);
    
    // Check if percentages are displayed
    expect(screen.getByText('67%')).toBeInTheDocument(); // For Red (2/3 votes)
    expect(screen.getByText('33%')).toBeInTheDocument(); // For Blue (1/3 votes)
    
    // Check if vote count is displayed
    expect(screen.getByText('3 votes')).toBeInTheDocument();
    
    // Chart bars should be present
    const chartBars = document.querySelectorAll('.poll-result-bar');
    expect(chartBars.length).toBe(3); // One for each answer
  });

  it('should highlight user selected answer', () => {
    // Mock data with user vote
    const pollDataWithUserVote: PollData = {
      ...mockPollData,
      voteCounts: {
        'answer-1': 1,
        'answer-2': 2,
      },
      userVote: {
        answerId: 'answer-1',
      },
    };
    
    render(<PollCard pollData={pollDataWithUserVote} />);
    
    // Check if the selected answer has the correct class
    const selectedResult = document.querySelector('.poll-result-selected');
    expect(selectedResult).toBeInTheDocument();
    expect(selectedResult?.textContent).toContain('Red');
  });

  it('should fetch poll data if provided with pollId', async () => {
    // Mock the fetch response for poll data
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse(mockPollData)
    );
    
    render(<PollCard pollId="poll-123" />);
    
    // Should show loading initially
    expect(screen.getByText('Loading poll...')).toBeInTheDocument();
    
    // Should fetch poll data
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/poll/poll-123');
    });
    
    // Should display poll question after loading
    await waitFor(() => {
      expect(screen.getByText('What is your favorite color?')).toBeInTheDocument();
    });
  });

  it('should handle errors when fetching poll data', async () => {
    // Mock an error response
    const errorResponse: ErrorResponse = { 
      error: 'Poll not found',
      message: 'No poll found with that ID'
    };
    
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse(errorResponse, false)
    );
    
    render(<PollCard pollId="invalid-poll" />);
    
    // Should show loading initially
    expect(screen.getByText('Loading poll...')).toBeInTheDocument();
    
    // Should show error message after failing to load
    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
    });
  });

  it('should handle errors when voting', async () => {
    // Mock an error response for voting
    const authErrorResponse: ErrorResponse = {
      error: 'Authentication required',
      message: 'You must be logged in to vote'
    };
    
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse(authErrorResponse, false)
    );
    
    render(<PollCard pollData={mockPollData} />);
    
    // Click on an answer to vote
    fireEvent.click(screen.getByText('Red'));
    
    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
    });
  });
});
