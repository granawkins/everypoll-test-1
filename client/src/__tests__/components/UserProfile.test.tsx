import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import UserProfile from '../../components/UserProfile';
import '@testing-library/jest-dom';

// Mock the fetch function
global.fetch = jest.fn();

// Helper to mock the fetch response
const mockFetch = (data: any, status = 200) => {
  return Promise.resolve({
    ok: status === 200,
    status,
    json: () => Promise.resolve(data)
  });
};

describe('UserProfile Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('displays loading state initially', () => {
    (global.fetch as jest.Mock).mockImplementation(() => 
      new Promise(() => {}) // Never resolve to keep loading state
    );
    
    render(
      <MemoryRouter initialEntries={['/user/user123']}>
        <Routes>
          <Route path="/user/:id" element={<UserProfile />} />
        </Routes>
      </MemoryRouter>
    );
    
    expect(screen.getByText('Loading user profile...')).toBeInTheDocument();
  });
  
  test('displays error message when api call fails', async () => {
    (global.fetch as jest.Mock).mockImplementation(() => 
      mockFetch({ error: 'User not found' }, 404)
    );
    
    render(
      <MemoryRouter initialEntries={['/user/invalid-id']}>
        <Routes>
          <Route path="/user/:id" element={<UserProfile />} />
        </Routes>
      </MemoryRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
    });
  });
  
  test('displays user profile with name and polls', async () => {
    // Mock user data response
    const userData = {
      id: 'user123',
      name: 'Test User'
    };
    
    // Mock feed response with user's polls
    const feedData = {
      polls: [
        {
          poll: {
            id: 'poll1',
            question: 'Test Poll 1',
            created_at: '2023-01-01T00:00:00.000Z' 
          },
          answers: [
            { id: 'answer1', text: 'Option 1' },
            { id: 'answer2', text: 'Option 2' }
          ],
          author: {
            id: 'user123',
            name: 'Test User'
          },
          voteCounts: { 'answer1': 5, 'answer2': 3 },
          userVote: null
        },
        {
          poll: {
            id: 'poll2',
            question: 'Test Poll 2',
            created_at: '2023-01-02T00:00:00.000Z' 
          },
          answers: [
            { id: 'answer3', text: 'Yes' },
            { id: 'answer4', text: 'No' }
          ],
          author: {
            id: 'user123',
            name: 'Test User'
          },
          voteCounts: { 'answer3': 10, 'answer4': 2 },
          userVote: null
        }
      ],
      pagination: {
        total: 2,
        limit: 5,
        offset: 0,
        hasMore: false
      }
    };
    
    // Set up fetch mock to return user data on first call and feed data on second call
    (global.fetch as jest.Mock).mockImplementationOnce(() => mockFetch(userData))
      .mockImplementationOnce(() => mockFetch(feedData));
    
    render(
      <MemoryRouter initialEntries={['/user/user123']}>
        <Routes>
          <Route path="/user/:id" element={<UserProfile />} />
        </Routes>
      </MemoryRouter>
    );
    
    // Wait for user data to load
    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });
    
    // Verify profile header displays correctly
    expect(screen.getByText('T')).toBeInTheDocument(); // First letter avatar
    expect(screen.getByText(/Polls created by Test User/)).toBeInTheDocument();
    
    // Wait for polls to load
    await waitFor(() => {
      expect(screen.getByText('Test Poll 1')).toBeInTheDocument();
    });
    
    // Verify polls are displayed
    expect(screen.getByText('Test Poll 2')).toBeInTheDocument();
  });
  
  test('displays empty state when user has no polls', async () => {
    // Mock user data
    const userData = {
      id: 'user123',
      name: 'Test User'
    };
    
    // Mock empty feed
    const emptyFeedData = {
      polls: [],
      pagination: {
        total: 0,
        limit: 5,
        offset: 0,
        hasMore: false
      }
    };
    
    // Set up fetch mocks
    (global.fetch as jest.Mock).mockImplementationOnce(() => mockFetch(userData))
      .mockImplementationOnce(() => mockFetch(emptyFeedData));
    
    render(
      <MemoryRouter initialEntries={['/user/user123']}>
        <Routes>
          <Route path="/user/:id" element={<UserProfile />} />
        </Routes>
      </MemoryRouter>
    );
    
    // Wait for user data to load
    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });
    
    // Verify empty state message
    await waitFor(() => {
      expect(screen.getByText(/This user hasn't created any polls yet/)).toBeInTheDocument();
    });
  });
});
