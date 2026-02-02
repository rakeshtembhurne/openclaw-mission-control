/**
 * Custom hook for fetching and managing agents
 */

import { useState, useEffect } from 'react';
import { api, Agent } from '../services/api';

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAgents();

    // Subscribe to WebSocket updates
    const unsubscribe = api.subscribe('agent_updated', (data) => {
      fetchAgents();
    });

    return unsubscribe;
  }, []);

  async function fetchAgents() {
    try {
      setLoading(true);
      const response = await api.getAllAgents();
      if (response.success) {
        setAgents(response.data);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch agents');
    } finally {
      setLoading(false);
    }
  }

  return { agents, loading, error, refetch: fetchAgents };
}
