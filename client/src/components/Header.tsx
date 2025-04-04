import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

interface User {
  id: string;
  name: string | null;
  email: string | null;
  isAuthenticated: boolean;
}

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const Header: React.FC<HeaderProps> = ({ searchQuery, onSearchChange }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Hide search bar on certain pages
  const showSearch = location.pathname === '/';

  // Fetch user data when component mounts
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) {
          throw new Error(`Failed to fetch user: ${response.status}`);
        }
        const userData = await response.json();
        setUser(userData);
      } catch (err) {
        console.error('Error fetching user:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch user data');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  // Function to handle login
  const handleLogin = () => {
    window.location.href = '/api/auth/login';
  };

  // Function to handle logout
  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to logout: ${response.status}`);
      }
      // Reset user state to anonymous
      setUser(null);
      // Navigate to home page
      navigate('/');
    } catch (err) {
      console.error('Error logging out:', err);
      setError(err instanceof Error ? err.message : 'Failed to logout');
    }
  };

  return (
    <header className="app-header">
      <div className="app-header-title">
        <Link to="/" className="app-logo-link">
          <h1>EveryPoll</h1>
          <p className="app-subtitle">Vote, compare, discover</p>
        </Link>
      </div>
      
      {showSearch && (
        <div className="app-header-search">
          <input
            type="text"
            placeholder="Search polls..."
            value={searchQuery}
            onChange={onSearchChange}
            className="app-search-input"
            aria-label="Search polls"
          />
        </div>
      )}
      
      <div className="app-header-actions">
        {loading ? (
          <div className="app-header-loading">Loading...</div>
        ) : error ? (
          <div className="app-header-error" title={error}>Error loading user</div>
        ) : (
          <>
            {user?.isAuthenticated ? (
              <>
                <Link
                  to="/create"
                  className="create-poll-button"
                  aria-label="Create new poll"
                >
                  Create Poll
                </Link>
                <div className="user-avatar-container" onClick={handleLogout} title={user.name || 'User Profile'}>
                  {user.name ? (
                    <div className="user-avatar">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  ) : (
                    <div className="user-avatar">
                      U
                    </div>
                  )}
                </div>
              </>
            ) : (
              <button 
                className="login-button"
                onClick={handleLogin}
                aria-label="Login with Google"
              >
                Login with Google
              </button>
            )}
          </>
        )}
      </div>
    </header>
  );
};

export default Header;
