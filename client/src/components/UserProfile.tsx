import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Feed from './Feed';

interface User {
  id: string;
  name: string | null;
  email: string | null;
}

const UserProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      if (!id) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Fetch user data
        const response = await fetch(`/api/auth/user/${id}`);
        
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
  }, [id]);

  if (loading) {
    return <div className="user-profile-loading">Loading user profile...</div>;
  }

  if (error) {
    return <div className="user-profile-error">Error: {error}</div>;
  }

  if (!user) {
    return <div className="user-profile-not-found">User not found</div>;
  }

  return (
    <div className="user-profile">
      <div className="user-profile-header">
        <div className="user-avatar-large">
          {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
        </div>
        <h1 className="user-name">{user.name || 'Anonymous User'}</h1>
      </div>
      
      <div className="user-profile-content">
        <h2 className="user-polls-title">Polls created by {user.name || 'this user'}</h2>
        
        <Feed 
          searchQuery={searchQuery} 
          authorId={user.id} 
        />
      </div>
    </div>
  );
};

export default UserProfile;
