/**
 * OpenClaw Mission Control - API Service
 *
 * HTTP client with WebSocket support for real-time updates
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';

export interface Agent {
  id: number;
  name: string;
  session_key: string;
  role: string;
  emoji: string;
  status: string;
  last_heartbeat: number | null;
  created_at: number;
  updated_at: number;
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_agent: string | null;
  created_by: string;
  due_date: number | null;
  completed_at: number | null;
  metadata: string | null;
  created_at: number;
  updated_at: number;
}

export interface Notification {
  id: number;
  target_agent: string;
  type: string;
  title: string;
  message: string | null;
  entity_type: string | null;
  entity_id: string | null;
  is_read: number;
  created_at: number;
}

class APIService {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  /**
   * Make HTTP GET request
   */
  private async get<T>(path: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Make HTTP POST request
   */
  private async post<T>(path: string, body: any): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Make HTTP PUT request
   */
  private async put<T>(path: string, body: any): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Make HTTP DELETE request
   */
  private async delete<T>(path: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  // ==================== AGENTS ====================

  async getAllAgents(): Promise<{ success: boolean; data: Agent[] }> {
    return this.get('/agents');
  }

  async getAgentByName(name: string): Promise<{ success: boolean; data: Agent }> {
    return this.get(`/agents/${name}`);
  }

  async getAgentStats(): Promise<{ success: boolean; data: any }> {
    return this.get('/agents/stats');
  }

  // ==================== TASKS ====================

  async getAllTasks(filters?: {
    status?: string;
    assigned_agent?: string;
    priority?: string;
  }): Promise<{ success: boolean; data: Task[] }> {
    const params = new URLSearchParams(filters as any);
    return this.get(`/tasks?${params}`);
  }

  async getTaskById(id: number): Promise<{ success: boolean; data: Task }> {
    return this.get(`/tasks/${id}`);
  }

  async createTask(task: {
    title: string;
    description?: string;
    priority?: string;
    assigned_agent?: string;
    created_by: string;
    due_date?: number;
  }): Promise<{ success: boolean; data: Task }> {
    return this.post('/tasks', task);
  }

  async updateTask(id: number, updates: Partial<Task>): Promise<{ success: boolean; data: Task }> {
    return this.put(`/tasks/${id}`, updates);
  }

  async deleteTask(id: number): Promise<{ success: boolean; message: string }> {
    return this.delete(`/tasks/${id}`);
  }

  async getTaskStats(): Promise<{ success: boolean; data: any }> {
    return this.get('/tasks/stats');
  }

  // ==================== NOTIFICATIONS ====================

  async getNotifications(agent: string, unreadOnly = false): Promise<{
    success: boolean;
    data: Notification[];
  }> {
    const params = new URLSearchParams({ agent, unread_only: String(unreadOnly) });
    return this.get(`/notifications?${params}`);
  }

  async markAsRead(id: number): Promise<{ success: boolean; message: string }> {
    return this.put(`/notifications/${id}/read`, {});
  }

  async markAllAsRead(agent: string): Promise<{ success: boolean; message: string }> {
    return this.put('/notifications/read-all', { agent });
  }

  // ==================== WEBSOCKET ====================

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.ws = new WebSocket(WS_URL);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const { type, data } = message;

        // Notify all listeners for this type
        const listeners = this.listeners.get(type);
        if (listeners) {
          listeners.forEach((callback) => callback(data));
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      // Attempt to reconnect after 5 seconds
      setTimeout(() => this.connect(), 5000);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  /**
   * Subscribe to WebSocket messages of a specific type
   */
  subscribe(type: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(type)?.delete(callback);
    };
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Export singleton instance
export const api = new APIService();
