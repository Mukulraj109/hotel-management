import { api } from './api';

export interface CreateUserData {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: 'admin' | 'manager' | 'staff';
  hotelId?: string;
  department?: string;
  employeeId?: string;
  isActive?: boolean;
  sendWelcomeEmail?: boolean;
  // Multi-property
  properties?: string[];
  primaryProperty?: string;
  multiPropertyAccess?: {
    enabled: boolean;
    canCreateProperties: boolean;
    canDeleteProperties: boolean;
    canManageGroups: boolean;
  };
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  role?: 'admin' | 'manager' | 'staff';
  department?: string;
  employeeId?: string;
  isActive?: boolean;
  properties?: string[];
  primaryProperty?: string;
  multiPropertyAccess?: {
    enabled: boolean;
    canCreateProperties: boolean;
    canDeleteProperties: boolean;
    canManageGroups: boolean;
  };
}

export interface UserFilters {
  role?: string;
  isActive?: boolean;
  hotelId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

class UserManagementService {
  /**
   * Create new user
   */
  async createUser(data: CreateUserData) {
    const response = await api.post('/users/create', data);
    return response.data;
  }

  /**
   * Update existing user
   */
  async updateUser(userId: string, data: UpdateUserData) {
    const response = await api.put(`/users/${userId}`, data);
    return response.data;
  }

  /**
   * Delete user (soft delete - sets isActive to false)
   */
  async deleteUser(userId: string) {
    const response = await api.delete(`/users/${userId}`);
    return response.data;
  }

  /**
   * Get list of users with filters
   */
  async getUsers(filters?: UserFilters) {
    const response = await api.get('/users', {
      params: filters
    });
    return response.data;
  }

  /**
   * Get single user by ID
   */
  async getUserById(userId: string) {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  }

  /**
   * Generate temporary password
   */
  async generatePassword() {
    const response = await api.get('/users/generate-password');
    return response.data.data.password;
  }
}

export default new UserManagementService();
