import api from './api';
import { Room, Booking, BookingFilters, CreateBookingRequest } from '../types/booking';

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

class BookingService {
  async getRooms(filters: BookingFilters & { page?: number; limit?: number } = {}): Promise<ApiResponse<{ rooms: Room[] }>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    const response = await api.get(`/rooms?${params.toString()}`);
    return response.data;
  }

  async getRoomById(id: string): Promise<ApiResponse<{ room: Room }>> {
    const response = await api.get(`/rooms/${id}`);
    return response.data;
  }

  async createBooking(bookingData: CreateBookingRequest): Promise<ApiResponse<{ booking: Booking }>> {
    const response = await api.post('/bookings', bookingData);
    return response.data;
  }

  async getBookings(filters: { status?: string; page?: number; limit?: number } = {}): Promise<ApiResponse<{ bookings: Booking[] }>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    const response = await api.get(`/bookings?${params.toString()}`);
    return response.data;
  }

  async getBookingById(id: string): Promise<ApiResponse<{ booking: Booking }>> {
    const response = await api.get(`/bookings/${id}`);
    return response.data;
  }

  async updateBooking(id: string, updates: Partial<Booking>): Promise<ApiResponse<{ booking: Booking }>> {
    const response = await api.patch(`/bookings/${id}`, updates);
    return response.data;
  }

  async cancelBooking(id: string, reason?: string): Promise<ApiResponse<{ booking: Booking }>> {
    const response = await api.patch(`/bookings/${id}/cancel`, { reason });
    return response.data;
  }
}

export const bookingService = new BookingService();