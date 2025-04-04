import { useState, useEffect } from 'react';

interface Answer {
  id: string;
  text: string;
}

interface Poll {
  id: string;
  question: string;
  created_at: string;
}

interface Author {
  id: string;
  name: string | null;
}

interface PollCardProps {
  pollId?: string;
  pollData?: {
    poll: Poll;
    answers: Answer[];
    author: Author;
    voteCounts: Record<string, number>;
    userVote: { answerId: string } | null;
  };
}

const PollCard: React.FC<PollCardProps> = ({ pollId, pollData: initialPollData }) => {
  const [pollData, setPollData] = useState(initialPollData);
  const [loading, setLoading] = useState(!initialPollData);
  const [error, setError] = useState<string | null>(null);
  const [isVoting, setIsVoting] = useState(false);

  // Fetch poll data if not provided
  useEffect(() => {
    if (!pollId || pollData) return;

    const fetchPollData = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/poll/${pollId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch poll data: ${response.status}`);
        }

        const data = await response.json();
        setPollData(data);
      } catch (err) {
        console.error('Error fetching poll:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch poll data');
      } finally {
        setLoading(false);
      }
    };

    fetchPollData();
  }, [pollId, pollData]);

  // Handle voting
  const handleVote = async (answerId: string) => {
    if (!pollData || isVoting) return;

    setIsVoting(true);
    setError(null);

    try {
      const response = await fetch(`/api/poll/${pollData.poll.id}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answerId }),
        credentials: 'include', // Include cookies for authentication
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to vote: ${response.status}`);
      }

      const data = await response.json();
      
      // Update poll data with new vote counts and user vote
      setPollData({
        ...pollData,
        voteCounts: data.voteCounts,
        userVote: { answerId },
      });
    } catch (err) {
      console.error('Error voting:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit vote');
    } finally {
      setIsVoting(false);
    }
  };

  // Calculate total votes
  const getTotalVotes = (voteCounts: Record<string, number> = {}) => {
    return Object.values(voteCounts).reduce((sum, count) => sum + count, 0);
  };

  // Calculate percentage for an answer
  const getPercentage = (answerId: string) => {
    if (!pollData?.voteCounts) return 0;
    
    const total = getTotalVotes(pollData.voteCounts);
    if (total === 0) return 0;
    
    const count = pollData.voteCounts[answerId] || 0;
    return Math.round((count / total) * 100);
  };

  if (loading) {
    return <div className="poll-card poll-card-loading">Loading poll...</div>;
  }

  if (error) {
    return <div className="poll-card poll-card-error">Error: {error}</div>;
  }

  if (!pollData) {
    return <div className="poll-card poll-card-error">Poll not found</div>;
  }

  const hasVoted = Boolean(pollData.userVote);
  const totalVotes = getTotalVotes(pollData.voteCounts);

  return (
    <div className="poll-card">
      <div className="poll-card-header">
        <h2 className="poll-question">{pollData.poll.question}</h2>
        <div className="poll-author">
          by {pollData.author.name || 'Anonymous'}
        </div>
      </div>

      <div className="poll-card-content">
        {!hasVoted ? (
          <div className="poll-answers">
            {pollData.answers.map((answer) => (
              <button
                key={answer.id}
                className="poll-answer-button"
                onClick={() => handleVote(answer.id)}
                disabled={isVoting}
              >
                {answer.text}
              </button>
            ))}
          </div>
        ) : (
          <div className="poll-results">
            {pollData.answers.map((answer) => {
              const percentage = getPercentage(answer.id);
              const isSelected = pollData.userVote?.answerId === answer.id;
              
              return (
                <div 
                  key={answer.id} 
                  className={`poll-result ${isSelected ? 'poll-result-selected' : ''}`}
                >
                  <div className="poll-result-text">
                    <span className="poll-result-answer">{answer.text}</span>
                    <span className="poll-result-percentage">{percentage}%</span>
                  </div>
                  <div className="poll-result-bar-container">
                    <div 
                      className="poll-result-bar" 
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="poll-card-footer">
        <div className="poll-vote-count">
          {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
};

export default PollCard;
