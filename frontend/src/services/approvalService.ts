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
    const response = await api.post('/approvals', data);
    return response.data;
  },

  getMyApprovalRequests: async (filters?: ApprovalFilters): Promise<ApprovalRequest[]> => {
    const response = await api.get('/approvals/my-requests', { params: filters });
    return response.data;
  },

  getAllApprovalRequests: async (filters?: ApprovalFilters): Promise<ApprovalRequest[]> => {
    const response = await api.get('/approvals', { params: filters });
    return response.data;
  },

  approveRequest: async (id: string, notes?: string): Promise<ApprovalRequest> => {
    const response = await api.put(`/approvals/${id}/approve`, { notes });
    return response.data;
  },

  rejectRequest: async (id: string, reason: string): Promise<ApprovalRequest> => {
    const response = await api.put(`/approvals/${id}/reject`, { reason });
    return response.data;
  },

  cancelRequest: async (id: string): Promise<ApprovalRequest> => {
    const response = await api.put(`/approvals/${id}/cancel`);
    return response.data;
  },

  getPendingCount: async (): Promise<number> => {
    const response = await api.get('/approvals/pending-count');
    return response.data.count;
  },

  getApprovalStats: async (): Promise<{
    pending: number;
    approved: number;
    rejected: number;
  }> => {
    const response = await api.get('/approvals/stats');
    return response.data;
  },
};

export default approvalService;
