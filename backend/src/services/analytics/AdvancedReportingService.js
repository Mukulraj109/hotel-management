/**
 * Advanced Reporting Service
 * High-performance reporting engine with caching and optimization
 */

import Redis from 'redis';
import Queue from 'bull';
import { FactBookings, FactRevenue, DimDate, DimGuest, MonthlyRevenueAggregate } from '../../models/analytics/DataWarehouse.js';
import { Logger } from '../../utils/logger.js';
import { performance } from 'perf_hooks';

class AdvancedReportingService {
  constructor() {
    this.logger = new Logger('AdvancedReportingService');
    
    // Initialize Redis for caching
    this.cache = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    // Initialize report generation queue
    this.reportQueue = new Queue('report generation', process.env.REDIS_URL || 'redis://localhost:6379');
    
    // Cache TTL settings (in seconds)
    this.cacheTTL = {
      realtime: 60,        // 1 minute
      hourly: 3600,        // 1 hour
      daily: 86400,        // 24 hours
      weekly: 604800,      // 7 days
      monthly: 2592000     // 30 days
    };
    
    // Initialize report templates
    this.initializeReportTemplates();
    this.setupQueueProcessors();
  }
  
  /**
   * Initialize predefined report templates
   */
  initializeReportTemplates() {
    this.reportTemplates = {
      // Executive Dashboard Reports
      executive_summary: {
        name: 'Executive Summary',
        description: 'High-level KPIs and trends',
        cache_ttl: this.cacheTTL.hourly,
        query: this.generateExecutiveSummary.bind(this)
      },
      
      // Revenue Analysis Reports
      revenue_analysis: {
        name: 'Revenue Analysis',
        description: 'Detailed revenue breakdown and trends',
        cache_ttl: this.cacheTTL.hourly,
        query: this.generateRevenueAnalysis.bind(this)
      },
      
      occupancy_analysis: {
        name: 'Occupancy Analysis',
        description: 'Occupancy patterns and forecasting',
        cache_ttl: this.cacheTTL.hourly,
        query: this.generateOccupancyAnalysis.bind(this)
      },
      
      // Guest Analytics Reports
      guest_segmentation: {
        name: 'Guest Segmentation',
        description: 'Guest behavior and segmentation analysis',
        cache_ttl: this.cacheTTL.daily,
        query: this.generateGuestSegmentation.bind(this)
      },
      
      guest_lifetime_value: {
        name: 'Guest Lifetime Value',
        description: 'CLV analysis and retention metrics',
        cache_ttl: this.cacheTTL.daily,
        query: this.generateGuestLifetimeValue.bind(this)
      },
      
      // Operational Reports
      channel_performance: {
        name: 'Channel Performance',
        description: 'Booking channel analysis and optimization',
        cache_ttl: this.cacheTTL.hourly,
        query: this.generateChannelPerformance.bind(this)
      },
      
      seasonal_trends: {
        name: 'Seasonal Trends',
        description: 'Seasonal patterns and year-over-year comparisons',
        cache_ttl: this.cacheTTL.daily,
        query: this.generateSeasonalTrends.bind(this)
      },
      
      // Financial Reports
      profitability: {
        name: 'Profitability Analysis',
        description: 'Profit margins and cost analysis',
        cache_ttl: this.cacheTTL.daily,
        query: this.generateProfitabilityAnalysis.bind(this)
      },
      
      // Forecasting Reports
      demand_forecast: {
        name: 'Demand Forecasting',
        description: 'Future demand predictions',
        cache_ttl: this.cacheTTL.hourly,
        query: this.generateDemandForecast.bind(this)
      }
    };
  }
  
  /**
   * Setup queue processors for background report generation
   */
  setupQueueProcessors() {
    this.reportQueue.process('generate-report', async (job) => {
      const { reportType, parameters, userId } = job.data;
      
      try {
        const report = await this.executeReport(reportType, parameters);
        
        // Store result for user retrieval
        await this.cache.setex(
          `report:result:${job.id}`,
          3600, // 1 hour
          JSON.stringify({
            status: 'completed',
            data: report,
            generatedAt: new Date(),
            userId
          })
        );
        
        return report;
      } catch (error) {
        this.logger.error(`Report generation failed for job ${job.id}:`, error);
        throw error;
      }
    });
    
    this.reportQueue.on('completed', (job, result) => {
      this.logger.info(`Report generation completed: ${job.data.reportType}`);
    });
    
    this.reportQueue.on('failed', (job, err) => {
      this.logger.error(`Report generation failed: ${job.data.reportType}`, err);
    });
  }
  
  /**
   * Generate report with caching
   */
  async generateReport(reportType, parameters = {}, options = {}) {
    const startTime = performance.now();
    
    try {
      // Generate cache key
      const cacheKey = this.generateCacheKey(reportType, parameters);
      
      // Check cache first (unless forced refresh)
      if (!options.forceRefresh) {
        const cachedResult = await this.cache.get(cacheKey);
        if (cachedResult) {
          const result = JSON.parse(cachedResult);
          result.cached = true;
          result.generationTime = performance.now() - startTime;
          
          this.logger.info(`Report served from cache: ${reportType}`);
          return result;
        }
      }
      
      // Check if report should be generated in background
      if (options.async) {
        const job = await this.reportQueue.add('generate-report', {
          reportType,
          parameters,
          userId: options.userId
        });
        
        return {
          jobId: job.id,
          status: 'queued',
          estimatedTime: this.estimateReportTime(reportType, parameters)
        };
      }
      
      // Generate report
      const report = await this.executeReport(reportType, parameters);
      
      // Cache result
      const template = this.reportTemplates[reportType];
      if (template) {
        await this.cache.setex(cacheKey, template.cache_ttl, JSON.stringify(report));
      }
      
      report.cached = false;
      report.generationTime = performance.now() - startTime;
      
      this.logger.info(`Report generated: ${reportType} (${report.generationTime.toFixed(2)}ms)`);
      return report;
      
    } catch (error) {
      this.logger.error(`Report generation failed: ${reportType}`, error);
      throw error;
    }
  }
  
  /**
   * Execute specific report query
   */
  async executeReport(reportType, parameters) {
    const template = this.reportTemplates[reportType];
    if (!template) {
      throw new Error(`Unknown report type: ${reportType}`);
    }
    
    // Validate and normalize parameters
    const normalizedParams = this.normalizeParameters(parameters);
    
    // Execute report query
    const result = await template.query(normalizedParams);
    
    return {
      reportType,
      parameters: normalizedParams,
      data: result,
      generatedAt: new Date(),
      metadata: {
        template: template.name,
        description: template.description
      }
    };
  }
  
  /**
   * Generate Executive Summary Report
   */
  async generateExecutiveSummary(params) {
    const { dateRange, hotelIds } = params;
    
    // Key Performance Indicators
    const kpis = await this.calculateExecutiveKPIs(dateRange, hotelIds);
    
    // Revenue trends (last 12 months)
    const revenueTrends = await this.getRevenueTrends(dateRange, hotelIds);
    
    // Occupancy trends
    const occupancyTrends = await this.getOccupancyTrends(dateRange, hotelIds);
    
    // Guest satisfaction metrics
    const guestMetrics = await this.getGuestSatisfactionMetrics(dateRange, hotelIds);
    
    // Market position
    const marketPosition = await this.getMarketPosition(dateRange, hotelIds);
    
    // Alerts and recommendations
    const insights = await this.generateExecutiveInsights(kpis, revenueTrends, occupancyTrends);
    
    return {
      kpis,
      trends: {
        revenue: revenueTrends,
        occupancy: occupancyTrends
      },
      guestMetrics,
      marketPosition,
      insights,
      summary: this.generateExecutiveSummaryText(kpis, insights)
    };
  }
  
  /**
   * Calculate Executive KPIs
   */
  async calculateExecutiveKPIs(dateRange, hotelIds) {
    const { startDate, endDate } = dateRange;
    const startDateKey = parseInt(startDate.toISOString().slice(0, 10).replace(/-/g, ''));
    const endDateKey = parseInt(endDate.toISOString().slice(0, 10).replace(/-/g, ''));
    
    // Current period metrics
    const currentMetrics = await FactRevenue.aggregate([
      {
        $match: {
          hotel_key: { $in: hotelIds },
          date_key: { $gte: startDateKey, $lte: endDateKey }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$gross_revenue' },
          totalRoomsSold: { $sum: '$rooms_sold' },
          totalRoomsAvailable: { $sum: '$rooms_available' },
          avgADR: { $avg: '$adr' },
          avgRevPAR: { $avg: '$revpar' },
          avgOccupancy: { $avg: '$occupancy_rate' },
          avgProfitMargin: { $avg: '$profit_margin' }
        }
      }
    ]);
    
    // Previous period for comparison (same duration, previous period)
    const periodLength = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const prevStartDate = new Date(startDate.getTime() - (periodLength * 24 * 60 * 60 * 1000));
    const prevEndDate = new Date(endDate.getTime() - (periodLength * 24 * 60 * 60 * 1000));
    const prevStartDateKey = parseInt(prevStartDate.toISOString().slice(0, 10).replace(/-/g, ''));
    const prevEndDateKey = parseInt(prevEndDate.toISOString().slice(0, 10).replace(/-/g, ''));
    
    const previousMetrics = await FactRevenue.aggregate([
      {
        $match: {
          hotel_key: { $in: hotelIds },
          date_key: { $gte: prevStartDateKey, $lte: prevEndDateKey }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$gross_revenue' },
          avgADR: { $avg: '$adr' },
          avgRevPAR: { $avg: '$revpar' },
          avgOccupancy: { $avg: '$occupancy_rate' }
        }
      }
    ]);
    
    const current = currentMetrics[0] || {};
    const previous = previousMetrics[0] || {};
    
    // Calculate percentage changes
    const calculateChange = (current, previous) => {
      if (!previous || previous === 0) return null;
      return ((current - previous) / previous) * 100;
    };
    
    return {
      revenue: {
        current: current.totalRevenue || 0,
        change: calculateChange(current.totalRevenue, previous.totalRevenue)
      },
      occupancy: {
        current: current.avgOccupancy || 0,
        change: calculateChange(current.avgOccupancy, previous.avgOccupancy)
      },
      adr: {
        current: current.avgADR || 0,
        change: calculateChange(current.avgADR, previous.avgADR)
      },
      revpar: {
        current: current.avgRevPAR || 0,
        change: calculateChange(current.avgRevPAR, previous.avgRevPAR)
      },
      profitMargin: {
        current: current.avgProfitMargin || 0,
        change: calculateChange(current.avgProfitMargin, previous.avgProfitMargin)
      },
      totalBookings: current.totalRoomsSold || 0
    };
  }
  
  /**
   * Generate Revenue Analysis Report
   */
  async generateRevenueAnalysis(params) {
    const { dateRange, hotelIds, breakdown = 'daily' } = params;
    
    // Revenue by time period
    const revenueByPeriod = await this.getRevenueByPeriod(dateRange, hotelIds, breakdown);
    
    // Revenue by segment
    const revenueBySegment = await this.getRevenueBySegment(dateRange, hotelIds);
    
    // Revenue by channel
    const revenueByChannel = await this.getRevenueByChannel(dateRange, hotelIds);
    
    // Revenue by room type
    const revenueByRoomType = await this.getRevenueByRoomType(dateRange, hotelIds);
    
    // Revenue forecast
    const revenueForecast = await this.generateRevenueForecast(dateRange, hotelIds);
    
    return {
      summary: {
        totalRevenue: revenueByPeriod.reduce((sum, item) => sum + item.revenue, 0),
        avgDailyRevenue: revenueByPeriod.reduce((sum, item) => sum + item.revenue, 0) / revenueByPeriod.length,
        growthRate: this.calculateGrowthRate(revenueByPeriod)
      },
      breakdown: {
        byPeriod: revenueByPeriod,
        bySegment: revenueBySegment,
        byChannel: revenueByChannel,
        byRoomType: revenueByRoomType
      },
      forecast: revenueForecast,
      insights: this.generateRevenueInsights(revenueByPeriod, revenueBySegment, revenueByChannel)
    };
  }
  
  /**
   * Generate Occupancy Analysis Report
   */
  async generateOccupancyAnalysis(params) {
    const { dateRange, hotelIds } = params;
    
    const startDateKey = parseInt(dateRange.startDate.toISOString().slice(0, 10).replace(/-/g, ''));
    const endDateKey = parseInt(dateRange.endDate.toISOString().slice(0, 10).replace(/-/g, ''));
    
    // Daily occupancy trends
    const dailyOccupancy = await FactRevenue.aggregate([
      {
        $match: {
          hotel_key: { $in: hotelIds },
          date_key: { $gte: startDateKey, $lte: endDateKey }
        }
      },
      {
        $lookup: {
          from: 'dimdates',
          localField: 'date_key',
          foreignField: 'date_key',
          as: 'dateInfo'
        }
      },
      {
        $unwind: '$dateInfo'
      },
      {
        $group: {
          _id: '$date_key',
          occupancyRate: { $avg: '$occupancy_rate' },
          roomsSold: { $sum: '$rooms_sold' },
          roomsAvailable: { $sum: '$rooms_available' },
          date: { $first: '$dateInfo.full_date' },
          isWeekend: { $first: '$dateInfo.is_weekend' },
          season: { $first: '$dateInfo.season' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    // Occupancy by day of week
    const occupancyByDayOfWeek = await FactRevenue.aggregate([
      {
        $match: {
          hotel_key: { $in: hotelIds },
          date_key: { $gte: startDateKey, $lte: endDateKey }
        }
      },
      {
        $lookup: {
          from: 'dimdates',
          localField: 'date_key',
          foreignField: 'date_key',
          as: 'dateInfo'
        }
      },
      {
        $unwind: '$dateInfo'
      },
      {
        $group: {
          _id: '$dateInfo.day_of_week',
          dayName: { $first: '$dateInfo.day_name' },
          avgOccupancy: { $avg: '$occupancy_rate' },
          avgRevPAR: { $avg: '$revpar' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    // Occupancy forecast
    const occupancyForecast = await this.generateOccupancyForecast(dateRange, hotelIds);
    
    return {
      summary: {
        avgOccupancy: dailyOccupancy.reduce((sum, day) => sum + day.occupancyRate, 0) / dailyOccupancy.length,
        peakOccupancy: Math.max(...dailyOccupancy.map(day => day.occupancyRate)),
        lowOccupancy: Math.min(...dailyOccupancy.map(day => day.occupancyRate)),
        totalRoomsSold: dailyOccupancy.reduce((sum, day) => sum + day.roomsSold, 0)
      },
      trends: {
        daily: dailyOccupancy,
        byDayOfWeek: occupancyByDayOfWeek
      },
      forecast: occupancyForecast,
      insights: this.generateOccupancyInsights(dailyOccupancy, occupancyByDayOfWeek)
    };
  }
  
  /**
   * Generate Guest Segmentation Report
   */
  async generateGuestSegmentation(params) {
    const { dateRange, hotelIds } = params;
    
    // Guest segments distribution
    const segmentDistribution = await FactBookings.aggregate([
      {
        $match: {
          hotel_key: { $in: hotelIds },
          check_in_date: {
            $gte: dateRange.startDate,
            $lte: dateRange.endDate
          }
        }
      },
      {
        $group: {
          _id: '$guest_segment',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$revenue_amount' },
          avgBookingValue: { $avg: '$revenue_amount' },
          avgLengthOfStay: { $avg: '$nights_stayed' }
        }
      },
      {
        $sort: { totalRevenue: -1 }
      }
    ]);
    
    // RFM Analysis (Recency, Frequency, Monetary)
    const rfmAnalysis = await this.performRFMAnalysis(dateRange, hotelIds);
    
    // Guest behavior patterns
    const behaviorPatterns = await this.analyzeBehaviorPatterns(dateRange, hotelIds);
    
    return {
      segmentDistribution,
      rfmAnalysis,
      behaviorPatterns,
      insights: this.generateGuestSegmentationInsights(segmentDistribution, rfmAnalysis)
    };
  }
  
  /**
   * Helper methods for report generation
   */
  
  async getRevenueTrends(dateRange, hotelIds) {
    const { startDate, endDate } = dateRange;
    const startDateKey = parseInt(startDate.toISOString().slice(0, 10).replace(/-/g, ''));
    const endDateKey = parseInt(endDate.toISOString().slice(0, 10).replace(/-/g, ''));
    
    return await FactRevenue.aggregate([
      {
        $match: {
          hotel_key: { $in: hotelIds },
          date_key: { $gte: startDateKey, $lte: endDateKey }
        }
      },
      {
        $lookup: {
          from: 'dimdates',
          localField: 'date_key',
          foreignField: 'date_key',
          as: 'dateInfo'
        }
      },
      {
        $unwind: '$dateInfo'
      },
      {
        $group: {
          _id: {
            year: '$dateInfo.year',
            month: '$dateInfo.month'
          },
          revenue: { $sum: '$gross_revenue' },
          occupancy: { $avg: '$occupancy_rate' },
          adr: { $avg: '$adr' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);
  }
  
  async performRFMAnalysis(dateRange, hotelIds) {
    // This would implement RFM (Recency, Frequency, Monetary) analysis
    // Simplified version for now
    return await FactBookings.aggregate([
      {
        $match: {
          hotel_key: { $in: hotelIds },
          check_in_date: {
            $gte: new Date(dateRange.startDate.getTime() - 365 * 24 * 60 * 60 * 1000), // Last year
            $lte: dateRange.endDate
          }
        }
      },
      {
        $group: {
          _id: '$guest_key',
          frequency: { $sum: 1 },
          monetary: { $sum: '$revenue_amount' },
          lastBooking: { $max: '$check_in_date' }
        }
      },
      {
        $addFields: {
          recency: {
            $divide: [
              { $subtract: [new Date(), '$lastBooking'] },
              1000 * 60 * 60 * 24 // Convert to days
            ]
          }
        }
      },
      {
        $bucket: {
          groupBy: '$monetary',
          boundaries: [0, 1000, 5000, 10000, 50000, 100000],
          default: 'high_value',
          output: {
            count: { $sum: 1 },
            avgFrequency: { $avg: '$frequency' },
            avgRecency: { $avg: '$recency' }
          }
        }
      }
    ]);
  }
  
  // Utility methods
  
  generateCacheKey(reportType, parameters) {
    const paramString = JSON.stringify(parameters, Object.keys(parameters).sort());
    return `report:${reportType}:${Buffer.from(paramString).toString('base64')}`;
  }
  
  normalizeParameters(params) {
    return {
      dateRange: {
        startDate: new Date(params.startDate || Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(params.endDate || Date.now())
      },
      hotelIds: Array.isArray(params.hotelIds) ? params.hotelIds : [params.hotelId].filter(Boolean),
      ...params
    };
  }
  
  estimateReportTime(reportType, parameters) {
    // Estimate based on report complexity and data volume
    const estimates = {
      executive_summary: 5000, // 5 seconds
      revenue_analysis: 8000,  // 8 seconds
      occupancy_analysis: 6000, // 6 seconds
      guest_segmentation: 15000, // 15 seconds
      profitability: 12000 // 12 seconds
    };
    
    return estimates[reportType] || 10000;
  }
  
  calculateGrowthRate(timeSeries) {
    if (timeSeries.length < 2) return 0;
    
    const firstValue = timeSeries[0].revenue;
    const lastValue = timeSeries[timeSeries.length - 1].revenue;
    
    return ((lastValue - firstValue) / firstValue) * 100;
  }
  
  // Additional helper methods for insights generation
  generateExecutiveInsights(kpis, revenueTrends, occupancyTrends) {
    const insights = [];
    
    // Revenue insights
    if (kpis.revenue.change > 10) {
      insights.push({
        type: 'positive',
        category: 'revenue',
        message: `Revenue is up ${kpis.revenue.change.toFixed(1)}% compared to the previous period`,
        impact: 'high'
      });
    } else if (kpis.revenue.change < -5) {
      insights.push({
        type: 'warning',
        category: 'revenue',
        message: `Revenue declined by ${Math.abs(kpis.revenue.change).toFixed(1)}% - investigate booking trends`,
        impact: 'high'
      });
    }
    
    // Occupancy insights
    if (kpis.occupancy.current > 85) {
      insights.push({
        type: 'opportunity',
        category: 'pricing',
        message: 'High occupancy detected - consider implementing dynamic pricing to maximize revenue',
        impact: 'medium'
      });
    }
    
    return insights;
  }
  
  /**
   * Get available report types
   */
  getAvailableReports() {
    return Object.keys(this.reportTemplates).map(key => ({
      id: key,
      name: this.reportTemplates[key].name,
      description: this.reportTemplates[key].description
    }));
  }
  
  /**
   * Get report generation status
   */
  async getReportStatus(jobId) {
    const job = await this.reportQueue.getJob(jobId);
    if (!job) return null;
    
    const state = await job.getState();
    
    if (state === 'completed') {
      const result = await this.cache.get(`report:result:${jobId}`);
      return result ? JSON.parse(result) : null;
    }
    
    return {
      status: state,
      progress: job.progress(),
      createdAt: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn
    };
  }
  
  /**
   * Clear report cache
   */
  async clearCache(pattern = 'report:*') {
    const keys = await this.cache.keys(pattern);
    if (keys.length > 0) {
      await this.cache.del(...keys);
    }
    return keys.length;
  }
}

export default AdvancedReportingService;