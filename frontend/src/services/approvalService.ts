import { api } from './api';

export interface ApprovalRequest {
  _id: string;
  requestType: 'price_change' | 'booking_modification' | 'refund' | 'discount';
  requestedBy: {
    _id: string;
    name: string;
    email: string;
  };
  targetResource: {
    type: string;
    id: string;
    name: string;
  };
  currentData: Record<string, unknown>;
  requestedData: Record<string, unknown>;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reviewedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  reviewedAt?: string;
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApprovalRequestData {
  requestType: string;
  targetResource: {
    type: string;
    id: string;
    name: string;
  };
  currentData: Record<string, unknown>;
  requestedData: Record<string, unknown>;
  reason: string;
}

export interface ApprovalFilters {
  status?: string;
  requestType?: string;
  startDate?: string;
  endDate?: string;
}

export const approvalService = {
  createApprovalRequest: async (data: CreateApprovalRequestData): Promise<ApprovalRequest> => {
    try {
      const response = await api.post('/approvals', data);
      return response.data;
    } catch (error: unknown) {
      throw error instanceof Error ? error : new Error('Request failed');
    }
  },

  getMyApprovalRequests: async (filters?: ApprovalFilters): Promise<ApprovalRequest[]> => {
    try {
      const response = await api.get('/approvals/my-requests', { params: filters });
      return response.data;
    } catch (error: unknown) {
      throw error instanceof Error ? error : new Error('Request failed');
    }
  },

  getAllApprovalRequests: async (filters?: ApprovalFilters): Promise<ApprovalRequest[]> => {
    try {
      const response = await api.get('/approvals', { params: filters });
      return response.data;
    } catch (error: unknown) {
      throw error instanceof Error ? error : new Error('Request failed');
    }
  },

  approveRequest: async (id: string, notes?: string): Promise<ApprovalRequest> => {
    try {
      const response = await api.put(`/approvals/${id}/approve`, { notes });
      return response.data;
    } catch (error: unknown) {
      throw error instanceof Error ? error : new Error('Request failed');
    }
  },

  rejectRequest: async (id: string, reason: string): Promise<ApprovalRequest> => {
    try {
      const response = await api.put(`/approvals/${id}/reject`, { reason });
      return response.data;
    } catch (error: unknown) {
      throw error instanceof Error ? error : new Error('Request failed');
    }
  },

  cancelRequest: async (id: string): Promise<ApprovalRequest> => {
    try {
      const response = await api.put(`/approvals/${id}/cancel`);
      return response.data;
    } catch (error: unknown) {
      throw error instanceof Error ? error : new Error('Request failed');
    }
  },

  getPendingCount: async (): Promise<number> => {
    try {
      const response = await api.get('/approvals/pending-count');
      return response.data.count;
    } catch (error: unknown) {
      throw error instanceof Error ? error : new Error('Request failed');
    }
  },

  getApprovalStats: async (): Promise<{
    pending: number;
    approved: number;
    rejected: number;
  }> => {
    try {
      const response = await api.get('/approvals/stats');
      return response.data;
    } catch (error: unknown) {
      throw error instanceof Error ? error : new Error('Request failed');
    }
  },
};

export default approvalService;
