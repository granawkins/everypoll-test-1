import { useState, useEffect } from 'react';
import Background from './components/Background';
import Feed from './components/Feed';

function App() {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');

  // Fetch welcome message from API
  useEffect(() => {
    const fetchWelcomeMessage = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch welcome message
        const messageResponse = await fetch('/api');
        if (!messageResponse.ok) {
          throw new Error(`HTTP error ${messageResponse.status}`);
        }
        const messageData = await messageResponse.json();
        setMessage(messageData.message);
      } catch (err) {
        console.error('Error fetching welcome message:', err);
        setError(
          err instanceof Error ? err.message : 'An unknown error occurred'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchWelcomeMessage();
  }, []);

  // Debounce search query to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [searchQuery]);

  // Handle search input changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <>
      <Background />
      <div className="app-container">
        <header className="app-header">
          <div className="app-header-title">
            <h1>EveryPoll</h1>
            <p className="app-subtitle">Vote, compare, discover</p>
          </div>
          
          <div className="app-header-search">
            <input
              type="text"
              placeholder="Search polls..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="app-search-input"
            />
          </div>
          
          <div className="app-header-actions">
            {/* Placeholder for login/user avatar and create poll button */}
          </div>
        </header>

        <main className="app-content">
          {loading && !message ? (
            <div className="app-loading">Loading...</div>
          ) : error ? (
            <div className="app-error">Error: {error}</div>
          ) : (
            <>
              <div className="app-welcome">
                <p>{message || 'Welcome to EveryPoll!'}</p>
              </div>

              <Feed searchQuery={debouncedSearchQuery} />
            </>
          )}
        </main>
      </div>
    </>
  );
}

export default App;
