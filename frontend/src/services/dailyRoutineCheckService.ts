import { ApiResponse } from '../types/api';

export interface RoomInventoryItem {
  _id: string;
  name: string;
  category: string;
  description: string;
  unitPrice: number;
  quantity: number;
  status: 'available' | 'missing' | 'damaged' | 'needs_cleaning';
  lastReplaced?: string;
  lastCleaned?: string;
}

export interface DailyCheckData {
  _id: string;
  roomNumber: string;
  type: string;
  floor: string;
  checkStatus: 'pending' | 'completed' | 'overdue';
  lastChecked: string | null;
  fixedInventory: RoomInventoryItem[];
  dailyInventory: RoomInventoryItem[];
  assignedStaff?: string;
  estimatedDuration: number;
}

export interface DailyCheckResult {
  roomId: string;
  checkedBy: string;
  checkedAt: string;
  items: Array<{
    itemId: string;
    action: 'replace' | 'add' | 'laundry' | 'reuse';
    quantity: number;
    notes?: string;
  }>;
  totalCost: number;
  status: 'completed';
}

interface DailyCheckFilters {
  filter?: 'all' | 'pending' | 'completed' | 'overdue';
  floor?: string;
  type?: string;
  assignedStaff?: string;
  page?: number;
  limit?: number;
}

class DailyRoutineCheckService {
  private baseURL = '/api/v1/daily-routine-check';
  
  private async fetchWithAuth<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      ...options,
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
        throw new Error('Authentication required');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get rooms that need daily routine check
   */
  async getRoomsForDailyCheck(filters: DailyCheckFilters = {}): Promise<ApiResponse<{ rooms: DailyCheckData[] }>> {
    const queryParams = new URLSearchParams();
    
    if (filters.filter) queryParams.append('filter', filters.filter);
    if (filters.floor) queryParams.append('floor', filters.floor);
    if (filters.type) queryParams.append('type', filters.type);
    if (filters.assignedStaff) queryParams.append('assignedStaff', filters.assignedStaff);
    if (filters.page) queryParams.append('page', filters.page.toString());
    if (filters.limit) queryParams.append('limit', filters.limit.toString());

    return this.fetchWithAuth(`/rooms?${queryParams.toString()}`);
  }

  /**
   * Get detailed inventory for a specific room
   */
  async getRoomInventory(roomId: string): Promise<ApiResponse<DailyCheckData>> {
    return this.fetchWithAuth(`/rooms/${roomId}/inventory`);
  }

  /**
   * Complete daily routine check for a room
   */
  async completeDailyCheck(roomId: string, checkData: { cart: any[] }): Promise<ApiResponse<DailyCheckResult>> {
    return this.fetchWithAuth(`/rooms/${roomId}/complete`, {
      method: 'POST',
      body: JSON.stringify(checkData),
    });
  }

  /**
   * Get daily check history for a room
   */
  async getRoomCheckHistory(roomId: string, page: number = 1, limit: number = 10): Promise<ApiResponse<{ checks: DailyCheckResult[] }>> {
    return this.fetchWithAuth(`/rooms/${roomId}/history?page=${page}&limit=${limit}`);
  }

  /**
   * Get daily check summary for staff dashboard
   */
  async getDailyCheckSummary(): Promise<ApiResponse<{
    totalRooms: number;
    pendingChecks: number;
    completedToday: number;
    overdueChecks: number;
    estimatedTimeRemaining: number;
  }>> {
    return this.fetchWithAuth('/summary');
  }

  /**
   * Assign daily checks to staff members
   */
  async assignDailyChecks(assignments: Array<{ roomId: string; staffId: string }>): Promise<ApiResponse<{ message: string }>> {
    return this.fetchWithAuth('/assign', {
      method: 'POST',
      body: JSON.stringify({ assignments }),
    });
  }

  /**
   * Get staff member's assigned rooms for today
   */
  async getMyAssignedRooms(): Promise<ApiResponse<{ rooms: DailyCheckData[] }>> {
    return this.fetchWithAuth('/my-assignments');
  }

  /**
   * Mark room as checked without detailed inventory
   */
  async markRoomAsChecked(roomId: string, notes?: string): Promise<ApiResponse<{ message: string }>> {
    return this.fetchWithAuth(`/rooms/${roomId}/mark-checked`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  }

  /**
   * Get inventory templates for different room types
   */
  async getInventoryTemplates(): Promise<ApiResponse<{
    templates: Array<{
      roomType: string;
      fixedInventory: RoomInventoryItem[];
      dailyInventory: RoomInventoryItem[];
    }>;
  }>> {
    return this.fetchWithAuth('/inventory-templates');
  }

  /**
   * Update inventory template for a room type
   */
  async updateInventoryTemplate(roomType: string, template: {
    fixedInventory: Partial<RoomInventoryItem>[];
    dailyInventory: Partial<RoomInventoryItem>[];
  }): Promise<ApiResponse<{ message: string }>> {
    return this.fetchWithAuth(`/inventory-templates/${roomType}`, {
      method: 'PUT',
      body: JSON.stringify(template),
    });
  }

  /**
   * Get daily check statistics for reporting
   */
  async getDailyCheckStats(startDate: string, endDate: string): Promise<ApiResponse<{
    totalChecks: number;
    totalItemsReplaced: number;
    totalItemsAdded: number;
    totalItemsToLaundry: number;
    totalItemsReused: number;
    totalCost: number;
    averageCheckDuration: number;
    roomsByStatus: Record<string, number>;
  }>> {
    return this.fetchWithAuth(`/stats?startDate=${startDate}&endDate=${endDate}`);
  }
}

export const dailyRoutineCheckService = new DailyRoutineCheckService();
