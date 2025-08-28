import api from './api';

export interface GuestServiceRequest {
  _id: string;
  bookingId: string;
  userId: string;
  serviceType: 'room_service' | 'housekeeping' | 'maintenance' | 'concierge' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  description: string;
  requestedAt: string;
  completedAt?: string;
  assignedTo?: string;
  estimatedCost?: number;
  actualCost?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateServiceRequestData {
  bookingId: string;
  serviceType: 'room_service' | 'housekeeping' | 'maintenance' | 'concierge' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  description: string;
}

interface ServiceRequestFilters {
  status?: string;
  serviceType?: string;
  priority?: string;
  bookingId?: string;
}

interface ApiResponse<T> {
  status: string;
  data: T;
  message?: string;
}

class GuestServiceService {
  async createServiceRequest(data: CreateServiceRequestData): Promise<ApiResponse<{ serviceRequest: GuestServiceRequest }>> {
    const response = await api.post('/guest-services', data);
    return response.data;
  }

  async getServiceRequests(filters: ServiceRequestFilters = {}): Promise<ApiResponse<{ serviceRequests: GuestServiceRequest[] }>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    
    const response = await api.get(`/guest-services?${params.toString()}`);
    return response.data;
  }

  async getServiceRequestById(id: string): Promise<ApiResponse<{ serviceRequest: GuestServiceRequest }>> {
    const response = await api.get(`/guest-services/${id}`);
    return response.data;
  }

  async updateServiceRequest(id: string, updates: Partial<GuestServiceRequest>): Promise<ApiResponse<{ serviceRequest: GuestServiceRequest }>> {
    const response = await api.patch(`/guest-services/${id}`, updates);
    return response.data;
  }

  async cancelServiceRequest(id: string, reason?: string): Promise<ApiResponse<{ serviceRequest: GuestServiceRequest }>> {
    const response = await api.patch(`/guest-services/${id}/cancel`, { reason });
    return response.data;
  }
}

export const guestServiceService = new GuestServiceService();
