import RoomTypeAllotment from '../models/RoomTypeAllotment.js';
import RoomType from '../models/RoomType.js';
import Booking from '../models/Booking.js';
import AuditLog from '../models/AuditLog.js';
import mongoose from 'mongoose';

class AllotmentService {
  /**
   * Create a new room type allotment configuration
   */
  async createAllotment(allotmentData, userId) {
    try {
      // Check if allotment already exists for this room type
      const existing = await RoomTypeAllotment.findOne({
        hotelId: allotmentData.hotelId,
        roomTypeId: allotmentData.roomTypeId,
        status: 'active'
      });

      if (existing) {
        throw new Error('Active allotment configuration already exists for this room type');
      }

      // Validate room type exists
      const roomType = await RoomType.findById(allotmentData.roomTypeId);
      if (!roomType) {
        throw new Error('Room type not found');
      }

      // Set default values
      const allotmentConfig = {
        ...allotmentData,
        createdBy: userId,
        updatedBy: userId,
        status: 'active'
      };

      // Create default channels if not provided
      if (!allotmentConfig.channels || allotmentConfig.channels.length === 0) {
        allotmentConfig.channels = this.getDefaultChannels();
      }

      // Initialize default allocation rules
      if (!allotmentConfig.allocationRules || allotmentConfig.allocationRules.length === 0) {
        allotmentConfig.allocationRules = this.getDefaultAllocationRules(allotmentConfig.channels);
      }

      const allotment = new RoomTypeAllotment(allotmentConfig);
      await allotment.save();

      // Create initial allotments for the next 90 days
      await this.initializeAllotments(allotment._id, 90);

      // Log the creation
      await this.logAction(allotment._id, userId, 'created', { allotmentId: allotment._id });

      return allotment;
    } catch (error) {
      throw new Error(`Failed to create allotment: ${error.message}`);
    }
  }

  /**
   * Get default channel configurations
   */
  getDefaultChannels() {
    return [
      {
        channelId: 'direct',
        channelName: 'Direct Booking',
        isActive: true,
        priority: 100,
        commission: 0,
        markup: 0,
        restrictions: {
          minimumStay: 1,
          maximumStay: 30,
          closedToArrival: false,
          closedToDeparture: false,
          stopSell: false
        }
      },
      {
        channelId: 'booking_com',
        channelName: 'Booking.com',
        isActive: true,
        priority: 80,
        commission: 15,
        markup: 5,
        restrictions: {
          minimumStay: 1,
          maximumStay: 21,
          closedToArrival: false,
          closedToDeparture: false,
          stopSell: false
        }
      },
      {
        channelId: 'expedia',
        channelName: 'Expedia',
        isActive: true,
        priority: 75,
        commission: 18,
        markup: 8,
        restrictions: {
          minimumStay: 1,
          maximumStay: 21,
          closedToArrival: false,
          closedToDeparture: false,
          stopSell: false
        }
      },
      {
        channelId: 'airbnb',
        channelName: 'Airbnb',
        isActive: false,
        priority: 60,
        commission: 12,
        markup: 10,
        restrictions: {
          minimumStay: 2,
          maximumStay: 30,
          closedToArrival: false,
          closedToDeparture: false,
          stopSell: false
        }
      }
    ];
  }

  /**
   * Get default allocation rules
   */
  getDefaultAllocationRules(channels) {
    const channelPercentages = new Map();
    channelPercentages.set('direct', 40);
    channelPercentages.set('booking_com', 35);
    channelPercentages.set('expedia', 25);

    return [
      {
        name: 'Default Percentage Allocation',
        type: 'percentage',
        isActive: true,
        conditions: {
          dateRange: {
            startDate: new Date(),
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
          }
        },
        allocation: {
          percentage: channelPercentages
        },
        fallbackRule: 'equal_distribution'
      }
    ];
  }

  /**
   * Initialize allotments for the next N days
   */
  async initializeAllotments(allotmentId, days = 90) {
    try {
      const allotment = await RoomTypeAllotment.findById(allotmentId);
      if (!allotment) {
        throw new Error('Allotment not found');
      }

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + days);

      // Apply default allocation rule to initialize allotments
      const defaultRule = allotment.allocationRules.find(rule => rule.isActive);
      if (defaultRule) {
        await this.applyAllocationRule(allotmentId, defaultRule._id, {
          startDate,
          endDate
        });
      }

      return true;
    } catch (error) {
      throw new Error(`Failed to initialize allotments: ${error.message}`);
    }
  }

  /**
   * Calculate and apply allocation rules for a date range
   */
  async applyAllocationRule(allotmentId, ruleId, dateRange, userId = null) {
    try {
      const allotment = await RoomTypeAllotment.findById(allotmentId);
      if (!allotment) {
        throw new Error('Allotment not found');
      }

      const rule = allotment.allocationRules.find(r => r._id.toString() === ruleId && r.isActive);
      if (!rule) {
        throw new Error('Allocation rule not found or inactive');
      }

      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      let daysProcessed = 0;

      // Process each day in the range
      for (let currentDate = new Date(startDate); currentDate <= endDate; currentDate.setDate(currentDate.getDate() + 1)) {
        await this.calculateDayAllocation(allotment, rule, new Date(currentDate));
        daysProcessed++;
      }

      // Save the updated allotment
      await allotment.save();

      // Log the action
      if (userId) {
        await this.logAction(allotmentId, userId, 'allocated', {
          ruleId,
          dateRange,
          daysProcessed
        });
      }

      return { success: true, daysProcessed };
    } catch (error) {
      throw new Error(`Failed to apply allocation rule: ${error.message}`);
    }
  }

  /**
   * Calculate allocation for a specific date
   */
  async calculateDayAllocation(allotment, rule, date) {
    try {
      // Check if conditions match
      if (!this.checkRuleConditions(rule, date)) {
        return;
      }

      // Get existing allocation for the date
      let dailyAllotment = allotment.getAllotmentForDate(date);
      
      if (!dailyAllotment) {
        dailyAllotment = {
          date: new Date(date),
          totalInventory: allotment.defaultSettings.totalInventory,
          channelAllotments: [],
          freeStock: allotment.defaultSettings.totalInventory,
          totalSold: 0,
          occupancyRate: 0
        };
        allotment.dailyAllotments.push(dailyAllotment);
      }

      // Apply allocation based on rule type
      switch (rule.type) {
        case 'percentage':
          this.applyPercentageAllocation(allotment, dailyAllotment, rule);
          break;
        case 'fixed':
          this.applyFixedAllocation(allotment, dailyAllotment, rule);
          break;
        case 'priority':
          await this.applyPriorityAllocation(allotment, dailyAllotment, rule, date);
          break;
        case 'dynamic':
          await this.applyDynamicAllocation(allotment, dailyAllotment, rule, date);
          break;
      }

      // Update totals
      allotment.updateTotals(dailyAllotment);
      
    } catch (error) {
      throw new Error(`Failed to calculate day allocation: ${error.message}`);
    }
  }

  /**
   * Check if rule conditions match for a given date
   */
  checkRuleConditions(rule, date) {
    const conditions = rule.conditions;

    // Check date range
    if (conditions.dateRange) {
      if (conditions.dateRange.startDate && date < new Date(conditions.dateRange.startDate)) {
        return false;
      }
      if (conditions.dateRange.endDate && date > new Date(conditions.dateRange.endDate)) {
        return false;
      }
    }

    // Check days of week
    if (conditions.daysOfWeek && conditions.daysOfWeek.length > 0) {
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayOfWeek = dayNames[date.getDay()];
      if (!conditions.daysOfWeek.includes(dayOfWeek)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Apply percentage-based allocation
   */
  applyPercentageAllocation(allotment, dailyAllotment, rule) {
    const totalInventory = dailyAllotment.totalInventory;
    
    rule.allocation.percentage.forEach((percentage, channelId) => {
      const allocated = Math.floor((totalInventory * percentage) / 100);
      this.updateChannelAllocation(allotment, dailyAllotment, channelId, { allocated });
    });
  }

  /**
   * Apply fixed allocation
   */
  applyFixedAllocation(allotment, dailyAllotment, rule) {
    rule.allocation.fixed.forEach((amount, channelId) => {
      this.updateChannelAllocation(allotment, dailyAllotment, channelId, { allocated: amount });
    });
  }

  /**
   * Apply priority-based allocation
   */
  async applyPriorityAllocation(allotment, dailyAllotment, rule, date) {
    const totalInventory = dailyAllotment.totalInventory;
    const priorities = rule.allocation.priority.sort((a, b) => b.priority - a.priority);
    
    let remainingInventory = totalInventory;

    for (const priorityRule of priorities) {
      const { channelId, minAllocation, maxAllocation } = priorityRule;
      
      // Get channel performance metrics
      const performance = await this.getChannelPerformance(allotment._id, channelId, date);
      
      // Calculate allocation based on performance and priority
      let allocation = Math.min(
        maxAllocation || remainingInventory,
        Math.max(
          minAllocation || 0,
          Math.floor(remainingInventory * (performance.utilizationRate / 100))
        )
      );

      allocation = Math.min(allocation, remainingInventory);
      
      this.updateChannelAllocation(allotment, dailyAllotment, channelId, { allocated: allocation });
      remainingInventory -= allocation;

      if (remainingInventory <= 0) break;
    }
  }

  /**
   * Apply dynamic allocation based on demand forecasting
   */
  async applyDynamicAllocation(allotment, dailyAllotment, rule, date) {
    try {
      // Get historical data and forecasting
      const forecast = await this.getDemandForecast(allotment._id, date);
      const totalInventory = dailyAllotment.totalInventory;
      
      let remainingInventory = totalInventory;
      const allocations = {};

      // Allocate based on forecasted demand
      for (const channelId of allotment.channels.map(c => c.channelId)) {
        const channelForecast = forecast.channels.find(c => c.channelId === channelId);
        if (channelForecast) {
          const demandPercentage = channelForecast.demandScore / forecast.totalDemandScore;
          let allocation = Math.floor(totalInventory * demandPercentage);
          
          // Apply min/max constraints
          const channel = allotment.channels.find(c => c.channelId === channelId);
          if (channel && channel.restrictions) {
            allocation = Math.max(0, Math.min(allocation, remainingInventory));
          }

          allocations[channelId] = allocation;
          remainingInventory -= allocation;
        }
      }

      // Apply allocations
      Object.entries(allocations).forEach(([channelId, allocated]) => {
        this.updateChannelAllocation(allotment, dailyAllotment, channelId, { allocated });
      });

    } catch (error) {
      // Fallback to percentage allocation if dynamic fails
      console.warn(`Dynamic allocation failed, falling back to percentage: ${error.message}`);
      const fallbackRule = {
        type: 'percentage',
        allocation: {
          percentage: new Map([
            ['direct', 40],
            ['booking_com', 35],
            ['expedia', 25]
          ])
        }
      };
      this.applyPercentageAllocation(allotment, dailyAllotment, fallbackRule);
    }
  }

  /**
   * Update channel allocation within daily allotment
   */
  updateChannelAllocation(allotment, dailyAllotment, channelId, updates) {
    let channelAllocation = dailyAllotment.channelAllotments.find(c => c.channelId === channelId);
    
    if (!channelAllocation) {
      channelAllocation = {
        channelId,
        allocated: 0,
        sold: 0,
        available: 0,
        blocked: 0,
        overbooking: 0,
        lastUpdated: new Date()
      };
      dailyAllotment.channelAllotments.push(channelAllocation);
    }

    Object.assign(channelAllocation, updates);
    channelAllocation.available = channelAllocation.allocated - channelAllocation.sold - channelAllocation.blocked;
    channelAllocation.lastUpdated = new Date();
  }

  /**
   * Process booking and update allocations
   */
  async processBooking(bookingData) {
    try {
      const { hotelId, roomTypeId, checkIn, checkOut, channelId, rooms = 1 } = bookingData;

      const allotment = await RoomTypeAllotment.findOne({
        hotelId,
        roomTypeId,
        status: 'active'
      });

      if (!allotment) {
        throw new Error('No active allotment found for this room type');
      }

      // Update allocations for each night
      const startDate = new Date(checkIn);
      const endDate = new Date(checkOut);
      const nights = [];

      for (let date = new Date(startDate); date < endDate; date.setDate(date.getDate() + 1)) {
        const dailyAllotment = allotment.getAllotmentForDate(date);
        
        if (!dailyAllotment) {
          throw new Error(`No allocation found for date: ${date.toDateString()}`);
        }

        const channelAllocation = dailyAllotment.channelAllotments.find(c => c.channelId === channelId);
        
        if (!channelAllocation) {
          throw new Error(`No allocation found for channel: ${channelId}`);
        }

        if (channelAllocation.available < rooms) {
          // Check if overbooking is allowed
          if (!allotment.defaultSettings.overbookingAllowed) {
            throw new Error(`Insufficient inventory for ${date.toDateString()}. Available: ${channelAllocation.available}, Requested: ${rooms}`);
          }
          
          if (channelAllocation.overbooking + rooms > allotment.defaultSettings.overbookingLimit) {
            throw new Error(`Overbooking limit exceeded for ${date.toDateString()}`);
          }

          // Allow overbooking
          channelAllocation.overbooking += rooms;
        } else {
          channelAllocation.sold += rooms;
        }

        channelAllocation.available = channelAllocation.allocated - channelAllocation.sold - channelAllocation.blocked;
        channelAllocation.lastUpdated = new Date();
        
        allotment.updateTotals(dailyAllotment);
        nights.push(new Date(date));
      }

      await allotment.save();

      // Log the booking
      await this.logAction(allotment._id, null, 'booked', {
        channelId,
        rooms,
        nights: nights.length,
        dates: nights
      });

      return { success: true, message: 'Booking processed successfully' };

    } catch (error) {
      throw new Error(`Failed to process booking: ${error.message}`);
    }
  }

  /**
   * Release rooms (cancellation)
   */
  async releaseRooms(releaseData) {
    try {
      const { hotelId, roomTypeId, checkIn, checkOut, channelId, rooms = 1, userId } = releaseData;

      const allotment = await RoomTypeAllotment.findOne({
        hotelId,
        roomTypeId,
        status: 'active'
      });

      if (!allotment) {
        throw new Error('No active allotment found for this room type');
      }

      // Release rooms for each night
      const startDate = new Date(checkIn);
      const endDate = new Date(checkOut);
      const nights = [];

      for (let date = new Date(startDate); date < endDate; date.setDate(date.getDate() + 1)) {
        const dailyAllotment = allotment.getAllotmentForDate(date);
        
        if (dailyAllotment) {
          const channelAllocation = dailyAllotment.channelAllotments.find(c => c.channelId === channelId);
          
          if (channelAllocation) {
            // First release from overbooking, then from sold
            const overbookingToRelease = Math.min(channelAllocation.overbooking, rooms);
            const soldToRelease = Math.min(channelAllocation.sold, rooms - overbookingToRelease);

            channelAllocation.overbooking -= overbookingToRelease;
            channelAllocation.sold -= soldToRelease;
            channelAllocation.available = channelAllocation.allocated - channelAllocation.sold - channelAllocation.blocked;
            channelAllocation.lastUpdated = new Date();
            
            allotment.updateTotals(dailyAllotment);
            nights.push(new Date(date));
          }
        }
      }

      await allotment.save();

      // Log the release
      await this.logAction(allotment._id, userId, 'released', {
        channelId,
        rooms,
        nights: nights.length,
        dates: nights
      });

      return { success: true, message: 'Rooms released successfully' };

    } catch (error) {
      throw new Error(`Failed to release rooms: ${error.message}`);
    }
  }

  /**
   * Get channel performance metrics
   */
  async getChannelPerformance(allotmentId, channelId, referenceDate) {
    try {
      const allotment = await RoomTypeAllotment.findById(allotmentId);
      if (!allotment) {
        return { utilizationRate: 50, conversionRate: 20, averageRate: 100 }; // Default values
      }

      // Look for recent performance data
      const recentMetrics = allotment.performanceMetrics
        .flatMap(period => period.channelMetrics)
        .filter(metric => metric.channelId === channelId)
        .sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated))
        .slice(0, 3);

      if (recentMetrics.length > 0) {
        const avgUtilization = recentMetrics.reduce((sum, m) => sum + m.utilizationRate, 0) / recentMetrics.length;
        const avgConversion = recentMetrics.reduce((sum, m) => sum + m.conversionRate, 0) / recentMetrics.length;
        const avgRate = recentMetrics.reduce((sum, m) => sum + m.averageRate, 0) / recentMetrics.length;

        return {
          utilizationRate: avgUtilization,
          conversionRate: avgConversion,
          averageRate: avgRate
        };
      }

      // Fallback to historical data from daily allotments
      const historicalData = allotment.dailyAllotments
        .filter(day => new Date(day.date) < referenceDate)
        .slice(-30) // Last 30 days
        .map(day => day.channelAllotments.find(c => c.channelId === channelId))
        .filter(Boolean);

      if (historicalData.length > 0) {
        const avgUtilization = historicalData.reduce((sum, c) => {
          return sum + (c.allocated > 0 ? (c.sold / c.allocated) * 100 : 0);
        }, 0) / historicalData.length;

        return {
          utilizationRate: avgUtilization,
          conversionRate: Math.max(10, avgUtilization * 0.8), // Estimated
          averageRate: 100 // Default rate
        };
      }

      return { utilizationRate: 50, conversionRate: 20, averageRate: 100 };
    } catch (error) {
      return { utilizationRate: 50, conversionRate: 20, averageRate: 100 };
    }
  }

  /**
   * Get demand forecast for dynamic allocation
   */
  async getDemandForecast(allotmentId, date) {
    try {
      // This is a simplified forecast - in production, this would use ML models
      const allotment = await RoomTypeAllotment.findById(allotmentId);
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      // Base demand scores (higher = more demand)
      const baseDemand = {
        direct: isWeekend ? 60 : 40,
        booking_com: isWeekend ? 80 : 70,
        expedia: isWeekend ? 70 : 60,
        airbnb: isWeekend ? 90 : 50
      };

      // Adjust based on historical performance
      const channels = [];
      let totalDemandScore = 0;

      for (const channel of allotment.channels) {
        if (channel.isActive) {
          const performance = await this.getChannelPerformance(allotmentId, channel.channelId, date);
          const demandScore = baseDemand[channel.channelId] || 50;
          const adjustedScore = demandScore * (1 + (performance.utilizationRate - 50) / 100);
          
          channels.push({
            channelId: channel.channelId,
            demandScore: Math.max(10, adjustedScore)
          });
          
          totalDemandScore += adjustedScore;
        }
      }

      return { channels, totalDemandScore };
    } catch (error) {
      // Fallback forecast
      return {
        channels: [
          { channelId: 'direct', demandScore: 40 },
          { channelId: 'booking_com', demandScore: 35 },
          { channelId: 'expedia', demandScore: 25 }
        ],
        totalDemandScore: 100
      };
    }
  }

  /**
   * Generate performance analytics
   */
  async generateAnalytics(allotmentId, period) {
    try {
      const allotment = await RoomTypeAllotment.findById(allotmentId);
      if (!allotment) {
        throw new Error('Allotment not found');
      }

      const startDate = new Date(period.startDate);
      const endDate = new Date(period.endDate);

      // Get bookings data for the period
      const bookings = await Booking.find({
        hotelId: allotment.hotelId,
        roomTypeId: allotment.roomTypeId,
        checkIn: { $gte: startDate, $lte: endDate },
        status: { $in: ['confirmed', 'checked_in', 'checked_out'] }
      });

      // Calculate metrics by channel
      const channelMetrics = [];
      
      for (const channel of allotment.channels) {
        if (channel.isActive) {
          const channelBookings = bookings.filter(b => b.source === channel.channelId);
          const totalRevenue = channelBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
          const totalRooms = channelBookings.reduce((sum, b) => sum + (b.rooms || 1), 0);

          // Get allocated rooms for the period
          const periodAllotments = allotment.dailyAllotments.filter(day => {
            const dayDate = new Date(day.date);
            return dayDate >= startDate && dayDate <= endDate;
          });

          const totalAllocated = periodAllotments.reduce((sum, day) => {
            const channelAllotment = day.channelAllotments.find(c => c.channelId === channel.channelId);
            return sum + (channelAllotment ? channelAllotment.allocated : 0);
          }, 0);

          const totalSold = periodAllotments.reduce((sum, day) => {
            const channelAllotment = day.channelAllotments.find(c => c.channelId === channel.channelId);
            return sum + (channelAllotment ? channelAllotment.sold : 0);
          }, 0);

          channelMetrics.push({
            channelId: channel.channelId,
            totalAllocated,
            totalSold,
            totalRevenue,
            averageRate: totalRooms > 0 ? totalRevenue / totalRooms : 0,
            utilizationRate: totalAllocated > 0 ? (totalSold / totalAllocated) * 100 : 0,
            conversionRate: totalAllocated > 0 ? (channelBookings.length / totalAllocated) * 100 : 0,
            leadTime: this.calculateAverageLeadTime(channelBookings),
            cancellationRate: this.calculateCancellationRate(channel.channelId, startDate, endDate),
            noShowRate: this.calculateNoShowRate(channelBookings),
            revenuePerAvailableRoom: totalAllocated > 0 ? totalRevenue / totalAllocated : 0
          });
        }
      }

      // Calculate overall metrics
      const overallMetrics = {
        totalInventory: periodAllotments.reduce((sum, day) => sum + day.totalInventory, 0),
        totalSold: periodAllotments.reduce((sum, day) => sum + day.totalSold, 0),
        totalRevenue: bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0),
        averageOccupancyRate: periodAllotments.length > 0 ? 
          periodAllotments.reduce((sum, day) => sum + day.occupancyRate, 0) / periodAllotments.length : 0
      };

      overallMetrics.revenuePerAvailableRoom = overallMetrics.totalInventory > 0 ? 
        overallMetrics.totalRevenue / overallMetrics.totalInventory : 0;
      overallMetrics.averageDailyRate = overallMetrics.totalSold > 0 ? 
        overallMetrics.totalRevenue / overallMetrics.totalSold : 0;

      const performanceMetrics = {
        period: { startDate, endDate },
        channelMetrics,
        overallMetrics
      };

      // Add to allotment performance history
      allotment.addPerformanceMetrics(performanceMetrics);
      
      // Generate recommendations
      allotment.generateRecommendations();
      
      await allotment.save();

      return performanceMetrics;
    } catch (error) {
      throw new Error(`Failed to generate analytics: ${error.message}`);
    }
  }

  /**
   * Calculate average lead time for bookings
   */
  calculateAverageLeadTime(bookings) {
    if (bookings.length === 0) return 0;

    const leadTimes = bookings.map(booking => {
      const bookingDate = new Date(booking.createdAt);
      const checkInDate = new Date(booking.checkIn);
      const diffTime = Math.abs(checkInDate - bookingDate);
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Convert to days
    });

    return leadTimes.reduce((sum, time) => sum + time, 0) / leadTimes.length;
  }

  /**
   * Calculate cancellation rate for a channel
   */
  async calculateCancellationRate(channelId, startDate, endDate) {
    try {
      const totalBookings = await Booking.countDocuments({
        source: channelId,
        createdAt: { $gte: startDate, $lte: endDate }
      });

      const cancelledBookings = await Booking.countDocuments({
        source: channelId,
        status: 'cancelled',
        createdAt: { $gte: startDate, $lte: endDate }
      });

      return totalBookings > 0 ? (cancelledBookings / totalBookings) * 100 : 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Calculate no-show rate
   */
  calculateNoShowRate(bookings) {
    if (bookings.length === 0) return 0;

    const noShows = bookings.filter(booking => booking.status === 'no_show').length;
    return (noShows / bookings.length) * 100;
  }

  /**
   * Optimize allocations based on performance
   */
  async optimizeAllocations(allotmentId, userId) {
    try {
      const allotment = await RoomTypeAllotment.findById(allotmentId);
      if (!allotment) {
        throw new Error('Allotment not found');
      }

      // Generate current analytics
      const lastWeek = {
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate: new Date()
      };

      const analytics = await this.generateAnalytics(allotmentId, lastWeek);
      
      // Create optimized allocation rule based on performance
      const optimizedPercentages = new Map();
      let totalPercentage = 100;
      
      // Sort channels by revenue per available room
      const sortedChannels = analytics.channelMetrics
        .sort((a, b) => b.revenuePerAvailableRoom - a.revenuePerAvailableRoom);

      // Allocate higher percentages to better performing channels
      sortedChannels.forEach((channel, index) => {
        let percentage;
        
        if (index === 0) {
          percentage = Math.min(50, 30 + channel.utilizationRate * 0.2); // Top performer gets 30-50%
        } else if (index === 1) {
          percentage = Math.min(35, 25 + channel.utilizationRate * 0.1); // Second gets 25-35%
        } else {
          percentage = Math.max(15, totalPercentage / (sortedChannels.length - index)); // Others split remainder
        }

        optimizedPercentages.set(channel.channelId, Math.round(percentage));
        totalPercentage -= percentage;
      });

      // Create new optimized rule
      const optimizedRule = {
        name: `Optimized Allocation - ${new Date().toLocaleDateString()}`,
        type: 'percentage',
        isActive: false, // Don't activate automatically
        conditions: {
          dateRange: {
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Next 30 days
          }
        },
        allocation: {
          percentage: optimizedPercentages
        },
        fallbackRule: 'revenue_optimization'
      };

      allotment.allocationRules.push(optimizedRule);
      await allotment.save();

      // Log the optimization
      await this.logAction(allotmentId, userId, 'optimized', {
        ruleId: optimizedRule._id,
        optimizedPercentages: Object.fromEntries(optimizedPercentages)
      });

      return { success: true, optimizedRule };
    } catch (error) {
      throw new Error(`Failed to optimize allocations: ${error.message}`);
    }
  }

  /**
   * Log allotment actions for audit trail
   */
  async logAction(allotmentId, userId, action, details) {
    try {
      const allotment = await RoomTypeAllotment.findById(allotmentId);
      if (!allotment) return;

      // Add to allotment change log
      allotment.changeLog.push({
        userId,
        action,
        changes: details,
        timestamp: new Date()
      });

      await allotment.save();

      // Also log to global audit log if available
      if (AuditLog) {
        await AuditLog.create({
          entityType: 'RoomTypeAllotment',
          entityId: allotmentId,
          action,
          userId,
          changes: details,
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('Failed to log allotment action:', error.message);
    }
  }
}

export default new AllotmentService();