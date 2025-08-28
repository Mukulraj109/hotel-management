import api from './api';

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  groupBy?: 'day' | 'week' | 'month' | 'year';
  hotelId?: string;
}

export interface RevenueReportData {
  summary: {
    totalRevenue: number;
    totalBookings: number;
    averageBookingValue: number;
  };
  breakdown: Array<{
    _id: {
      date: string;
      hotelId: string;
    };
    totalRevenue: number;
    bookingCount: number;
    averageBookingValue: number;
  }>;
  period: {
    startDate: string;
    endDate: string;
    groupBy: string;
  };
}

export interface OccupancyReportData {
  summary: {
    occupancyRate: number;
    totalRoomNights: number;
    totalPossibleRoomNights: number;
    totalRooms: number;
    periodDays: number;
  };
  occupancyByType: Record<string, {
    roomNights: number;
    bookings: number;
  }>;
  period: {
    startDate: string;
    endDate: string;
  };
}

export interface BookingsReportData {
  summary: {
    totalBookings: number;
    totalRevenue: number;
  };
  breakdown: Array<{
    _id: string;
    count: number;
    totalRevenue: number;
  }>;
  period: {
    startDate: string;
    endDate: string;
  } | null;
}

export interface BookingStatsData {
  stats: {
    total: number;
    totalRevenue: number;
    averageBookingValue: number;
    pending: number;
    confirmed: number;
    checkedIn: number;
    checkedOut: number;
    cancelled: number;
  };
}

class ReportsService {
  private baseUrl = '/reports';

  async getRevenueReport(filters: ReportFilters): Promise<RevenueReportData> {
    const params = new URLSearchParams();
    
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.groupBy) params.append('groupBy', filters.groupBy);
    if (filters.hotelId) params.append('hotelId', filters.hotelId);

    console.log('Making revenue report API call:', `${this.baseUrl}/revenue?${params.toString()}`);
    const response = await api.get(`${this.baseUrl}/revenue?${params.toString()}`);
    console.log('Revenue report response:', response.data);
    return response.data.data;
  }

  async getOccupancyReport(filters: ReportFilters): Promise<OccupancyReportData> {
    const params = new URLSearchParams();
    
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.hotelId) params.append('hotelId', filters.hotelId);

    const response = await api.get(`${this.baseUrl}/occupancy?${params.toString()}`);
    return response.data.data;
  }

  async getBookingsReport(filters: ReportFilters): Promise<BookingsReportData> {
    const params = new URLSearchParams();
    
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.hotelId) params.append('hotelId', filters.hotelId);

    console.log('Making bookings report API call:', `${this.baseUrl}/bookings?${params.toString()}`);
    const response = await api.get(`${this.baseUrl}/bookings?${params.toString()}`);
    console.log('Bookings report response:', response.data);
    return response.data.data;
  }

  async getBookingStats(filters: ReportFilters): Promise<BookingStatsData> {
    const params = new URLSearchParams();
    
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.hotelId) params.append('hotelId', filters.hotelId);

    console.log('Making booking stats API call:', `${this.baseUrl}/bookings/stats?${params.toString()}`);
    const response = await api.get(`${this.baseUrl}/bookings/stats?${params.toString()}`);
    console.log('Booking stats response:', response.data);
    return response.data.data;
  }

  // Helper method to generate comprehensive report data for ReportBuilder
  async getComprehensiveReport(
    reportType: 'financial' | 'operational' | 'guest_analytics' | 'staff_performance' | 'marketing' | 'comprehensive',
    filters: ReportFilters
  ) {
    switch (reportType) {
      case 'financial':
        const revenueData = await this.getRevenueReport(filters);
        return this.transformToReportFormat(revenueData, 'Financial Summary', reportType);
        
      case 'operational':
        const occupancyData = await this.getOccupancyReport(filters);
        return this.transformToReportFormat(occupancyData, 'Occupancy Analysis', reportType);
        
      case 'comprehensive':
        // Get all report types for comprehensive view
        const [revenue, occupancy, bookings, stats] = await Promise.all([
          this.getRevenueReport(filters),
          this.getOccupancyReport(filters),
          this.getBookingsReport(filters),
          this.getBookingStats(filters)
        ]);
        
        return {
          reportType: 'comprehensive',
          generatedAt: new Date().toISOString(),
          parameters: filters,
          summary: {
            totalRecords: revenue.breakdown.length + occupancy.occupancyByType ? Object.keys(occupancy.occupancyByType).length : 0,
            dateRange: {
              start: filters.startDate || 'N/A',
              end: filters.endDate || 'N/A',
            },
            keyMetrics: {
              totalRevenue: revenue.summary.totalRevenue,
              totalBookings: revenue.summary.totalBookings,
              occupancyRate: occupancy.summary.occupancyRate,
              averageBookingValue: revenue.summary.averageBookingValue,
            },
          },
          data: {
            revenue,
            occupancy,
            bookings,
            stats,
          },
          charts: [
            {
              type: 'line',
              title: 'Revenue Trends',
              data: revenue.breakdown.map(item => ({
                x: item._id.date,
                y: item.totalRevenue,
              })),
              config: { xKey: 'x', yKey: 'y', color: '#3b82f6' },
            },
            {
              type: 'bar',
              title: 'Occupancy by Room Type',
              data: Object.entries(occupancy.occupancyByType || {}).map(([type, data]) => ({
                x: type,
                y: data.roomNights,
              })),
              config: { xKey: 'x', yKey: 'y', color: '#10b981' },
            },
            {
              type: 'pie',
              title: 'Booking Status Distribution',
              data: bookings.breakdown.map(item => ({
                x: item._id,
                y: item.count,
              })),
              config: { nameKey: 'x', valueKey: 'y' },
            },
          ],
        };
        
      default:
        throw new Error(`Report type ${reportType} not implemented yet`);
    }
  }

  private transformToReportFormat(data: any, title: string, type: string) {
    return {
      reportType: type,
      generatedAt: new Date().toISOString(),
      parameters: data.period || {},
      summary: {
        totalRecords: Array.isArray(data.breakdown) ? data.breakdown.length : 0,
        dateRange: data.period || { start: 'N/A', end: 'N/A' },
        keyMetrics: data.summary || {},
      },
      data: data,
      charts: [], // Will be populated based on report type
    };
  }

  // Export functionality
  async exportReport(
    reportType: string,
    filters: ReportFilters,
    format: 'csv' | 'excel' | 'pdf' = 'csv'
  ): Promise<Blob> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value.toString());
    });
    
    params.append('format', format);
    params.append('export', 'true');

    const endpoint = reportType === 'revenue' ? '/revenue' : 
                    reportType === 'occupancy' ? '/occupancy' : 
                    reportType === 'bookings' ? '/bookings' : '/revenue';

    const response = await api.get(`${this.baseUrl}${endpoint}?${params.toString()}`, {
      responseType: 'blob',
    });

    return response.data;
  }
}

export const reportsService = new ReportsService();