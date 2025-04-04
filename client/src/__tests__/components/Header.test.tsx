import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Header from '../../components/Header';

// Mock fetch
const mockFetch = vi.fn();
globalThis.fetch = mockFetch as unknown as typeof fetch;

// Mock window.location methods
const mockWindowLocation = vi.fn();
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    reload: mockWindowLocation
  },
  writable: true
});

describe('Header Component', () => {
  const mockSearchQuery = '';
  const mockOnSearchChange = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders header with title and search bar', () => {
    // Mock user fetch response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: '123', name: 'Test User', email: 'test@example.com', isAuthenticated: true })
    });

    render(<Header searchQuery={mockSearchQuery} onSearchChange={mockOnSearchChange} />);
    
    // Check for main header elements
    expect(screen.getByText('EveryPoll')).toBeInTheDocument();
    expect(screen.getByText('Vote, compare, discover')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search polls...')).toBeInTheDocument();
  });

  it('shows login button for non-authenticated users', async () => {
    // Mock unauthenticated user response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'anon-123', name: null, email: null, isAuthenticated: false })
    });

    render(<Header searchQuery={mockSearchQuery} onSearchChange={mockOnSearchChange} />);
    
    // Wait for login button to appear
    const loginButton = await screen.findByText('Login with Google');
    expect(loginButton).toBeInTheDocument();
    
    // Check that the create poll button is NOT present
    expect(screen.queryByText('Create Poll')).not.toBeInTheDocument();
  });

  it('shows avatar and create poll button for authenticated users', async () => {
    // Mock authenticated user response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: '123', name: 'Test User', email: 'test@example.com', isAuthenticated: true })
    });

    render(<Header searchQuery={mockSearchQuery} onSearchChange={mockOnSearchChange} />);
    
    // Wait for create poll button to appear
    const createPollButton = await screen.findByText('Create Poll');
    expect(createPollButton).toBeInTheDocument();
    
    // Check for user avatar (first letter of name)
    expect(screen.getByText('T')).toBeInTheDocument();
  });

  it('redirects to login page when login button is clicked', async () => {
    // Mock unauthenticated user response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'anon-123', name: null, email: null, isAuthenticated: false })
    });

    render(<Header searchQuery={mockSearchQuery} onSearchChange={mockOnSearchChange} />);
    
    // Wait for login button and click it
    const loginButton = await screen.findByText('Login with Google');
    fireEvent.click(loginButton);
    
    // Check if window.location.href was set to the login URL
    expect(window.location.href).toBe('/api/auth/login');
  });

  it('handles search input correctly', async () => {
    // Mock user fetch response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: '123', name: 'Test User', email: 'test@example.com', isAuthenticated: true })
    });

    render(<Header searchQuery={mockSearchQuery} onSearchChange={mockOnSearchChange} />);
    
    // Find search input and change its value
    const searchInput = screen.getByPlaceholderText('Search polls...');
    fireEvent.change(searchInput, { target: { value: 'test query' } });
    
    // Check if onChange handler was called
    expect(mockOnSearchChange).toHaveBeenCalled();
  });

  it('handles API error gracefully', async () => {
    // Mock API error
    mockFetch.mockRejectedValueOnce(new Error('API Error'));

    render(<Header searchQuery={mockSearchQuery} onSearchChange={mockOnSearchChange} />);
    
    // Wait for error message to appear
    await waitFor(() => {
      expect(screen.getByText('Error loading user')).toBeInTheDocument();
    });
  });

  it('handles logout correctly', async () => {
    // Mock authenticated user response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: '123', name: 'Test User', email: 'test@example.com', isAuthenticated: true })
    });
    
    // Mock successful logout
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, message: 'Logged out successfully' })
    });

    render(<Header searchQuery={mockSearchQuery} onSearchChange={mockOnSearchChange} />);
    
    // Wait for avatar to appear and click it to logout
    await waitFor(() => {
      expect(screen.getByText('T')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('T'));
    
    // Check if logout request was made
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    });
    
    // Check if page was reloaded
    expect(mockWindowLocation).toHaveBeenCalled();
  });

  it('should stick to the top of the page', () => {
    // Mock user fetch response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: '123', name: null, email: null, isAuthenticated: false })
    });

    render(<Header searchQuery={mockSearchQuery} onSearchChange={mockOnSearchChange} />);
    
    // Check if header has the correct class for sticky positioning
    const header = screen.getByRole('banner');
    expect(header).toHaveClass('app-header');
    
    // We're testing indirectly here since jsdom doesn't fully implement CSS,
    // but the CSS class app-header is styled with position: sticky in styles.css
  });
});
