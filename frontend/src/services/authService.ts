import { api } from './api';
import { User, AuthResponse } from '../types/auth';

interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: string;
}

interface LoginData {
  email: string;
  password: string;
}

class AuthService {
  async login(data: LoginData): Promise<AuthResponse> {
    const response = await api.post('/auth/login', data);
    return response.data;
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await api.post('/auth/register', data);
    return response.data;
  }

  async getCurrentUser(): Promise<User> {
    const response = await api.get('/auth/me');
    return response.data.user;
  }

  async logout(): Promise<void> {
    await api.post('/auth/logout');
  }
}

export const authService = new AuthService();
