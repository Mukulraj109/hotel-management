// Authentication utility functions
import { api } from '../services/api';

export const AUTH_CREDENTIALS = {
  ADMIN: {
    email: 'admin@hotel.com',
    password: 'admin123'
  },
  GUEST: {
    email: 'john@example.com',
    password: 'guest123'
  }
};

export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem('token');
  return !!token;
};

export const getAuthToken = (): string | null => {
  return localStorage.getItem('token');
};

export const setAuthToken = (token: string): void => {
  localStorage.setItem('token', token);
};

export const clearAuthToken = (): void => {
  localStorage.removeItem('token');
};

export const loginAsAdmin = async (): Promise<string> => {
  try {
    const { data } = await api.post('/auth/login', AUTH_CREDENTIALS.ADMIN);

    if (data.status === 'success' && data.token) {
      setAuthToken(data.token);
      return data.token;
    } else {
      throw new Error('Login failed');
    }
  } catch (error) {
    throw error;
  }
};

export const loginAsGuest = async (): Promise<string> => {
  try {
    const { data } = await api.post('/auth/login', AUTH_CREDENTIALS.GUEST);

    if (data.status === 'success' && data.token) {
      setAuthToken(data.token);
      return data.token;
    } else {
      throw new Error('Login failed');
    }
  } catch (error) {
    throw error;
  }
};

// Auto-login for demo purposes
export const ensureAuthenticated = async (): Promise<string> => {
  const existingToken = getAuthToken();
  if (existingToken) {
    return existingToken;
  }

  // Try to auto-login as admin for demo
  try {
    return await loginAsAdmin();
  } catch (error) {
    throw new Error('Authentication required');
  }
};