import { ApiResponse } from '../types/api';

export interface StaffTodayData {
  checkIns: number;
  checkOuts: number;
  pendingHousekeeping: number;
  pendingMaintenance: number;
  pendingGuestServices: number;
  occupancyRate: number;
}

export interface StaffTask {
  _id: string;
  task?: string;
  issue?: string;
  serviceType?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: string;
  assignedTo: string;
  createdAt: string;
  roomId?: {
    _id: string;
    roomNumber: string;
    type: string;
  };
  userId?: {
    _id: string;
    name: string;
  };
}

export interface StaffTasksData {
  housekeeping: StaffTask[];
  maintenance: StaffTask[];
  guestServices: StaffTask[];
  totalTasks: number;
}

export interface RoomStatusData {
  summary: {
    occupied: number;
    vacant_clean: number;
    vacant_dirty: number;
    maintenance: number;
    out_of_order: number;
  };
  needsAttention: Array<{
    _id: string;
    roomNumber: string;
    type: string;
    status: string;
  }>;
  total: number;
}

export interface StaffInventoryData {
  lowStockAlert: {
    count: number;
    items: Array<{
      name: string;
      currentStock: number;
      threshold: number;
      category: string;
    }>;
  };
  inspectionsDue: {
    count: number;
    rooms: Array<{
      roomNumber: string;
      daysPastDue: number;
    }>;
  };
}

export interface StaffActivityData {
  checkIns: Array<{
    _id: string;
    bookingNumber: string;
    checkIn: string;
    userId: { name: string };
    rooms: Array<{ roomId: { roomNumber: string } }>;
  }>;
  checkOuts: Array<{
    _id: string;
    bookingNumber: string;
    checkOut: string;
    userId: { name: string };
    rooms: Array<{ roomId: { roomNumber: string } }>;
  }>;
  guestServices: Array<{
    _id: string;
    serviceType: string;
    title: string;
    priority: string;
    status: string;
    createdAt: string;
    userId: { name: string };
    roomId: { roomNumber: string };
  }>;
}

class StaffDashboardService {
  private baseURL = '/api/v1/staff-dashboard';
  
  private async fetchWithAuth<T>(endpoint: string): Promise<ApiResponse<T>> {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('token');
        window.location.href = '/login';
        throw new Error('Authentication required');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getTodayOverview(): Promise<ApiResponse<{ today: StaffTodayData; lastUpdated: string }>> {
    return this.fetchWithAuth('/today');
  }

  async getMyTasks(): Promise<ApiResponse<StaffTasksData>> {
    return this.fetchWithAuth('/my-tasks');
  }

  async getRoomStatus(): Promise<ApiResponse<RoomStatusData>> {
    return this.fetchWithAuth('/rooms/status');
  }

  async getInventorySummary(): Promise<ApiResponse<StaffInventoryData>> {
    return this.fetchWithAuth('/inventory/summary');
  }

  async getRecentActivity(): Promise<ApiResponse<StaffActivityData>> {
    return this.fetchWithAuth('/activity');
  }

  // Task management methods
  async updateTaskStatus(taskId: string, status: string, taskType: 'housekeeping' | 'maintenance' | 'guest-service'): Promise<ApiResponse<any>> {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const endpoints = {
      'housekeeping': '/api/v1/housekeeping',
      'maintenance': '/api/v1/maintenance',
      'guest-service': '/api/v1/guest-services'
    };

    const response = await fetch(`${endpoints[taskType]}/${taskId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update ${taskType} task`);
    }

    return response.json();
  }

  // Room status update
  async updateRoomStatus(roomId: string, status: string): Promise<ApiResponse<any>> {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`/api/v1/rooms/${roomId}/status`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      throw new Error('Failed to update room status');
    }

    return response.json();
  }
}

export const staffDashboardService = new StaffDashboardService();