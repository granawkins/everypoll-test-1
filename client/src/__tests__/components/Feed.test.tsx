import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Feed from '../../components/Feed';

// Mock the IntersectionObserver
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => vi.fn(),
  unobserve: () => vi.fn(),
  disconnect: () => vi.fn()
});
window.IntersectionObserver = mockIntersectionObserver;

// Define types for API responses
interface Author {
  id: string;
  name: string | null;
}

interface Poll {
  id: string;
  question: string;
  created_at: string;
}

interface Answer {
  id: string;
  text: string;
}

interface PollData {
  poll: Poll;
  answers: Answer[];
  author: Author;
  voteCounts: Record<string, number>;
  userVote: { answerId: string } | null;
}

interface FeedResponse {
  polls: PollData[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// Mock the fetch API
const mockFetch = vi.fn();
globalThis.fetch = mockFetch as unknown as typeof fetch;

// Create mock poll data
const createMockPoll = (id: number): PollData => ({
  poll: {
    id: `poll-${id}`,
    question: `Test Poll Question ${id}`,
    created_at: '2025-04-01T12:00:00Z',
  },
  answers: [
    { id: `answer-${id}-1`, text: `Option 1 for Poll ${id}` },
    { id: `answer-${id}-2`, text: `Option 2 for Poll ${id}` }
  ],
  author: {
    id: 'user-1',
    name: 'Test User'
  },
  voteCounts: {
    [`answer-${id}-1`]: 10,
    [`answer-${id}-2`]: 5
  },
  userVote: null
});

// Create mock responses for different scenarios
const createMockFeedResponse = (pollCount: number, hasMore: boolean): FeedResponse => {
  const polls = Array.from({ length: pollCount }, (_, i) => createMockPoll(i + 1));
  return {
    polls,
    pagination: {
      total: hasMore ? pollCount + 5 : pollCount,
      limit: 5,
      offset: 0,
      hasMore
    }
  };
};

// Helper to mock fetch responses
const mockFeedFetch = (pollCount: number, hasMore: boolean) => {
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(createMockFeedResponse(pollCount, hasMore))
  });
};

describe('Feed Component', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders loading state initially', () => {
    mockFeedFetch(0, false);
    render(<Feed />);
    
    expect(screen.getByText('Loading polls...')).toBeInTheDocument();
  });

  it('displays polls after loading', async () => {
    mockFeedFetch(3, false);
    render(<Feed />);
    
    // Wait for polls to load
    await waitFor(() => {
      expect(screen.getByText('Test Poll Question 1')).toBeInTheDocument();
    });
    
    // Check if all polls are rendered
    expect(screen.getByText('Test Poll Question 1')).toBeInTheDocument();
    expect(screen.getByText('Test Poll Question 2')).toBeInTheDocument();
    expect(screen.getByText('Test Poll Question 3')).toBeInTheDocument();
    
    // Check if fetch was called correctly
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith('/api/feed?limit=5&offset=0');
  });

  it('shows empty state when no polls are found', async () => {
    mockFeedFetch(0, false);
    render(<Feed />);
    
    await waitFor(() => {
      expect(screen.getByText(/No polls found/)).toBeInTheDocument();
    });
  });

  it('handles errors gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));
    render(<Feed />);
    
    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
    });
  });

  it('shows end of feed message when there are no more polls', async () => {
    mockFeedFetch(3, false);
    render(<Feed />);
    
    await waitFor(() => {
      expect(screen.getByText(/You've reached the end of the feed/)).toBeInTheDocument();
    });
  });

  it('includes search query in fetch when provided', async () => {
    mockFeedFetch(2, false);
    render(<Feed searchQuery="test query" />);
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/feed?limit=5&offset=0&q=test%20query');
    });
  });

  it('reloads feed when search query changes', async () => {
    // Initial render with no search query
    mockFeedFetch(3, false);
    const { rerender } = render(<Feed />);
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/feed?limit=5&offset=0');
    });
    
    // Update with search query
    mockFetch.mockReset();
    mockFeedFetch(2, false);
    rerender(<Feed searchQuery="new search" />);
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/feed?limit=5&offset=0&q=new%20search');
    });
  });

  it('loads more polls when intersection observer triggers', async () => {
    // Setup with initial polls and more available
    mockFeedFetch(5, true);
    render(<Feed />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Poll Question 1')).toBeInTheDocument();
    });
    
    // Reset fetch mock for the next call
    mockFetch.mockReset();
    
    // Setup mock for next page of results
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        polls: [createMockPoll(6), createMockPoll(7)],
        pagination: {
          total: 7,
          limit: 5,
          offset: 5,
          hasMore: false
        }
      })
    });
    
    // Trigger intersection observer
    const [observerCallback] = mockIntersectionObserver.mock.calls[0];
    observerCallback([{ isIntersecting: true }]);
    
    // Check that fetch was called with the correct offset
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/feed?limit=5&offset=5');
    });
  });
});
