import { useState, useEffect } from 'react';
import Background from './components/Background';
import PollCard from './components/PollCard';

function App() {
  const [pollId, setPollId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchServerInfo = async () => {
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

        // Check if there are any polls available to display
        const pollsResponse = await fetch('/api/feed?limit=1');
        if (pollsResponse.ok) {
          const pollsData = await pollsResponse.json();
          if (pollsData.polls && pollsData.polls.length > 0) {
            setPollId(pollsData.polls[0].poll.id);
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(
          err instanceof Error ? err.message : 'An unknown error occurred'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchServerInfo();
  }, []);

  return (
    <>
      <Background />
      <div className="app-container">
        <header className="app-header">
          <h1>EveryPoll</h1>
          <p className="app-subtitle">Vote, compare, discover</p>
        </header>

        <main className="app-content">
          {loading ? (
            <div className="app-loading">Loading...</div>
          ) : error ? (
            <div className="app-error">Error: {error}</div>
          ) : (
            <>
              <div className="app-welcome">
                <p>{message || 'Welcome to EveryPoll!'}</p>
              </div>

              {pollId ? (
                <PollCard pollId={pollId} />
              ) : (
                <div className="app-no-polls">
                  <p>No polls available. Create your first poll to get started!</p>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}

export default App;
