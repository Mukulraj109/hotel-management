import AdvancedReportingService from '../services/analytics/AdvancedReportingService.js';
import ETLService from '../services/analytics/ETLService.js';
import PredictiveAnalyticsEngine from '../services/analytics/PredictiveAnalyticsEngine.js';
import GuestSegmentationService from '../services/analytics/GuestSegmentationService.js';
import { 
  FactBookings, 
  FactRevenue, 
  MonthlyRevenueAggregate,
  DataWarehouseHelpers 
} from '../models/analytics/DataWarehouse.js';
import Booking from '../models/Booking.js';
import Room from '../models/Room.js';
import RoomType from '../models/RoomType.js';
import Hotel from '../models/Hotel.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';

const reportingService = new AdvancedReportingService();
const etlService = new ETLService();
const predictiveEngine = new PredictiveAnalyticsEngine();
const guestSegmentationService = new GuestSegmentationService();

// Initialize services
let servicesInitialized = false;
const initializeServices = async () => {
  if (!servicesInitialized) {
    try {
      await reportingService.initialize();
      await predictiveEngine.initialize();
      await guestSegmentationService.initialize();
      servicesInitialized = true;
    } catch (error) {
      logger.warn('Some analytics services failed to initialize:', error.message);
    }
  }
};

export const generateReport = async (req, res) => {
  try {
    await initializeServices();
    
    const { reportType: bodyReportType, parameters = {}, options = {} } = req.body;
    const reportType = req.reportType || bodyReportType;
    
    if (!reportType) {
      return res.status(400).json({
        success: false,
        message: 'Report type is required'
      });
    }

    // Set default date range if not provided
    if (!parameters.start_date) {
      parameters.start_date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    }
    if (!parameters.end_date) {
      parameters.end_date = new Date();
    }

    const report = await reportingService.generateReport(reportType, parameters, options);

    res.json({
      success: true,
      data: report,
      metadata: {
        reportType,
        parameters,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Report generation failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate report',
      error: error.message
    });
  }
};

export const getReportStatus = async (req, res) => {
  try {
    const { reportId } = req.params;
    const status = await reportingService.getReportStatus(reportId);

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('Failed to get report status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get report status',
      error: error.message
    });
  }
};

export const getCachedReport = async (req, res) => {
  try {
    const { cacheKey } = req.params;
    const report = await reportingService.getCachedReport(cacheKey);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found in cache'
      });
    }

    res.json({
      success: true,
      data: report
    });

  } catch (error) {
    logger.error('Failed to get cached report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get cached report',
      error: error.message
    });
  }
};

export const clearReportCache = async (req, res) => {
  try {
    const { reportType } = req.params;
    await reportingService.clearCache(reportType);

    res.json({
      success: true,
      message: `Cache cleared for ${reportType || 'all reports'}`
    });

  } catch (error) {
    logger.error('Failed to clear report cache:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear report cache',
      error: error.message
    });
  }
};

export const getReportTemplates = async (req, res) => {
  try {
    const templates = await reportingService.getReportTemplates();

    res.json({
      success: true,
      data: templates
    });

  } catch (error) {
    logger.error('Failed to get report templates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get report templates',
      error: error.message
    });
  }
};

export const scheduleReport = async (req, res) => {
  try {
    const { reportType, schedule, parameters = {} } = req.body;
    
    if (!reportType || !schedule) {
      return res.status(400).json({
        success: false,
        message: 'Report type and schedule are required'
      });
    }

    const jobId = await reportingService.scheduleReport(reportType, schedule, parameters);

    res.json({
      success: true,
      data: { jobId },
      message: 'Report scheduled successfully'
    });

  } catch (error) {
    logger.error('Failed to schedule report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to schedule report',
      error: error.message
    });
  }
};

export const exportReport = async (req, res) => {
  try {
    const { reportId, format } = req.params;
    const report = await reportingService.exportReport(reportId, format);

    res.setHeader('Content-Type', format === 'pdf' ? 'application/pdf' : 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="report-${reportId}.${format}"`);
    
    res.send(report);

  } catch (error) {
    logger.error('Failed to export report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export report',
      error: error.message
    });
  }
};

export const getDashboardMetrics = async (req, res) => {
  try {
    const { period = '30d', hotel_id } = req.query;
    
    // Calculate date range based on period
    let startDate, endDate = new Date();
    switch (period) {
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get real data from database
    const dashboardData = await getRealDashboardData(startDate, endDate, hotel_id);

    res.json({
      success: true,
      data: dashboardData,
      metadata: {
        period,
        dateRange: { startDate, endDate },
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error in getDashboardMetrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard metrics',
      error: error.message
    });
  }
};

// Helper function to get real dashboard data
async function getRealDashboardData(startDate, endDate, hotelId) {
  try {
    // Build filter for hotel and date range
    const filter = {
      checkIn: { $gte: startDate, $lte: endDate }
    };
    
    if (hotelId) {
      filter.hotelId = hotelId;
    }

    // Get bookings data with proper population
    const bookings = await Booking.find(filter)
      .populate('hotelId', 'name')
      .populate('userId', 'name email')
      .populate('rooms.roomId', 'roomNumber type currentRate');
    
    // Calculate KPIs
    const totalRevenue = bookings.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0);
    const totalBookings = bookings.length;
    const averageDailyRate = totalBookings > 0 ? totalRevenue / totalBookings : 0;

    // Calculate RevPAR (Revenue Per Available Room)
    const totalRooms = await Room.countDocuments({ 
      hotelId: hotelId, 
      isActive: true 
    });
    const revpar = totalRooms > 0 ? totalRevenue / totalRooms : 0;

    // Get occupancy data
    const occupiedRooms = await Booking.countDocuments({
      ...filter,
      status: { $in: ['confirmed', 'checked_in', 'checked_out'] }
    });
    const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;

    // Get cancellation data
    const cancellations = await Booking.countDocuments({
      ...filter,
      status: 'cancelled'
    });

    // Revenue by channel (using source field or default to 'direct')
    const revenueByChannel = await Booking.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { $ifNull: ['$source', 'direct'] },
          revenue: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { revenue: -1 } }
    ]);

    // Guest segmentation (by guest type or booking characteristics)
    const guestSegmentation = await Booking.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { $ifNull: ['$guestDetails.adults', 1] },
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Top performing room types
    const topPerformingRoomTypes = await Booking.aggregate([
      { $match: filter },
      { $unwind: '$rooms' },
      {
        $group: {
          _id: '$rooms.roomId',
          revenue: { $sum: '$rooms.rate' },
          bookings: { $sum: 1 }
        }
      },
      { $lookup: {
        from: 'rooms',
        localField: '_id',
        foreignField: '_id',
        as: 'room'
      }},
      { $unwind: '$room' },
      { $sort: { revenue: -1 } },
      { $limit: 5 }
    ]);

    // Calculate previous period for comparison
    const previousPeriodStart = new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime()));
    const previousPeriodEnd = new Date(startDate);
    
    const previousBookings = await Booking.find({
      ...filter,
      checkIn: { $gte: previousPeriodStart, $lt: previousPeriodEnd }
    });

    const previousRevenue = previousBookings.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0);
    const previousBookingsCount = previousBookings.length;
    const previousOccupancy = await Booking.countDocuments({
      checkIn: { $gte: previousPeriodStart, $lt: previousPeriodEnd },
      status: { $in: ['confirmed', 'checked_in', 'checked_out'] }
    });
    const previousCancellations = await Booking.countDocuments({
      checkIn: { $gte: previousPeriodStart, $lt: previousPeriodEnd },
      status: 'cancelled'
    });

    // Calculate changes
    const revenueChange = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;
    const bookingsChange = previousBookingsCount > 0 ? ((totalBookings - previousBookingsCount) / previousBookingsCount) * 100 : 0;
    const occupancyChange = previousOccupancy > 0 ? ((occupiedRooms - previousOccupancy) / previousOccupancy) * 100 : 0;
    const cancellationChange = previousCancellations > 0 ? ((cancellations - previousCancellations) / previousCancellations) * 100 : 0;

    // Format guest segmentation data
    const formattedGuestSegmentation = guestSegmentation.map(item => {
      let segmentName = 'Unknown';
      if (item._id === 1) segmentName = 'Solo';
      else if (item._id === 2) segmentName = 'Couple';
      else if (item._id === 3) segmentName = 'Family';
      else if (item._id >= 4) segmentName = 'Group';
      
      return {
        segment: segmentName,
        count: item.count,
        revenue: item.revenue,
        percentage: totalBookings > 0 ? (item.count / totalBookings) * 100 : 0
      };
    });

    // Format top performing room types
    const formattedTopPerformingRoomTypes = topPerformingRoomTypes.map(item => ({
      roomType: item.room.roomNumber || 'Unknown',
      revenue: item.revenue,
      occupancy: 0, // Could calculate this if needed
      performance: item.revenue > 10000 ? 'excellent' : item.revenue > 5000 ? 'good' : 'average'
    }));

    return {
      kpis: {
        revenue: {
          label: 'Total Revenue',
          value: totalRevenue,
          change: revenueChange,
          changeType: revenueChange >= 0 ? 'increase' : 'decrease',
          format: 'currency'
        },
        occupancy: {
          label: 'Occupancy Rate',
          value: occupancyRate,
          change: occupancyChange,
          changeType: occupancyChange >= 0 ? 'increase' : 'decrease',
          format: 'percentage'
        },
        adr: {
          label: 'Average Daily Rate',
          value: averageDailyRate,
          change: 0, // Could calculate this if needed
          changeType: 'neutral',
          format: 'currency'
        },
        revpar: {
          label: 'RevPAR',
          value: revpar,
          change: 0, // Could calculate this if needed
          changeType: 'neutral',
          format: 'currency'
        },
        bookings: {
          label: 'Total Bookings',
          value: totalBookings,
          change: bookingsChange,
          changeType: bookingsChange >= 0 ? 'increase' : 'decrease',
          format: 'number'
        },
        cancellations: {
          label: 'Cancellations',
          value: cancellations,
          change: cancellationChange,
          changeType: cancellationChange >= 0 ? 'increase' : 'decrease',
          format: 'number'
        }
      },
      revenueByChannel: revenueByChannel.map(item => ({
        channel: item._id || 'Unknown',
        revenue: item.revenue,
        percentage: totalRevenue > 0 ? (item.revenue / totalRevenue) * 100 : 0
      })),
      guestSegmentation: formattedGuestSegmentation,
      topPerformingRooms: formattedTopPerformingRoomTypes,
      alerts: [] // Could add system alerts here
    };

  } catch (error) {
    console.error('Error getting real dashboard data:', error);
    throw error;
  }
}

export const getRealtimeKPIs = async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    // Get today's bookings
    const todayBookings = await Booking.find({
      checkIn: { $gte: startOfDay, $lt: endOfDay }
    });

    const todayRevenue = todayBookings.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0);
    const todayBookingsCount = todayBookings.length;
    const todayADR = todayBookingsCount > 0 ? todayRevenue / todayBookingsCount : 0;

    // Get total rooms for occupancy calculation
    const totalRooms = await Room.countDocuments({ isActive: true });
    const todayOccupiedRooms = await Booking.countDocuments({
      checkIn: { $gte: startOfDay, $lt: endOfDay },
      status: { $in: ['confirmed', 'checked_in', 'checked_out'] }
    });
    const todayOccupancyRate = totalRooms > 0 ? (todayOccupiedRooms / totalRooms) * 100 : 0;
    const todayRevpar = totalRooms > 0 ? todayRevenue / totalRooms : 0;

    res.json({
      success: true,
      data: {
        today: {
          revenue: todayRevenue,
          bookings: todayBookingsCount,
          adr: todayADR,
          occupancy: {
            occupancy_rate: todayOccupancyRate,
            occupied_rooms: todayOccupiedRooms,
            total_rooms: totalRooms
          },
          revpar: todayRevpar
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Error getting real-time KPIs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get real-time KPIs',
      error: error.message
    });
  }
};

export const forecastOccupancy = async (req, res) => {
  try {
    await initializeServices();
    
    const { hotelId } = req.params;
    const { days = 30 } = req.query;
    
    const forecast = await predictiveEngine.forecastOccupancy(hotelId, parseInt(days));

    res.json({
      success: true,
      data: forecast
    });

  } catch (error) {
    logger.error('Error forecasting occupancy:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to forecast occupancy',
      error: error.message
    });
  }
};

export const predictDemand = async (req, res) => {
  try {
    await initializeServices();
    
    const { hotelId } = req.params;
    const { period = '30d' } = req.query;
    
    const prediction = await predictiveEngine.predictDemand(hotelId, period);

    res.json({
      success: true,
      data: prediction
    });

  } catch (error) {
    logger.error('Error predicting demand:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to predict demand',
      error: error.message
    });
  }
};

export const analyzeMarketTrends = async (req, res) => {
  try {
    await initializeServices();
    
    const { hotelId } = req.params;
    const { period = '90d' } = req.query;
    
    const trends = await predictiveEngine.analyzeMarketTrends(hotelId, period);

    res.json({
      success: true,
      data: trends
    });

  } catch (error) {
    logger.error('Error analyzing market trends:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze market trends',
      error: error.message
    });
  }
};