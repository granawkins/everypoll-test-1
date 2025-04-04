import { useState, useEffect, useCallback } from 'react';

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

interface PollCardProps {
  pollId?: string;
  pollData?: PollData;
}

interface SearchResult {
  poll: Poll;
  answers: Answer[];
  author: Author;
}

const PollCard: React.FC<PollCardProps> = ({ pollId, pollData: initialPollData }) => {
  const [pollData, setPollData] = useState(initialPollData);
  const [loading, setLoading] = useState(!initialPollData);
  const [error, setError] = useState<string | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  
  // Cross-reference state
  const [showCrossReferenceSearch, setShowCrossReferenceSearch] = useState(false);
  const [crossReferenceSearchQuery, setCrossReferenceSearchQuery] = useState('');
  const [crossReferenceSearchResults, setCrossReferenceSearchResults] = useState<SearchResult[]>([]);
  const [searchingCrossReferences, setSearchingCrossReferences] = useState(false);
  const [crossReferenceSearchError, setCrossReferenceSearchError] = useState<string | null>(null);
  const [selectedCrossReference, setSelectedCrossReference] = useState<CrossReference | null>(null);
  const [activeCrossReferenceAnswerId, setActiveCrossReferenceAnswerId] = useState<string | null>(null);

  // Fetch poll data with cross-references
  const fetchPollData = useCallback(async (id: string, crossReferences?: Array<{pollId: string, answerId: string}>) => {
    setLoading(true);
    setError(null);

    try {
      // Build URL with cross-reference parameters if provided
      let url = `/api/poll/${id}`;
      
      if (crossReferences && crossReferences.length > 0) {
        const params = crossReferences.map((ref, index) => {
          return `p${index + 1}=${ref.pollId}&a${index + 1}=${ref.answerId}`;
        }).join('&');
        
        url = `${url}?${params}`;
      }

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch poll data: ${response.status}`);
      }

      const data = await response.json();
      setPollData(data);
      
      // If there are cross-references, update the selected one
      if (data.crossReferences && data.crossReferences.length > 0) {
        setSelectedCrossReference(data.crossReferences[0]);
        setActiveCrossReferenceAnswerId(null); // Reset active answer when changing cross-reference
      }
    } catch (err) {
      console.error('Error fetching poll:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch poll data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch poll data if not provided
  useEffect(() => {
    if (!pollId || pollData) return;
    fetchPollData(pollId);
  }, [pollId, pollData, fetchPollData]);

  // Initialize selectedCrossReference from initial props
  useEffect(() => {
    if (initialPollData?.crossReferences && initialPollData.crossReferences.length > 0) {
      setSelectedCrossReference(initialPollData.crossReferences[0]);
    }
  }, [initialPollData]);

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

  // Search for cross-reference polls
  const handleCrossReferenceSearch = async () => {
    if (!pollData || searchingCrossReferences) return;
    
    setSearchingCrossReferences(true);
    setCrossReferenceSearchError(null);
    
    try {
      // Build URL with existing cross-references as exclusions
      let url = `/api/poll/${pollData.poll.id}/search`;
      
      if (crossReferenceSearchQuery) {
        url += `?q=${encodeURIComponent(crossReferenceSearchQuery)}`;
      }
      
      // Add existing cross-references as exclusions
      if (pollData.crossReferences && pollData.crossReferences.length > 0) {
        const separator = url.includes('?') ? '&' : '?';
        const exclusions = pollData.crossReferences.map((ref, index) => {
          return `p${index + 1}=${ref.pollId}`;
        }).join('&');
        
        url = `${url}${separator}${exclusions}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to search for cross-references: ${response.status}`);
      }
      
      const data = await response.json();
      setCrossReferenceSearchResults(data.polls || []);
    } catch (err) {
      console.error('Error searching for cross-references:', err);
      setCrossReferenceSearchError(err instanceof Error ? err.message : 'Failed to search for cross-references');
      setCrossReferenceSearchResults([]);
    } finally {
      setSearchingCrossReferences(false);
    }
  };

  // Add cross-reference
  const handleAddCrossReference = async (crossRefPollId: string, crossRefAnswerId: string) => {
    if (!pollData) return;
    
    // Create array of existing cross-references plus the new one
    const crossReferences = pollData.crossReferences 
      ? [...pollData.crossReferences.map(ref => ({ pollId: ref.pollId, answerId: ref.answerId }))]
      : [];
      
    crossReferences.push({ pollId: crossRefPollId, answerId: crossRefAnswerId });
    
    // Fetch updated poll data with the new cross-reference
    await fetchPollData(pollData.poll.id, crossReferences);
    
    // Reset search
    setShowCrossReferenceSearch(false);
    setCrossReferenceSearchQuery('');
    setCrossReferenceSearchResults([]);
  };

  // This function would be used to vote on cross-referenced polls that
  // the user hasn't voted on yet. This feature will be implemented in a future step.
  // For now, users can only cross-reference with polls they've already voted on.
  /* 
  const handleCrossReferenceVote = async (pollId: string, answerId: string) => {
    if (!pollData || isVoting) return;
    
    setIsVoting(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/poll/${pollId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answerId }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to vote: ${response.status}`);
      }
      
      // After voting, refresh the main poll with the cross-reference
      const crossReferences = pollData.crossReferences 
        ? [...pollData.crossReferences.map(ref => ({ pollId: ref.pollId, answerId: ref.answerId }))]
        : [];
        
      // Update the answer ID for the poll that was just voted on
      const existingRefIndex = crossReferences.findIndex(ref => ref.pollId === pollId);
      
      if (existingRefIndex !== -1) {
        crossReferences[existingRefIndex].answerId = answerId;
      } else {
        crossReferences.push({ pollId, answerId });
      }
      
      // Fetch updated poll data with the updated cross-reference
      await fetchPollData(pollData.poll.id, crossReferences);
    } catch (err) {
      console.error('Error voting on cross-reference:', err);
      setError(err instanceof Error ? err.message : 'Failed to vote on cross-reference');
    } finally {
      setIsVoting(false);
    }
  };
  */

  // Calculate total votes
  const getTotalVotes = (voteCounts: Record<string, number> = {}) => {
    return Object.values(voteCounts).reduce((sum, count) => sum + count, 0);
  };

  // Calculate percentage for an answer
  const getPercentage = (answerId: string, counts?: Record<string, number>) => {
    const voteCounts = counts || pollData?.voteCounts;
    if (!voteCounts) return 0;
    
    const total = getTotalVotes(voteCounts);
    if (total === 0) return 0;
    
    const count = voteCounts[answerId] || 0;
    return Math.round((count / total) * 100);
  };

  // Handle selecting a different cross-reference answer
  const handleSelectCrossReferenceAnswer = (answerId: string) => {
    setActiveCrossReferenceAnswerId(answerId);
  };

  // Toggle cross-reference search view
  const toggleCrossReferenceSearch = () => {
    setShowCrossReferenceSearch(!showCrossReferenceSearch);
    if (!showCrossReferenceSearch) {
      setCrossReferenceSearchQuery('');
      setCrossReferenceSearchResults([]);
      setCrossReferenceSearchError(null);
    }
  };

  // Select a different cross-reference
  const selectCrossReference = (crossRef: CrossReference) => {
    setSelectedCrossReference(crossRef);
    setActiveCrossReferenceAnswerId(null);
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
  
  // Determine which vote counts to display based on cross-reference state
  const displayVoteCounts = activeCrossReferenceAnswerId && selectedCrossReference
    ? selectedCrossReference.voteCounts
    : pollData.voteCounts;

  // Render the cross-reference sub-charts if we have a selected cross-reference
  const renderCrossReferenceSubCharts = () => {
    if (!selectedCrossReference) return null;
    
    return (
      <div className="cross-reference-sub-charts">
        <h3 className="cross-reference-sub-charts-title">
          Results filtered by "{selectedCrossReference.answer.text}" voters
        </h3>
        
        <div className="cross-reference-sub-charts-grid">
          {pollData.answers.map(answer => {
            const percentage = getPercentage(answer.id, selectedCrossReference.voteCounts);
            const isSelected = pollData.userVote?.answerId === answer.id;
            const isActive = activeCrossReferenceAnswerId === answer.id;
            
            return (
              <div 
                key={answer.id} 
                className={`cross-reference-sub-chart ${isSelected ? 'is-selected' : ''} ${isActive ? 'is-active' : ''}`}
                onClick={() => handleSelectCrossReferenceAnswer(answer.id)}
              >
                <div className="cross-reference-sub-chart-text">
                  <span className="cross-reference-sub-chart-answer">{answer.text}</span>
                  <span className="cross-reference-sub-chart-percentage">{percentage}%</span>
                </div>
                <div className="cross-reference-sub-chart-bar-container">
                  <div 
                    className="cross-reference-sub-chart-bar" 
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        
        {activeCrossReferenceAnswerId && (
          <div className="cross-reference-active-segment">
            Showing results for {pollData.answers.find(a => a.id === activeCrossReferenceAnswerId)?.text} voters who answered "{selectedCrossReference.answer.text}" to "{selectedCrossReference.poll.question}"
          </div>
        )}
      </div>
    );
  };

  // Render cross-reference poll search
  const renderCrossReferenceSearch = () => {
    if (!hasVoted || !showCrossReferenceSearch) return null;
    
    return (
      <div className="cross-reference-search">
        <h3 className="cross-reference-search-title">Search for a poll to cross-reference</h3>
        
        <div className="cross-reference-search-form">
          <input
            type="text"
            className="cross-reference-search-input"
            placeholder="Search for polls..."
            value={crossReferenceSearchQuery}
            onChange={(e) => setCrossReferenceSearchQuery(e.target.value)}
          />
          <button 
            className="cross-reference-search-button"
            onClick={handleCrossReferenceSearch}
            disabled={searchingCrossReferences}
          >
            {searchingCrossReferences ? 'Searching...' : 'Search'}
          </button>
        </div>
        
        {crossReferenceSearchError && (
          <div className="cross-reference-search-error">
            {crossReferenceSearchError}
          </div>
        )}
        
        {crossReferenceSearchResults.length > 0 ? (
          <div className="cross-reference-search-results">
            {crossReferenceSearchResults.map(result => (
              <div key={result.poll.id} className="cross-reference-search-result">
                <h4 className="cross-reference-search-result-question">
                  {result.poll.question}
                </h4>
                <p className="cross-reference-search-result-author">
                  by {result.author.name || 'Anonymous'}
                </p>
                <div className="cross-reference-search-result-answers">
                  {result.answers.map(answer => (
                    <button
                      key={answer.id}
                      className="cross-reference-search-result-answer-button"
                      onClick={() => handleAddCrossReference(result.poll.id, answer.id)}
                    >
                      {answer.text}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : searchingCrossReferences ? (
          <div className="cross-reference-search-loading">
            Searching for polls...
          </div>
        ) : crossReferenceSearchResults.length === 0 && crossReferenceSearchQuery && !crossReferenceSearchError ? (
          <div className="cross-reference-search-no-results">
            No polls found matching your search.
          </div>
        ) : null}
      </div>
    );
  };

  // Render cross-reference selector
  const renderCrossReferenceSelector = () => {
    if (!pollData.crossReferences || pollData.crossReferences.length === 0) return null;
    
    return (
      <div className="cross-reference-selector">
        <h3 className="cross-reference-selector-title">Cross-referenced polls:</h3>
        
        <div className="cross-reference-selector-items">
          {pollData.crossReferences.map(crossRef => (
            <div 
              key={`${crossRef.pollId}-${crossRef.answerId}`} 
              className={`cross-reference-selector-item ${selectedCrossReference?.pollId === crossRef.pollId ? 'is-selected' : ''}`}
              onClick={() => selectCrossReference(crossRef)}
            >
              <span className="cross-reference-selector-question">{crossRef.poll.question}</span>
              <span className="cross-reference-selector-answer">{crossRef.answer.text}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="poll-card">
      <div className="poll-card-header">
        <h2 className="poll-question">{pollData.poll.question}</h2>
        <div className="poll-author">
          by {' '}
          <a href={`/user/${pollData.author.id}`} className="poll-author-link">
            {pollData.author.name || 'Anonymous'}
          </a>
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
              const percentage = getPercentage(answer.id, displayVoteCounts);
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
        
        {/* Cross-reference sub-charts */}
        {hasVoted && selectedCrossReference && renderCrossReferenceSubCharts()}
        
        {/* Cross-reference selector */}
        {hasVoted && renderCrossReferenceSelector()}
      </div>

      <div className="poll-card-footer">
        <div className="poll-vote-count">
          {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
        </div>
        
        {hasVoted && (
          <div className="poll-card-actions">
            <button 
              className="cross-reference-toggle-button"
              onClick={toggleCrossReferenceSearch}
            >
              {showCrossReferenceSearch ? 'Hide cross-reference search' : 'Cross-reference with another poll'}
            </button>
          </div>
        )}
      </div>
      
      {/* Cross-reference search */}
      {renderCrossReferenceSearch()}
    </div>
  );
};

export default PollCard;
