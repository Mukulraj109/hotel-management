import { PricingRule, DemandForecast, RateShopping, Package, CorporateRate, RevenueAnalytics } from '../models/RevenueManagement.js';
import DynamicPricingEngine from '../services/dynamicPricingEngine.js';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import Room from '../models/Room.js';

const pricingEngine = new DynamicPricingEngine();

// Pricing Rules Management
export const createPricingRule = async (req, res) => {
  try {
    const ruleData = {
      ...req.body,
      ruleId: uuidv4()
    };
    
    const rule = new PricingRule(ruleData);
    await rule.save();
    
    res.status(201).json({
      success: true,
      data: rule
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const getPricingRules = async (req, res) => {
  try {
    const rules = await PricingRule.find()
      .populate('applicableRoomTypes', 'name')
      .sort({ priority: -1, createdAt: -1 });
    
    res.json({
      success: true,
      data: rules
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const updatePricingRule = async (req, res) => {
  try {
    const rule = await PricingRule.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Pricing rule not found'
      });
    }
    
    res.json({
      success: true,
      data: rule
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const deletePricingRule = async (req, res) => {
  try {
    const rule = await PricingRule.findByIdAndDelete(req.params.id);
    
    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Pricing rule not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Pricing rule deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Dynamic Pricing
export const calculateDynamicRate = async (req, res) => {
  try {
    const { roomTypeId, checkInDate, checkOutDate } = req.query;
    
    if (!roomTypeId || !checkInDate) {
      return res.status(400).json({
        success: false,
        message: 'Room type ID and check-in date are required'
      });
    }
    
    const checkIn = new Date(checkInDate);
    const checkOut = checkOutDate ? new Date(checkOutDate) : new Date(checkIn.getTime() + 24 * 60 * 60 * 1000);
    
    const pricing = await pricingEngine.calculateDynamicRate(roomTypeId, checkIn, checkOut);
    
    res.json({
      success: true,
      data: pricing
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Demand Forecasting
export const generateDemandForecast = async (req, res) => {
  try {
    const { roomTypeId, startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const forecasts = await pricingEngine.generateDemandForecast(roomTypeId, start, end);
    
    // Save forecasts to database
    await Promise.all(forecasts.map(forecast => 
      DemandForecast.findOneAndUpdate(
        { date: forecast.date, roomType: forecast.roomType },
        forecast,
        { upsert: true, new: true }
      )
    ));
    
    res.json({
      success: true,
      data: forecasts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getDemandForecast = async (req, res) => {
  try {
    const { startDate, endDate, roomTypeId } = req.query;
    const filter = {};
    
    if (startDate && endDate) {
      filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    
    if (roomTypeId) {
      filter.roomType = roomTypeId;
    }
    
    const forecasts = await DemandForecast.find(filter)
      .populate('roomType', 'name')
      .sort({ date: 1 });
    
    res.json({
      success: true,
      data: forecasts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Rate Shopping
export const addCompetitorRate = async (req, res) => {
  try {
    const rateData = new RateShopping(req.body);
    await rateData.save();
    
    res.status(201).json({
      success: true,
      data: rateData
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const getCompetitorRates = async (req, res) => {
  try {
    const { date, competitorId } = req.query;
    const filter = { isActive: true };
    
    if (date) {
      filter['rates.date'] = new Date(date);
    }
    
    if (competitorId) {
      filter.competitorId = competitorId;
    }
    
    const rates = await RateShopping.find(filter).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: rates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const updateCompetitorRates = async (req, res) => {
  try {
    const { competitorId, rates } = req.body;
    
    const competitor = await RateShopping.findOneAndUpdate(
      { competitorId },
      { 
        rates,
        lastUpdated: new Date()
      },
      { new: true }
    );
    
    if (!competitor) {
      return res.status(404).json({
        success: false,
        message: 'Competitor not found'
      });
    }
    
    res.json({
      success: true,
      data: competitor
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Packages Management
export const createPackage = async (req, res) => {
  try {
    const packageData = {
      ...req.body,
      packageId: uuidv4()
    };
    
    const newPackage = new Package(packageData);
    await newPackage.save();
    
    res.status(201).json({
      success: true,
      data: newPackage
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const getPackages = async (req, res) => {
  try {
    const packages = await Package.find({ isActive: true })
      .populate('roomTypes', 'name')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: packages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const updatePackage = async (req, res) => {
  try {
    const updatedPackage = await Package.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!updatedPackage) {
      return res.status(404).json({
        success: false,
        message: 'Package not found'
      });
    }
    
    res.json({
      success: true,
      data: updatedPackage
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Corporate Rates
export const createCorporateRate = async (req, res) => {
  try {
    const rateData = {
      ...req.body,
      contractId: uuidv4()
    };
    
    const corporateRate = new CorporateRate(rateData);
    await corporateRate.save();
    
    res.status(201).json({
      success: true,
      data: corporateRate
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const getCorporateRates = async (req, res) => {
  try {
    const rates = await CorporateRate.find({ isActive: true })
      .populate('company', 'name')
      .populate('roomTypes.roomType', 'name')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: rates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Revenue Analytics
export const getRevenueAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, roomTypeId, groupBy = 'day' } = req.query;
    
    const matchStage = {};
    
    if (startDate && endDate) {
      matchStage.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    
    if (roomTypeId) {
      matchStage.roomType = mongoose.Types.ObjectId(roomTypeId);
    }
    
    let groupByStage;
    switch (groupBy) {
      case 'week':
        groupByStage = {
          $group: {
            _id: { $week: '$date' },
            totalRevenue: { $sum: '$metrics.revenue' },
            avgADR: { $avg: '$metrics.adr' },
            avgRevPAR: { $avg: '$metrics.revpar' },
            avgOccupancy: { $avg: '$metrics.occupancy' },
            totalRoomsSold: { $sum: '$metrics.roomsSold' }
          }
        };
        break;
      case 'month':
        groupByStage = {
          $group: {
            _id: { $month: '$date' },
            totalRevenue: { $sum: '$metrics.revenue' },
            avgADR: { $avg: '$metrics.adr' },
            avgRevPAR: { $avg: '$metrics.revpar' },
            avgOccupancy: { $avg: '$metrics.occupancy' },
            totalRoomsSold: { $sum: '$metrics.roomsSold' }
          }
        };
        break;
      default:
        groupByStage = {
          $group: {
            _id: '$date',
            totalRevenue: { $sum: '$metrics.revenue' },
            avgADR: { $avg: '$metrics.adr' },
            avgRevPAR: { $avg: '$metrics.revpar' },
            avgOccupancy: { $avg: '$metrics.occupancy' },
            totalRoomsSold: { $sum: '$metrics.roomsSold' }
          }
        };
    }
    
    const analytics = await RevenueAnalytics.aggregate([
      { $match: matchStage },
      groupByStage,
      { $sort: { _id: 1 } }
    ]);
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getRevenueSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    const dateRange = {
      $gte: startDate ? new Date(startDate) : thirtyDaysAgo,
      $lte: endDate ? new Date(endDate) : today
    };
    
    const summary = await RevenueAnalytics.aggregate([
      { $match: { date: dateRange } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$metrics.revenue' },
          avgADR: { $avg: '$metrics.adr' },
          avgRevPAR: { $avg: '$metrics.revpar' },
          avgOccupancy: { $avg: '$metrics.occupancy' },
          totalRoomsSold: { $sum: '$metrics.roomsSold' },
          totalRoomsAvailable: { $sum: '$metrics.roomsAvailable' },
          daysCounted: { $sum: 1 }
        }
      }
    ]);
    
    const result = summary.length > 0 ? summary[0] : {
      totalRevenue: 0,
      avgADR: 0,
      avgRevPAR: 0,
      avgOccupancy: 0,
      totalRoomsSold: 0,
      totalRoomsAvailable: 0,
      daysCounted: 0
    };
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Optimization Recommendations
export const getOptimizationRecommendations = async (req, res) => {
  try {
    const recommendations = [];
    
    // Analyze recent performance
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    const recentAnalytics = await RevenueAnalytics.find({
      date: { $gte: lastWeek }
    }).sort({ date: -1 });
    
    if (recentAnalytics.length === 0) {
      return res.json({
        success: true,
        data: { recommendations: [], message: 'Insufficient data for recommendations' }
      });
    }
    
    // Check for low occupancy days
    const lowOccupancyDays = recentAnalytics.filter(day => day.metrics.occupancy < 60);
    if (lowOccupancyDays.length > 0) {
      recommendations.push({
        type: 'pricing',
        priority: 'high',
        title: 'Consider Lower Rates for Low Occupancy',
        description: `${lowOccupancyDays.length} days had occupancy below 60%. Consider reducing rates on similar future dates.`,
        action: 'Create occupancy-based pricing rule'
      });
    }
    
    // Check for high occupancy with low ADR
    const highOccupancyLowADR = recentAnalytics.filter(day => 
      day.metrics.occupancy > 85 && day.metrics.adr < 4000
    );
    if (highOccupancyLowADR.length > 0) {
      recommendations.push({
        type: 'pricing',
        priority: 'medium',
        title: 'Opportunity to Increase Rates',
        description: `${highOccupancyLowADR.length} days had high occupancy (>85%) but low ADR. Consider increasing rates.`,
        action: 'Implement demand-based pricing'
      });
    }
    
    // Check competitor rates
    const recentCompetitorRates = await RateShopping.find({
      'rates.date': { $gte: lastWeek },
      isActive: true
    });
    
    if (recentCompetitorRates.length > 0) {
      recommendations.push({
        type: 'competitive',
        priority: 'medium',
        title: 'Monitor Competitor Pricing',
        description: 'Keep track of competitor rate changes and adjust accordingly.',
        action: 'Enable competitor-based pricing rules'
      });
    }
    
    // Forecast-based recommendations
    const upcomingForecasts = await DemandForecast.find({
      date: { $gte: new Date(), $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
    }).sort({ date: 1 });
    
    const highDemandDays = upcomingForecasts.filter(forecast => 
      forecast.predictedOccupancy > 90
    );
    
    if (highDemandDays.length > 0) {
      recommendations.push({
        type: 'forecast',
        priority: 'high',
        title: 'High Demand Period Approaching',
        description: `${highDemandDays.length} days in the next month show high predicted demand (>90% occupancy).`,
        action: 'Increase rates for high-demand periods'
      });
    }
    
    res.json({
      success: true,
      data: {
        recommendations,
        analyticsCount: recentAnalytics.length,
        forecastCount: upcomingForecasts.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Dashboard Metrics - Get real data from bookings
export const getDashboardMetrics = async (req, res) => {
  try {
    console.log('Dashboard metrics endpoint called with query:', req.query);
    
    const { startDate, endDate } = req.query;
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    const dateRange = {
      $gte: startDate ? new Date(startDate) : thirtyDaysAgo,
      $lte: endDate ? new Date(endDate) : today
    };
    
    // Get bookings in date range
    console.log('Querying bookings with date range:', dateRange);
    const bookings = await Booking.find({
      createdAt: dateRange,
      status: { $in: ['confirmed', 'checked_in', 'checked_out'] }
    }).populate('rooms.roomId');
    
    console.log(`Found ${bookings.length} bookings`);
    
    // Get total rooms for occupancy calculation
    const totalRooms = await Room.countDocuments({ isActive: true });
    console.log(`Total rooms: ${totalRooms}`);
    
    // Calculate metrics
    const totalRevenue = bookings.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0);
    const totalRoomNights = bookings.reduce((sum, booking) => {
      const nights = Math.ceil((new Date(booking.checkOut) - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24));
      return sum + (nights * (booking.rooms?.length || 1));
    }, 0);
    
    const totalBookings = bookings.length;
    const adr = totalRoomNights > 0 ? totalRevenue / totalRoomNights : 3500; // Default ADR if no data
    const dayCount = Math.max(1, Math.ceil((dateRange.$lte - dateRange.$gte) / (1000 * 60 * 60 * 24)));
    const occupancyRate = totalRooms > 0 ? (totalRoomNights / (totalRooms * dayCount)) * 100 : 45; // Default occupancy
    const revPAR = totalRooms > 0 ? totalRevenue / (totalRooms * dayCount) : adr * (occupancyRate / 100);
    
    console.log('Calculated metrics:', { totalRevenue, adr, occupancyRate, revPAR, totalBookings });
    
    // Get previous period for comparison
    const prevPeriodStart = new Date(dateRange.$gte);
    prevPeriodStart.setDate(prevPeriodStart.getDate() - dayCount);
    const prevPeriodEnd = new Date(dateRange.$gte);
    
    const prevBookings = await Booking.find({
      createdAt: { $gte: prevPeriodStart, $lte: prevPeriodEnd },
      status: { $in: ['confirmed', 'checked_in', 'checked_out'] }
    });
    
    const prevRevenue = prevBookings.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0);
    const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
    
    // Mock competitive index and demand capture (would need competitor data)
    const competitiveIndex = 108; // Above market average
    const demandCaptureRate = Math.min(95, occupancyRate + 15); // Simplified calculation
    
    // Create mock rate shopping data
    const mockRateShopping = {
      competitors: [
        { hotelName: 'Grand Plaza', roomType: 'Standard', currentRate: Math.round(adr * 0.95), availability: 15, lastUpdated: new Date(), source: 'API' },
        { hotelName: 'Royal Palace', roomType: 'Standard', currentRate: Math.round(adr * 1.07), availability: 8, lastUpdated: new Date(), source: 'Scraping' },
        { hotelName: 'City Center', roomType: 'Standard', currentRate: Math.round(adr * 0.90), availability: 22, lastUpdated: new Date(), source: 'Manual' }
      ],
      marketPosition: 'competitive',
      priceGap: Math.round(adr * 0.05),
      recommendations: [
        { action: 'Increase weekend rates by 10%', impact: `+₹${Math.round(totalRevenue * 0.1)}K revenue`, urgency: 'high' },
        { action: 'Optimize corporate rates', impact: '+8% corporate revenue', urgency: 'medium' }
      ]
    };
    
    // Create demand forecast based on booking trends
    const mockDemandForecast = [];
    for (let i = 0; i < 7; i++) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + i);
      
      const isWeekend = futureDate.getDay() === 0 || futureDate.getDay() === 6;
      const baseOccupancy = occupancyRate;
      const predictedOccupancy = Math.min(95, baseOccupancy + (isWeekend ? 15 : -5) + Math.random() * 10);
      
      mockDemandForecast.push({
        date: futureDate.toISOString().split('T')[0],
        demandLevel: predictedOccupancy > 85 ? 'high' : predictedOccupancy > 70 ? 'medium' : 'low',
        predictedOccupancy: Math.round(predictedOccupancy),
        confidence: Math.round(85 + Math.random() * 10),
        factors: isWeekend ? ['Weekend demand', 'Leisure travel'] : ['Corporate travel', 'Mid-week business'],
        recommendedRateChange: predictedOccupancy > 85 ? 15 : predictedOccupancy < 60 ? -10 : 0,
        potentialRevenue: Math.round(totalRevenue / dayCount * (1 + (predictedOccupancy - occupancyRate) / 100))
      });
    }
    
    const response = {
      metrics: {
        totalRevenue,
        revPAR: Math.round(revPAR),
        adr: Math.round(adr),
        occupancyRate: Math.round(occupancyRate * 10) / 10,
        rateOptimizationImpact: Math.round(revenueGrowth * 10) / 10,
        competitiveIndex,
        demandCaptureRate: Math.round(demandCaptureRate * 10) / 10,
        priceElasticity: 0.75
      },
      rateShopping: mockRateShopping,
      demandForecast: mockDemandForecast,
      periodInfo: {
        startDate: dateRange.$gte,
        endDate: dateRange.$lte,
        totalBookings,
        totalRoomNights,
        dayCount
      }
    };
    
    res.json({
      success: true,
      data: response
    });
    
  } catch (error) {
    console.error('Dashboard metrics error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export default {
  createPricingRule,
  getPricingRules,
  updatePricingRule,
  deletePricingRule,
  calculateDynamicRate,
  generateDemandForecast,
  getDemandForecast,
  addCompetitorRate,
  getCompetitorRates,
  updateCompetitorRates,
  createPackage,
  getPackages,
  updatePackage,
  createCorporateRate,
  getCorporateRates,
  getRevenueAnalytics,
  getRevenueSummary,
  getOptimizationRecommendations,
  getDashboardMetrics
};