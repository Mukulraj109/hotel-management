import api from './api';
import { HousekeepingTask, InventoryItem, RevenueData, OccupancyData, AdminBooking, BookingFilters, BookingStats } from '../types/admin';

interface ApiResponse<T> {
  status: string;
  data: T;
  results?: number;
  pagination?: {
    current: number;
    pages: number;
    total: number;
  };
}

class AdminService {
  // Housekeeping
  async getHousekeepingTasks(filters: any = {}): Promise<ApiResponse<{ tasks: HousekeepingTask[] }>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    const response = await api.get(`/housekeeping?${params.toString()}`);
    return response.data;
  }

  async createHousekeepingTask(taskData: Partial<HousekeepingTask>): Promise<ApiResponse<{ task: HousekeepingTask }>> {
    const response = await api.post('/housekeeping', taskData);
    return response.data;
  }

  async updateHousekeepingTask(id: string, updates: Partial<HousekeepingTask>): Promise<ApiResponse<{ task: HousekeepingTask }>> {
    const response = await api.patch(`/housekeeping/${id}`, updates);
    return response.data;
  }

  async getHousekeepingStats(): Promise<ApiResponse<{ stats: any[] }>> {
    const response = await api.get('/housekeeping/stats');
    return response.data;
  }

  // Inventory
  async getInventoryItems(filters: any = {}): Promise<ApiResponse<{ items: InventoryItem[] }>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    const response = await api.get(`/inventory?${params.toString()}`);
    return response.data;
  }

  async createInventoryItem(itemData: Partial<InventoryItem>): Promise<ApiResponse<{ item: InventoryItem }>> {
    const response = await api.post('/inventory', itemData);
    return response.data;
  }

  async updateInventoryItem(id: string, updates: Partial<InventoryItem>): Promise<ApiResponse<{ item: InventoryItem }>> {
    const response = await api.patch(`/inventory/${id}`, updates);
    return response.data;
  }

  async createSupplyRequest(itemId: string, quantity: number, reason?: string): Promise<any> {
    const response = await api.post('/inventory/request', { itemId, quantity, reason });
    return response.data;
  }

  async processSupplyRequest(itemId: string, requestId: string, status: string): Promise<any> {
    const response = await api.patch(`/inventory/request/${itemId}/${requestId}`, { status });
    return response.data;
  }

  // Reports
  async getRevenueReport(filters: {
    startDate: string;
    endDate: string;
    groupBy?: string;
    hotelId?: string;
  }): Promise<ApiResponse<{ summary: any; breakdown: RevenueData[]; period: any }>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    const response = await api.get(`/reports/revenue?${params.toString()}`);
    return response.data;
  }

  async getOccupancyReport(filters: {
    startDate: string;
    endDate: string;
    hotelId?: string;
  }): Promise<ApiResponse<{ summary: OccupancyData; occupancyByType: any; period: any }>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    const response = await api.get(`/reports/occupancy?${params.toString()}`);
    return response.data;
  }

  async getBookingsReport(filters: any = {}): Promise<any> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    const response = await api.get(`/reports/bookings?${params.toString()}`);
    return response.data;
  }

  // OTA Integration
  async syncBookingCom(hotelId: string): Promise<any> {
    const response = await api.post('/ota/bookingcom/sync', { hotelId });
    return response.data;
  }

  async getOTASyncStatus(hotelId: string): Promise<any> {
    const response = await api.get(`/ota/bookingcom/status/${hotelId}`);
    return response.data;
  }

  async getOTASyncHistory(filters: any = {}): Promise<any> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    const response = await api.get(`/ota/sync-history?${params.toString()}`);
    return response.data;
  }

  // Booking Management
  async getBookings(filters: BookingFilters = {}): Promise<ApiResponse<{ bookings: AdminBooking[] }>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    const response = await api.get(`/bookings?${params.toString()}`);
    return response.data;
  }

  async getBookingById(id: string): Promise<ApiResponse<{ booking: AdminBooking }>> {
    const response = await api.get(`/bookings/${id}`);
    return response.data;
  }

  async updateBooking(id: string, updates: Partial<AdminBooking>): Promise<ApiResponse<{ booking: AdminBooking }>> {
    const response = await api.patch(`/bookings/${id}`, updates);
    return response.data;
  }

  async cancelBooking(id: string, reason?: string): Promise<ApiResponse<{ booking: AdminBooking }>> {
    const response = await api.patch(`/bookings/${id}/cancel`, { reason });
    return response.data;
  }

  async getBookingStats(filters: { startDate?: string; endDate?: string; hotelId?: string } = {}): Promise<ApiResponse<{ stats: BookingStats }>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    const response = await api.get(`/reports/bookings/stats?${params.toString()}`);
    return response.data;
  }
}

export const adminService = new AdminService();