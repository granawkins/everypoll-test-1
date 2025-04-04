import { useState, useEffect, useRef, useCallback } from 'react';
import PollCard from './PollCard';

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

interface FeedProps {
  searchQuery?: string;
  authorId?: string;
}

const Feed: React.FC<FeedProps> = ({ searchQuery, authorId }) => {
  const [polls, setPolls] = useState<PollData[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const loadingRef = useRef<HTMLDivElement>(null);
  const limit = 5; // Number of polls to fetch per page

  // Function to fetch polls from the API
  const fetchPolls = useCallback(async (isInitialFetch: boolean = false) => {
    if (!hasMore && !isInitialFetch) return;

    setLoading(true);
    setError(null);

    try {
      // Build URL with search parameters if provided
      let url = `/api/feed?limit=${limit}&offset=${isInitialFetch ? 0 : offset}`;
      
      if (searchQuery) {
        url += `&q=${encodeURIComponent(searchQuery)}`;
      }

      if (authorId) {
        url += `&authorId=${encodeURIComponent(authorId)}`;
      }

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch feed: ${response.status}`);
      }

      const data: FeedResponse = await response.json();
      
      // If it's an initial fetch, replace polls, otherwise append
      setPolls(prev => isInitialFetch ? data.polls : [...prev, ...data.polls]);
      setHasMore(data.pagination.hasMore);
      
      // Update offset for next fetch
      if (!isInitialFetch) {
        setOffset(prev => prev + limit);
      } else {
        setOffset(limit);
      }
    } catch (err) {
      console.error('Error fetching feed:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch feed');
    } finally {
      setLoading(false);
      if (isInitialFetch) {
        setInitialLoading(false);
      }
    }
  }, [hasMore, offset, searchQuery, authorId, limit]);

  // Fetch initial polls when component mounts or search/author params change
  useEffect(() => {
    setInitialLoading(true);
    setPolls([]);
    setOffset(0);
    fetchPolls(true);
  }, [fetchPolls, searchQuery, authorId]);

  // Set up intersection observer for infinite scrolling
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        const [entry] = entries;
        if (entry.isIntersecting && !loading && hasMore) {
          fetchPolls();
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = loadingRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [fetchPolls, loading, hasMore]);

  if (initialLoading) {
    return <div className="feed-loading">Loading polls...</div>;
  }

  if (error && polls.length === 0) {
    return <div className="feed-error">Error: {error}</div>;
  }

  if (polls.length === 0) {
    let emptyMessage = 'No polls found.';
    
    if (searchQuery && authorId) {
      emptyMessage += ' Try a different search term.';
    } else if (searchQuery) {
      emptyMessage += ' Try a different search term.';
    } else if (authorId) {
      emptyMessage += ' This user hasn\'t created any polls yet.';
    } else {
      emptyMessage += ' Create your first poll to get started!';
    }
    
    return (
      <div className="feed-empty">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="feed">
      {polls.map((pollData) => (
        <PollCard 
          key={pollData.poll.id} 
          pollData={pollData} 
        />
      ))}
      
      {/* Loading indicator for infinite scroll */}
      {hasMore && (
        <div ref={loadingRef} className="feed-loading-more">
          {loading ? 'Loading more polls...' : ''}
        </div>
      )}
      
      {/* Error message for when fetching more polls fails */}
      {error && hasMore && (
        <div className="feed-load-more-error">
          <p>Error loading more polls: {error}</p>
          <button onClick={() => fetchPolls()}>Try Again</button>
        </div>
      )}
      
      {/* End of feed message */}
      {!hasMore && polls.length > 0 && (
        <div className="feed-end">
          <p>You've reached the end of the feed.</p>
        </div>
      )}
    </div>
  );
};

export default Feed;
