import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Background from './components/Background';
import Feed from './components/Feed';
import Header from './components/Header';
import CreatePoll from './components/CreatePoll';
import PollCard from './components/PollCard';
import UserProfile from './components/UserProfile';

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

  const HomePage = () => (
    <>
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
    </>
  );

  const PollPage = () => {
    const pollId = window.location.pathname.split('/').pop();
    return <PollCard pollId={pollId} />;
  };

  return (
    <BrowserRouter>
      <Background />
      <div className="app-container">
        <Header 
          searchQuery={searchQuery} 
          onSearchChange={handleSearchChange} 
        />

        <main className="app-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/create" element={<CreatePoll />} />
            <Route path="/poll/:id" element={<PollPage />} />
            <Route path="/user/:id" element={<UserProfile />} />
            {/* Redirect any other routes to the home page */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
