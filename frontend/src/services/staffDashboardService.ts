import { ApiResponse } from '../types/api';

export interface StaffTodayData {
  checkIns: number;
  checkOuts: number;
  pendingHousekeeping: number;
  pendingMaintenance: number;
  pendingGuestServices: number;
  pendingOrders: number;
  occupancyRate: number;
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
      _id: string;
      name: string;
      currentStock: number;
      threshold: number;
      category: string;
    }>;
  };
  inspectionsDue: {
    count: number;
    rooms: Array<{
      _id: string;
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
    bookingId: {
      rooms: Array<{
        roomId: { roomNumber: string };
      }>;
    };
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
    // Add timestamp to prevent caching issues
    const timestamp = new Date().getTime();
    return this.fetchWithAuth(`/today?t=${timestamp}`);
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

  // Mark room as inspected
  async markRoomInspected(roomId: string): Promise<ApiResponse<any>> {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${this.baseURL}/rooms/${roomId}/inspect`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to mark room as inspected');
    }

    return response.json();
  }

  // Order inventory item
  async orderInventoryItem(itemId: string, quantity: number = 50): Promise<ApiResponse<any>> {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${this.baseURL}/inventory/${itemId}/order`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ quantity }),
    });

    if (!response.ok) {
      throw new Error('Failed to order inventory item');
    }

    return response.json();
  }
}

export const staffDashboardService = new StaffDashboardService();