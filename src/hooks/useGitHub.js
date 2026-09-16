import { useState, useEffect } from 'react';
import { getRepositories, getGitHubStats } from '../utils/github';

export const useGitHub = () => {
  const [repos, setRepos] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [reposData, statsData] = await Promise.all([
          getRepositories(),
          getGitHubStats(),
        ]);
        setRepos(reposData);
        setStats(statsData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { repos, stats, loading, error };
};
