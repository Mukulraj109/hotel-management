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

const reportingService = new AdvancedReportingService();
const etlService = new ETLService();
const predictiveEngine = new PredictiveAnalyticsEngine();
const guestSegmentationService = new GuestSegmentationService();

// Initialize services
let servicesInitialized = false;
const initializeServices = async () => {
  if (!servicesInitialized) {
    await reportingService.initialize();
    await predictiveEngine.initialize();
    await guestSegmentationService.initialize();
    servicesInitialized = true;
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
        generatedAt: new Date().toISOString(),
        cached: report.cached || false
      }
    });

  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate report',
      error: error.message
    });
  }
};

export const getReportStatus = async (req, res) => {
  try {
    await initializeServices();
    
    const { reportId } = req.params;
    const status = await reportingService.getReportStatus(reportId);
    
    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get report status',
      error: error.message
    });
  }
};

export const getCachedReport = async (req, res) => {
  try {
    await initializeServices();
    
    const { cacheKey } = req.params;
    const cachedReport = await reportingService.getCachedReport(cacheKey);
    
    if (!cachedReport) {
      return res.status(404).json({
        success: false,
        message: 'Cached report not found'
      });
    }

    res.json({
      success: true,
      data: cachedReport,
      metadata: {
        cached: true,
        retrievedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve cached report',
      error: error.message
    });
  }
};

export const clearReportCache = async (req, res) => {
  try {
    await initializeServices();
    
    const { reportType } = req.params;
    await reportingService.clearCache(reportType);
    
    res.json({
      success: true,
      message: reportType ? `Cache cleared for ${reportType}` : 'All report caches cleared',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to clear cache',
      error: error.message
    });
  }
};

export const getReportTemplates = async (req, res) => {
  try {
    await initializeServices();
    
    const templates = reportingService.getAvailableReports();
    
    res.json({
      success: true,
      data: templates,
      count: Object.keys(templates).length
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get report templates',
      error: error.message
    });
  }
};

export const scheduleReport = async (req, res) => {
  try {
    await initializeServices();
    
    const { reportType, schedule, parameters = {}, recipients = [] } = req.body;
    
    if (!reportType || !schedule) {
      return res.status(400).json({
        success: false,
        message: 'Report type and schedule are required'
      });
    }

    const scheduledJob = await reportingService.scheduleReport({
      reportType,
      schedule,
      parameters,
      recipients,
      createdBy: req.user.id
    });
    
    res.json({
      success: true,
      data: {
        jobId: scheduledJob.id,
        message: 'Report scheduled successfully'
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to schedule report',
      error: error.message
    });
  }
};

export const exportReport = async (req, res) => {
  try {
    await initializeServices();
    
    const { reportId, format } = req.params;
    
    if (!['pdf', 'excel', 'csv'].includes(format)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid export format. Supported: pdf, excel, csv'
      });
    }

    const exportResult = await reportingService.exportReport(reportId, format);
    
    res.setHeader('Content-Type', exportResult.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
    res.send(exportResult.data);

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to export report',
      error: error.message
    });
  }
};

export const getDashboardMetrics = async (req, res) => {
  try {
    await initializeServices();
    
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

    // Generate executive summary for dashboard
    const dashboardData = await reportingService.generateReport('executive_summary', {
      start_date: startDate,
      end_date: endDate,
      hotel_id
    });

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
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard metrics',
      error: error.message
    });
  }
};

export const getRealtimeKPIs = async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    // Get real-time metrics from operational data
    const [
      todayBookings,
      todayRevenue,
      currentOccupancy,
      totalRooms
    ] = await Promise.all([
      Booking.countDocuments({
        createdAt: { $gte: startOfDay },
        status: { $in: ['confirmed', 'checked_in'] }
      }),
      
      Booking.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfDay },
            status: { $in: ['confirmed', 'checked_in', 'checked_out'] }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' }
          }
        }
      ]),
      
      Booking.countDocuments({
        checkInDate: { $lte: today },
        checkOutDate: { $gt: today },
        status: 'checked_in'
      }),
      
      Room.countDocuments({ status: { $ne: 'maintenance' } })
    ]);

    const revenue = todayRevenue.length > 0 ? todayRevenue[0].totalRevenue : 0;
    const occupancyRate = totalRooms > 0 ? (currentOccupancy / totalRooms) * 100 : 0;
    
    // Calculate ADR (Average Daily Rate)
    const adr = todayBookings > 0 ? revenue / todayBookings : 0;
    
    // Calculate RevPAR (Revenue Per Available Room)
    const revpar = totalRooms > 0 ? revenue / totalRooms : 0;

    const realtimeKPIs = {
      today: {
        bookings: todayBookings,
        revenue: revenue,
        occupancy: {
          occupied_rooms: currentOccupancy,
          total_rooms: totalRooms,
          occupancy_rate: Math.round(occupancyRate * 100) / 100
        },
        adr: Math.round(adr * 100) / 100,
        revpar: Math.round(revpar * 100) / 100
      },
      timestamp: new Date().toISOString(),
      nextUpdate: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
    };

    res.json({
      success: true,
      data: realtimeKPIs
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get real-time KPIs',
      error: error.message
    });
  }
};

// PREDICTIVE ANALYTICS ENDPOINTS
export const forecastOccupancy = async (req, res) => {
  try {
    await initializeServices();
    
    const { hotelId } = req.params;
    const { forecastDays = 30, ...options } = req.query;
    
    const forecast = await predictiveEngine.forecastOccupancy(
      hotelId, 
      parseInt(forecastDays), 
      options
    );
    
    res.json({
      success: true,
      data: forecast
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate occupancy forecast',
      error: error.message
    });
  }
};

export const predictDemand = async (req, res) => {
  try {
    await initializeServices();
    
    const { hotelId } = req.params;
    const { targetDate, ...options } = req.query;
    
    if (!targetDate) {
      return res.status(400).json({
        success: false,
        message: 'Target date is required'
      });
    }
    
    const prediction = await predictiveEngine.predictDemand(
      hotelId,
      targetDate,
      options
    );
    
    res.json({
      success: true,
      data: prediction
    });

  } catch (error) {
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
    const options = req.query;
    
    const marketAnalysis = await predictiveEngine.analyzeMarketTrends(
      hotelId,
      options
    );
    
    res.json({
      success: true,
      data: marketAnalysis
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to analyze market trends',
      error: error.message
    });
  }
};