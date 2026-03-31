import { ApiResponse } from '../types/dashboard';
import { api, normalizeListParams } from './api';

export interface MaintenanceTask {
  _id: string;
  title: string;
  description: string;
  type: 'plumbing' | 'electrical' | 'hvac' | 'cleaning' | 'carpentry' | 'painting' | 'appliance' | 'safety' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent' | 'emergency';
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
  assignedTo?: {
    _id: string;
    name: string;
  };
  reportedBy: {
    _id: string;
    name: string;
  };
  roomId?: {
    _id: string;
    roomNumber: string;
    type: string;
  };
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  completedDate?: string;
  isOverdue?: boolean;
  estimatedDuration?: number;
  actualDuration?: number;
  estimatedCost?: number;
  actualCost?: number;
}

export interface MaintenanceStats {
  total: number;
  pending: number;
  assigned: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  avgDuration: number;
  overdueCount: number;
  byType?: unknown;
  overdueTasks?: number;
  upcomingRecurring?: number;
  overdueDetails?: MaintenanceTask[];
  upcomingDetails?: MaintenanceTask[];
}

class MaintenanceService {
  private baseURL = '/maintenance';

  // Get maintenance tasks with filters
  async getTasks(params: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
    priority?: string;
    overdue?: boolean;
  } = {}) {
    try {
      const normalizedParams = normalizeListParams(params);
      const queryParams = new URLSearchParams();
      if (normalizedParams.page) queryParams.append('page', normalizedParams.page.toString());
      if (normalizedParams.limit) queryParams.append('limit', normalizedParams.limit.toString());
      if (normalizedParams.status) queryParams.append('status', normalizedParams.status);
      if (normalizedParams.type) queryParams.append('type', normalizedParams.type);
      if (normalizedParams.priority) queryParams.append('priority', normalizedParams.priority);
      if (normalizedParams.overdue) queryParams.append('overdue', 'true');

      const endpoint = queryParams.toString() ? `?${queryParams.toString()}` : '';
      const response = await api.get(`${this.baseURL}${endpoint}`);
      return response.data;
    } catch (error: unknown) {
      throw error instanceof Error ? error : new Error('Request failed');
    }
  }

  // Get maintenance statistics
  async getStats() {
    try {
      const response = await api.get(`${this.baseURL}/stats`);
      return response.data;
    } catch (error: unknown) {
      throw error instanceof Error ? error : new Error('Request failed');
    }
  }

  // Get overdue tasks
  async getOverdueTasks() {
    try {
      const response = await api.get(`${this.baseURL}/overdue`);
      return response.data;
    } catch (error: unknown) {
      throw error instanceof Error ? error : new Error('Request failed');
    }
  }

  // Get task by ID
  async getTask(id: string) {
    try {
      const response = await api.get(`${this.baseURL}/${id}`);
      return response.data;
    } catch (error: unknown) {
      throw error instanceof Error ? error : new Error('Request failed');
    }
  }

  // Create new maintenance task
  async createTask(taskData: {
    title: string;
    description?: string;
    type: string;
    priority: string;
    roomId?: string;
    dueDate?: string;
    estimatedDuration?: number;
    estimatedCost?: number;
    category?: string;
    roomOutOfOrder?: boolean;
  }) {
    try {
      const response = await api.post(`${this.baseURL}`, taskData);
      return response.data;
    } catch (error: unknown) {
      throw error instanceof Error ? error : new Error('Request failed');
    }
  }

  // Update task
  async updateTask(id: string, updates: {
    status?: string;
    assignedTo?: string;
    scheduledDate?: string;
    actualDuration?: number;
    actualCost?: number;
    completionNotes?: string;
    priority?: string;
  }) {
    try {
      const response = await api.patch(`${this.baseURL}/${id}`, updates);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Assign task
  async assignTask(id: string, data: {
    assignedTo: string;
    scheduledDate?: string;
    notes?: string;
  }) {
    try {
      const response = await api.post(`${this.baseURL}/${id}/assign`, data);
      return response.data;
    } catch (error: unknown) {
      throw error instanceof Error ? error : new Error('Request failed');
    }
  }

  // Get tasks for staff dashboard (grouped by status)
  async getTasksGrouped() {
    try {
      const [allUrgent, pending, inProgress, completed] = await Promise.all([
        this.getTasks({ limit: 50 }),
        this.getTasks({ status: 'pending', limit: 10 }),
        this.getTasks({ status: 'in_progress', limit: 10 }),
        this.getTasks({ status: 'completed', limit: 10 }),
      ]);

      // Filter urgent tasks to only show those that are still pending (not started)
      const urgent = (allUrgent.data.tasks || []).filter((task: MaintenanceTask) =>
        task.status === 'pending' && (task.priority === 'emergency' || task.priority === 'urgent')
      );

      // Debug logging

      return {
        urgent: urgent.slice(0, 10), // Limit to 10 after filtering
        pending: pending.data.tasks || [],
        inProgress: inProgress.data.tasks || [],
        completed: completed.data.tasks || [],
      };
    } catch (error) {
      throw error;
    }
  }

  // Start task (change status to in_progress)
  async startTask(id: string) {
    return this.updateTask(id, { status: 'in_progress' });
  }

  // Complete task
  async completeTask(id: string, completionData?: {
    actualDuration?: number;
    actualCost?: number;
    completionNotes?: string;
  }) {
    return this.updateTask(id, {
      status: 'completed',
      ...completionData,
    });
  }
}

export const maintenanceService = new MaintenanceService();
