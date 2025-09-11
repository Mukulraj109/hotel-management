import { api } from './api';

export interface RoomTypeAllotment {
  _id: string;
  hotelId: string;
  roomTypeId: string;
  date: string;
  totalRooms: number;
  blockedRooms: number;
  allocatedRooms: number;
  availableRooms: number;
  overbookingAllowed: number;
  minStayRestriction?: number;
  maxStayRestriction?: number;
  closedToArrival: boolean;
  closedToDeparture: boolean;
  status: 'active' | 'blocked' | 'maintenance';
  channelRestrictions?: Array<{
    channel: string;
    blocked: boolean;
    maxAllocation: number;
  }>;
  priceAdjustments?: Array<{
    channel: string;
    adjustment: number;
    adjustmentType: 'percentage' | 'fixed';
  }>;
  notes?: string;
  lastUpdatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AllotmentFilter {
  page?: number;
  limit?: number;
  search?: string;
  roomTypeId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

export interface AllotmentDashboard {
  totalAllotments: number;
  activeAllotments: number;
  blockedAllotments: number;
  occupancyRate: number;
  revenueProjection: number;
  trendData: Array<{
    date: string;
    occupancy: number;
    revenue: number;
  }>;
}

export interface CreateAllotmentData {
  roomTypeId: string;
  date: string;
  totalRooms: number;
  blockedRooms?: number;
  overbookingAllowed?: number;
  minStayRestriction?: number;
  maxStayRestriction?: number;
  closedToArrival?: boolean;
  closedToDeparture?: boolean;
  status?: 'active' | 'blocked' | 'maintenance';
  notes?: string;
}

export interface UpdateAllotmentData extends Partial<CreateAllotmentData> {}

class AllotmentService {
  async getAllotments(params: AllotmentFilter = {}): Promise<{
    allotments: RoomTypeAllotment[];
    pagination: {
      current: number;
      pages: number;
      total: number;
      limit: number;
    };
  }> {
    const response = await api.get('/allotments', { params });
    return response.data;
  }

  async getAllotment(id: string): Promise<RoomTypeAllotment> {
    const response = await api.get(`/allotments/${id}`);
    return response.data;
  }

  async createAllotment(data: CreateAllotmentData): Promise<RoomTypeAllotment> {
    const response = await api.post('/allotments', data);
    return response.data;
  }

  async updateAllotment(id: string, data: UpdateAllotmentData): Promise<RoomTypeAllotment> {
    const response = await api.patch(`/allotments/${id}`, data);
    return response.data;
  }

  async deleteAllotment(id: string): Promise<void> {
    await api.delete(`/allotments/${id}`);
  }

  async getDashboard(params?: { startDate?: string; endDate?: string; roomTypeId?: string }): Promise<AllotmentDashboard> {
    const response = await api.get('/allotments/dashboard', { params });
    return response.data;
  }

  async bulkUpdateAllotments(updates: Array<{
    id: string;
    data: UpdateAllotmentData;
  }>): Promise<RoomTypeAllotment[]> {
    const response = await api.put('/allotments/bulk-update', { updates });
    return response.data;
  }

  async getCalendarData(params: {
    roomTypeId?: string;
    startDate: string;
    endDate: string;
  }): Promise<Array<{
    date: string;
    roomTypeId: string;
    roomTypeName: string;
    totalRooms: number;
    availableRooms: number;
    occupancyRate: number;
    status: string;
  }>> {
    const response = await api.get('/allotments/calendar', { params });
    return response.data;
  }
}

export const allotmentService = new AllotmentService();