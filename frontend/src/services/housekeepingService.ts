import { ApiResponse } from '../types/api';
import { api, normalizeListParams } from './api';

export interface HousekeepingTask {
  _id: string;
  title: string;
  description: string;
  taskType: 'cleaning' | 'maintenance' | 'inspection' | 'deep_clean' | 'checkout_clean';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'inspected' | 'cancelled';
  roomId: {
    _id: string;
    roomNumber: string;
    type: string;
  };
  assignedToUserId?: string;
  estimatedDuration: number;
  startedAt?: string;
  completedAt?: string;
  actualDuration?: number;
  notes?: string;
  supplies?: Array<{
    name: string;
    quantity: number;
    unit: string;
  }>;
  createdAt: string;
}

export type HousekeepingTaskStatus =
  'pending' |
  'assigned' |
  'in_progress' |
  'completed' |
  'inspected' |
  'cancelled';

class HousekeepingService {
  private baseURL = '/housekeeping';

  async getTasks(assignedToUserId?: string, page?: number, limit?: number): Promise<ApiResponse<{ tasks: HousekeepingTask[] }>> {
    try {
      const normalizedParams = normalizeListParams({ page, limit });
      const queryParams = new URLSearchParams();
      if (assignedToUserId) {
        queryParams.append('assignedToUserId', assignedToUserId);
      }
      queryParams.append('page', normalizedParams.page.toString());
      queryParams.append('limit', normalizedParams.limit.toString());

      const endpoint = queryParams.toString() ? `?${queryParams.toString()}` : '';
      const response = await api.get(`${this.baseURL}${endpoint}`);
      return response.data;
    } catch (error: unknown) {
      throw error instanceof Error ? error : new Error('Request failed');
    }
  }

  async updateTaskStatus(taskId: string, status: HousekeepingTaskStatus): Promise<ApiResponse<{ task: HousekeepingTask }>> {
    try {
      const response = await api.patch(`${this.baseURL}/${taskId}`, { status });
      return response.data;
    } catch (error: unknown) {
      throw error instanceof Error ? error : new Error('Request failed');
    }
  }

  async completeTask(taskId: string, completionData: {
    status: HousekeepingTaskStatus;
    notes?: string;
    completedAt?: string;
  }): Promise<ApiResponse<{ task: HousekeepingTask }>> {
    try {
      const response = await api.patch(`${this.baseURL}/${taskId}`, completionData);
      return response.data;
    } catch (error: unknown) {
      throw error instanceof Error ? error : new Error('Request failed');
    }
  }
}

export const housekeepingService = new HousekeepingService();
