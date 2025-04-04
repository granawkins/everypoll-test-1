import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';

// Define types for API responses
interface ApiResponse {
  message: string;
}

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
  userVote?: { answerId: string } | null;
}

interface FeedResponse {
  polls: PollData[];
  totalCount: number;
}

// Mock the fetch API
const mockFetch = vi.fn();
globalThis.fetch = mockFetch as unknown as typeof fetch;

// Create mock responses
const mockApiResponse: ApiResponse = {
  message: 'Welcome to the EveryPoll API!'
};

const mockPollsResponse: FeedResponse = {
  polls: [
    {
      poll: {
        id: 'poll-123',
        question: 'Test Poll Question',
        created_at: '2025-04-01T12:00:00Z',
      },
      answers: [
        { id: 'answer-1', text: 'Option 1' },
        { id: 'answer-2', text: 'Option 2' }
      ],
      author: {
        id: 'user-1',
        name: 'Test User'
      },
      voteCounts: {}
    }
  ],
  totalCount: 1
};

// Type for mock fetch response
interface MockResponse {
  ok: boolean;
  json: () => Promise<unknown>;
}

// Helper to mock fetch responses
const mockFetchImplementation = (url: string): Promise<MockResponse> => {
  if (url === '/api') {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockApiResponse)
    });
  }
  
  if (url === '/api/feed?limit=1') {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockPollsResponse)
    });
  }
  
  if (url === '/api/poll/poll-123') {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        poll: mockPollsResponse.polls[0].poll,
        answers: mockPollsResponse.polls[0].answers,
        author: mockPollsResponse.polls[0].author,
        voteCounts: {},
        userVote: null
      })
    });
  }
  
  return Promise.reject(new Error(`Unhandled fetch URL: ${url}`));
};

describe('App Component', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockFetch.mockImplementation(mockFetchImplementation);
  });

  it('renders App component correctly', () => {
    render(<App />);
    expect(screen.getByText('EveryPoll')).toBeInTheDocument();
    expect(screen.getByText('Vote, compare, discover')).toBeInTheDocument();
  });

  it('loads and displays API message and poll', async () => {
    render(<App />);

    // Should initially show loading message
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // Wait for the fetch to resolve and check if the welcome message is displayed
    await waitFor(() => {
      expect(screen.getByText('Welcome to the EveryPoll API!')).toBeInTheDocument();
    });

    // Check if the PollCard was rendered
    await waitFor(() => {
      expect(screen.getByText('Test Poll Question')).toBeInTheDocument();
    });

    // Check if the API was called
    expect(globalThis.fetch).toHaveBeenCalledWith('/api');
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/feed?limit=1');
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/poll/poll-123');
  });

  it('handles API error', async () => {
    // Mock a failed API call
    mockFetch.mockRejectedValue(new Error('API Error'));

    render(<App />);

    // Wait for the error message to appear
    await waitFor(() => {
      expect(screen.getByText(/Error: API Error/)).toBeInTheDocument();
    });
  });

  it('shows no polls message when feed is empty', async () => {
    // Mock an empty polls response
    mockFetch.mockImplementation((url: string): Promise<MockResponse> => {
      if (url === '/api') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockApiResponse)
        });
      }
      
      if (url === '/api/feed?limit=1') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ polls: [], totalCount: 0 })
        });
      }
      
      return Promise.reject(new Error(`Unhandled fetch URL: ${url}`));
    });

    render(<App />);

    // Wait for the no polls message to appear
    await waitFor(() => {
      expect(screen.getByText(/No polls available/)).toBeInTheDocument();
    });
  });
});
