/**
 * Custom hook for fetching and managing tasks
 */

import { useState, useEffect, useCallback } from 'react';
import { api, Task } from '../services/api';

interface TaskFilters {
  status?: string;
  assigned_agent?: string;
  priority?: string;
}

export function useTasks(filters?: TaskFilters) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();

    // Subscribe to WebSocket updates
    const unsubscribe = api.subscribe('task_updated', (data) => {
      fetchTasks();
    });

    return unsubscribe;
  }, [JSON.stringify(filters)]);

  async function fetchTasks() {
    try {
      setLoading(true);
      const response = await api.getAllTasks(filters);
      if (response.success) {
        setTasks(response.data);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }

  const createTask = useCallback(async (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const response = await api.createTask(task);
      if (response.success) {
        await fetchTasks();
        return response.data;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
      throw err;
    }
  }, []);

  const updateTask = useCallback(async (id: number, updates: Partial<Task>) => {
    try {
      const response = await api.updateTask(id, updates);
      if (response.success) {
        await fetchTasks();
        return response.data;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
      throw err;
    }
  }, []);

  const deleteTask = useCallback(async (id: number) => {
    try {
      const response = await api.deleteTask(id);
      if (response.success) {
        await fetchTasks();
        return true;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task');
      throw err;
    }
  }, []);

  return {
    tasks,
    loading,
    error,
    refetch: fetchTasks,
    createTask,
    updateTask,
    deleteTask,
  };
}
