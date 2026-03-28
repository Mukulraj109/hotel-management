import { api } from './api';

export interface StaffMember {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'manager' | 'staff' | 'frontdesk' | 'housekeeping';
  isActive: boolean;
  hotelId: {
    _id: string;
    name: string;
  };
  createdAt: string;
  lastLogin?: string;
}

export interface CreateStaffData {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: 'admin' | 'manager' | 'staff' | 'frontdesk' | 'housekeeping';
}

export interface UpdateStaffData {
  name?: string;
  phone?: string;
  role?: 'admin' | 'manager' | 'staff' | 'frontdesk' | 'housekeeping';
  isActive?: boolean;
}

export interface StaffQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  hotelId?: string;
  role?: 'admin' | 'manager' | 'staff' | 'frontdesk' | 'housekeeping';
  isActive?: boolean;
}

export interface StaffResponse {
  staff: StaffMember[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

class StaffService {
  // Get all staff members with filtering and pagination
  async getStaffMembers(params: StaffQueryParams = {}): Promise<StaffResponse> {
    try {
      const queryParams = new URLSearchParams();

      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.search) queryParams.append('search', params.search);
      if (params.hotelId) queryParams.append('hotelId', params.hotelId);

      // For staff management, always filter by role unless explicitly specified
      // This ensures we only get staff and admin users, never guests
      if (params.role) {
        queryParams.append('role', params.role);
      } else {
        // When no specific role is requested, the backend will default to staff/admin only
        // But we can be explicit to ensure we're getting staff management data
      }

      if (params.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());

      const response = await api.get(`/admin/users?${queryParams.toString()}`);

      // Filter out any guest users that might have slipped through (extra safety)
      const staffRoles = ['admin', 'manager', 'staff', 'frontdesk', 'housekeeping'];
      const staffUsers = response.data.data.users.filter((user: StaffMember) =>
        staffRoles.includes(user.role)
      );

      return {
        staff: staffUsers,
        pagination: response.data.data.pagination // Keep original pagination from backend
      };
    } catch (error: unknown) {
      throw error instanceof Error ? error : new Error('Request failed');
    }
  }

  // Get a specific staff member by ID
  async getStaffMember(id: string): Promise<StaffMember> {
    try {
      const response = await api.get(`/admin/users/${id}`);
      return response.data.data.user;
    } catch (error: unknown) {
      throw error instanceof Error ? error : new Error('Request failed');
    }
  }

  // Create a new staff member
  async createStaffMember(data: CreateStaffData): Promise<StaffMember> {
    try {
      const response = await api.post('/admin/users', data);
      return response.data.data.user;
    } catch (error: unknown) {
      throw error instanceof Error ? error : new Error('Request failed');
    }
  }

  // Update a staff member
  async updateStaffMember(id: string, data: UpdateStaffData): Promise<StaffMember> {
    try {
      const response = await api.patch(`/admin/users/${id}`, data);
      return response.data.data.user;
    } catch (error: unknown) {
      throw error instanceof Error ? error : new Error('Request failed');
    }
  }

  // Delete a staff member
  async deleteStaffMember(id: string): Promise<void> {
    try {
      await api.delete(`/admin/users/${id}`);
    } catch (error: unknown) {
      throw error instanceof Error ? error : new Error('Request failed');
    }
  }

  // Get staff statistics
  async getStaffStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    admins: number;
    regularStaff: number;
  }> {
    try {
      const response = await api.get('/admin/users');

      // Filter to only include staff roles, exclude guests
      const staffRoles = ['admin', 'manager', 'staff', 'frontdesk', 'housekeeping'];
      const staff = response.data.data.users.filter((user: StaffMember) =>
        staffRoles.includes(user.role)
      );

      return {
        total: staff.length,
        active: staff.filter((s: StaffMember) => s.isActive).length,
        inactive: staff.filter((s: StaffMember) => !s.isActive).length,
        admins: staff.filter((s: StaffMember) => s.role === 'admin').length,
        regularStaff: staff.filter((s: StaffMember) => s.role === 'staff').length,
      };
    } catch (error: unknown) {
      throw error instanceof Error ? error : new Error('Request failed');
    }
  }

  // Bulk operations
  async bulkUpdateStatus(ids: string[], isActive: boolean): Promise<void> {
    await Promise.all(
      ids.map(id => this.updateStaffMember(id, { isActive }))
    );
  }

  async bulkDelete(ids: string[]): Promise<void> {
    await Promise.all(
      ids.map(id => this.deleteStaffMember(id))
    );
  }
}

export const staffService = new StaffService();
