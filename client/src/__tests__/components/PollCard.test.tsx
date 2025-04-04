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

interface CrossReference {
  pollId: string;
  answerId: string;
  poll: {
    id: string;
    question: string;
  };
  answer: {
    id: string;
    text: string;
  };
  voteCounts: Record<string, number>;
}

interface PollData {
  poll: Poll;
  answers: Answer[];
  author: Author;
  voteCounts: Record<string, number>;
  userVote: { answerId: string } | null;
  crossReferences?: CrossReference[];
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

interface SearchResponse {
  polls: Array<{
    poll: Poll;
    answers: Answer[];
    author: Author;
  }>;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// Type for the fetch response
interface MockResponse {
  ok: boolean;
  json: () => Promise<PollData | VoteResponse | ErrorResponse | SearchResponse>;
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

// Mock data for cross-reference search results
const mockSearchResults: SearchResponse = {
  polls: [
    {
      poll: {
        id: 'poll-456',
        question: 'What is your favorite food?',
        created_at: '2025-04-01T12:00:00Z',
      },
      answers: [
        { id: 'answer-4', text: 'Pizza' },
        { id: 'answer-5', text: 'Sushi' },
      ],
      author: {
        id: 'user-456',
        name: 'Another User',
      },
    },
  ],
  pagination: {
    total: 1,
    limit: 10,
    offset: 0,
    hasMore: false,
  },
};

// Mock data for poll with cross-references
const mockPollWithCrossRef: PollData = {
  ...pollDataWithVote,
  crossReferences: [
    {
      pollId: 'poll-456',
      answerId: 'answer-4',
      poll: {
        id: 'poll-456',
        question: 'What is your favorite food?',
      },
      answer: {
        id: 'answer-4',
        text: 'Pizza',
      },
      voteCounts: {
        'answer-1': 1,
        'answer-2': 0,
        'answer-3': 0,
      },
    },
  ],
};

// Mock response for fetch
const mockFetchResponse = (
  data: PollData | VoteResponse | ErrorResponse | SearchResponse, 
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

  /* Cross-reference tests */

  it('should display cross-reference button after voting', async () => {
    render(<PollCard pollData={pollDataWithVote} />);
    
    // Cross-reference button should be visible after voting
    expect(screen.getByText('Cross-reference with another poll')).toBeInTheDocument();
  });

  it('should display cross-reference search when button is clicked', async () => {
    render(<PollCard pollData={pollDataWithVote} />);
    
    // Click the cross-reference button
    fireEvent.click(screen.getByText('Cross-reference with another poll'));
    
    // Search interface should appear
    expect(screen.getByText('Search for a poll to cross-reference')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search for polls...')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
  });

  it('should search for polls to cross-reference', async () => {
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse(mockSearchResults)
    );
    
    render(<PollCard pollData={pollDataWithVote} />);
    
    // Click the cross-reference button
    fireEvent.click(screen.getByText('Cross-reference with another poll'));
    
    // Type a search query
    const searchInput = screen.getByPlaceholderText('Search for polls...');
    fireEvent.change(searchInput, { target: { value: 'food' } });
    
    // Click the search button
    fireEvent.click(screen.getByText('Search'));
    
    // Check if API was called correctly
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/poll/poll-123/search?q=food'
      );
    });
    
    // Search results should appear
    await waitFor(() => {
      expect(screen.getByText('What is your favorite food?')).toBeInTheDocument();
      expect(screen.getByText('by Another User')).toBeInTheDocument();
      expect(screen.getByText('Pizza')).toBeInTheDocument();
      expect(screen.getByText('Sushi')).toBeInTheDocument();
    });
  });

  it('should add a cross-reference when a poll answer is selected', async () => {
    // First, mock the search response
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse(mockSearchResults)
    );
    
    // Then, mock the poll with cross-reference response
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse(mockPollWithCrossRef)
    );
    
    render(<PollCard pollData={pollDataWithVote} />);
    
    // Click the cross-reference button
    fireEvent.click(screen.getByText('Cross-reference with another poll'));
    
    // Click the search button without typing (should search with empty query)
    fireEvent.click(screen.getByText('Search'));
    
    // Wait for search results
    await waitFor(() => {
      expect(screen.getByText('What is your favorite food?')).toBeInTheDocument();
    });
    
    // Click on an answer to select it for cross-reference
    fireEvent.click(screen.getByText('Pizza'));
    
    // Check if API was called to fetch poll with cross-reference
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/poll/poll-123?p1=poll-456&a1=answer-4'
      );
    });
    
    // Cross-reference sub-charts should appear
    await waitFor(() => {
      expect(screen.getByText('Results filtered by "Pizza" voters')).toBeInTheDocument();
    });
  });

  it('should display sub-charts for cross-referenced results', async () => {
    render(<PollCard pollData={mockPollWithCrossRef} />);
    
    // Cross-reference sub-charts heading should be visible
    expect(screen.getByText('Results filtered by "Pizza" voters')).toBeInTheDocument();
    
    // Sub-charts should be present
    const subChartBars = document.querySelectorAll('.cross-reference-sub-chart-bar');
    expect(subChartBars.length).toBe(3); // One for each answer in the original poll
    
    // Check if percentages in the sub-charts are correct
    // In our mock data, only 'answer-1' has votes (100%)
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('should update main chart when clicking on a sub-chart', async () => {
    const { container } = render(<PollCard pollData={mockPollWithCrossRef} />);
    
    // First verify the cross-reference sub-charts section is visible
    expect(screen.getByText('Results filtered by "Pizza" voters')).toBeInTheDocument();
    
    // Get all sub-charts from container
    const subCharts = container.querySelectorAll('.cross-reference-sub-chart');
    expect(subCharts.length).toBe(3); // Should have one for each answer
    
    // Click on the first sub-chart (Red)
    fireEvent.click(subCharts[0]);
    
    // Explanatory text should appear
    expect(screen.getByText(/Showing results for Red voters/)).toBeInTheDocument();
    
    // The sub-chart should have the 'is-active' class
    expect(subCharts[0].classList.contains('is-active')).toBe(true);
  });

  it('should display cross-reference selector with multiple cross-references', async () => {
    // Create mock data with multiple cross-references
    const multiCrossRefData: PollData = {
      ...pollDataWithVote,
      crossReferences: [
        {
          pollId: 'poll-456',
          answerId: 'answer-4',
          poll: {
            id: 'poll-456',
            question: 'What is your favorite food?',
          },
          answer: {
            id: 'answer-4',
            text: 'Pizza',
          },
          voteCounts: {
            'answer-1': 1,
            'answer-2': 0,
            'answer-3': 0,
          },
        },
        {
          pollId: 'poll-789',
          answerId: 'answer-6',
          poll: {
            id: 'poll-789',
            question: 'What is your favorite animal?',
          },
          answer: {
            id: 'answer-6',
            text: 'Dog',
          },
          voteCounts: {
            'answer-1': 0,
            'answer-2': 1,
            'answer-3': 0,
          },
        },
      ],
    };
    
    const { container } = render(<PollCard pollData={multiCrossRefData} />);
    
    // Cross-reference selector should be visible
    expect(screen.getByText('Cross-referenced polls:')).toBeInTheDocument();
    
    // Both cross-references should be visible
    expect(screen.getByText('What is your favorite food?')).toBeInTheDocument();
    expect(screen.getByText('What is your favorite animal?')).toBeInTheDocument();
    
    // Check the selector items are rendered
    const selectorItems = container.querySelectorAll('.cross-reference-selector-item');
    expect(selectorItems.length).toBe(2);
  });

  it('should switch between cross-references when selector is clicked', async () => {
    // Create mock data with multiple cross-references
    const multiCrossRefData: PollData = {
      ...pollDataWithVote,
      crossReferences: [
        {
          pollId: 'poll-456',
          answerId: 'answer-4',
          poll: {
            id: 'poll-456',
            question: 'What is your favorite food?',
          },
          answer: {
            id: 'answer-4',
            text: 'Pizza',
          },
          voteCounts: {
            'answer-1': 1,
            'answer-2': 0,
            'answer-3': 0,
          },
        },
        {
          pollId: 'poll-789',
          answerId: 'answer-6',
          poll: {
            id: 'poll-789',
            question: 'What is your favorite animal?',
          },
          answer: {
            id: 'answer-6',
            text: 'Dog',
          },
          voteCounts: {
            'answer-1': 0,
            'answer-2': 1,
            'answer-3': 0,
          },
        },
      ],
    };
    
    const { container } = render(<PollCard pollData={multiCrossRefData} />);
    
    // Both cross-references should be visible in selector
    const selectorItems = container.querySelectorAll('.cross-reference-selector-item');
    expect(selectorItems.length).toBe(2);
    
    // First click on the first cross-reference to ensure it's selected
    fireEvent.click(selectorItems[0]);
    
    // Now we should see results filtered by "Pizza" voters
    expect(screen.getByText('Results filtered by "Pizza" voters')).toBeInTheDocument();
    
    // Click on the second cross-reference
    fireEvent.click(selectorItems[1]);
    
    // Results filtered by "Dog" voters should now be visible
    expect(screen.getByText('Results filtered by "Dog" voters')).toBeInTheDocument();
    
    // The second item should now have the selected class
    expect(selectorItems[1].classList.contains('is-selected')).toBe(true);
  });
});
