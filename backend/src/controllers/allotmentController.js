import RoomTypeAllotment from '../models/RoomTypeAllotment.js';
import allotmentService from '../services/allotmentService.js';
import { validationResult } from 'express-validator';

const allotmentController = {
  /**
   * Create a new room type allotment configuration
   */
  async createAllotment(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const allotmentData = {
        ...req.body,
        hotelId: req.user.hotelId
      };

      const allotment = await allotmentService.createAllotment(allotmentData, req.user.id);

      res.status(201).json({
        success: true,
        data: allotment,
        message: 'Room type allotment created successfully'
      });
    } catch (error) {
      console.error('Error creating allotment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create allotment',
        message: error.message
      });
    }
  },

  /**
   * Get all allotments for a hotel
   */
  async getAllotments(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        status, 
        roomTypeId,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const filter = { hotelId: req.user.hotelId };
      
      if (status && status !== 'all') {
        filter.status = status;
      }
      
      if (roomTypeId) {
        filter.roomTypeId = roomTypeId;
      }
      
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      const skip = (page - 1) * limit;
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const allotments = await RoomTypeAllotment.find(filter)
        .populate('roomTypeId', 'name code maxOccupancy baseRate')
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit));

      const total = await RoomTypeAllotment.countDocuments(filter);

      res.json({
        success: true,
        data: {
          allotments,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / limit),
            total,
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Error fetching allotments:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch allotments',
        message: error.message
      });
    }
  },

  /**
   * Get a specific allotment by ID
   */
  async getAllotment(req, res) {
    try {
      const { id } = req.params;
      const allotment = await RoomTypeAllotment.findOne({
        _id: id,
        hotelId: req.user.hotelId
      })
      .populate('roomTypeId', 'name code maxOccupancy baseRate')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

      if (!allotment) {
        return res.status(404).json({
          success: false,
          error: 'Allotment not found'
        });
      }

      res.json({
        success: true,
        data: allotment
      });
    } catch (error) {
      console.error('Error fetching allotment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch allotment',
        message: error.message
      });
    }
  },

  /**
   * Get a specific allotment by ID
   */
  async getAllotment(req, res) {
    try {
      const { id } = req.params;
      const allotment = await RoomTypeAllotment.findOne({
        _id: id,
        hotelId: req.user.hotelId
      })
      .populate('roomTypeId', 'name code maxOccupancy baseRate')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

      if (!allotment) {
        return res.status(404).json({
          success: false,
          error: 'Allotment not found'
        });
      }

      res.json({
        success: true,
        data: allotment
      });
    } catch (error) {
      console.error('Error fetching allotment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch allotment',
        message: error.message
      });
    }
  },

  /**
   * Update an allotment configuration
   */
  async updateAllotment(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { id } = req.params;
      const updateData = {
        ...req.body,
        updatedBy: req.user.id,
        updatedAt: new Date()
      };

      const allotment = await RoomTypeAllotment.findOneAndUpdate(
        { _id: id, hotelId: req.user.hotelId },
        updateData,
        { new: true, runValidators: true }
      );

      if (!allotment) {
        return res.status(404).json({
          success: false,
          error: 'Allotment not found'
        });
      }

      // Log the update
      await allotmentService.logAction(id, req.user.id, 'updated', { changes: updateData });

      res.json({
        success: true,
        data: allotment,
        message: 'Allotment updated successfully'
      });
    } catch (error) {
      console.error('Error updating allotment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update allotment',
        message: error.message
      });
    }
  },

  /**
   * Delete an allotment configuration
   */
  async deleteAllotment(req, res) {
    try {
      const { id } = req.params;
      const allotment = await RoomTypeAllotment.findOneAndUpdate(
        { _id: id, hotelId: req.user.hotelId },
        { status: 'inactive', updatedBy: req.user.id },
        { new: true }
      );

      if (!allotment) {
        return res.status(404).json({
          success: false,
          error: 'Allotment not found'
        });
      }

      // Log the deletion
      await allotmentService.logAction(id, req.user.id, 'deleted', { previousStatus: allotment.status });

      res.json({
        success: true,
        message: 'Allotment deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting allotment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete allotment',
        message: error.message
      });
    }
  },

  /**
   * Get allotments for a specific date range
   */
  async getAllotmentsByDateRange(req, res) {
    try {
      const { startDate, endDate, roomTypeId } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: 'Start date and end date are required'
        });
      }

      const filter = { hotelId: req.user.hotelId, status: 'active' };
      if (roomTypeId) {
        filter.roomTypeId = roomTypeId;
      }

      const allotments = await RoomTypeAllotment.find(filter)
        .populate('roomTypeId', 'name code')
        .lean();

      // Filter and format daily allotments for the date range
      const start = new Date(startDate);
      const end = new Date(endDate);

      const result = allotments.map(allotment => ({
        ...allotment,
        dailyAllotments: allotment.dailyAllotments.filter(day => {
          const dayDate = new Date(day.date);
          return dayDate >= start && dayDate <= end;
        }).sort((a, b) => new Date(a.date) - new Date(b.date))
      }));

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error fetching allotments by date range:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch allotments',
        message: error.message
      });
    }
  },

  /**
   * Apply allocation rule to a date range
   */
  async applyAllocationRule(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { id } = req.params;
      const { ruleId, startDate, endDate } = req.body;

      // Verify allotment belongs to user's hotel
      const allotment = await RoomTypeAllotment.findOne({
        _id: id,
        hotelId: req.user.hotelId
      });

      if (!allotment) {
        return res.status(404).json({
          success: false,
          error: 'Allotment not found'
        });
      }

      const result = await allotmentService.applyAllocationRule(
        id, 
        ruleId, 
        { startDate, endDate }, 
        req.user.id
      );

      res.json({
        success: true,
        data: result,
        message: `Allocation rule applied to ${result.daysProcessed} days`
      });
    } catch (error) {
      console.error('Error applying allocation rule:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to apply allocation rule',
        message: error.message
      });
    }
  },

  /**
   * Update channel allocation for a specific date
   */
  async updateChannelAllocation(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { id } = req.params;
      const { channelId, date, allocated, sold, blocked } = req.body;

      const allotment = await RoomTypeAllotment.findOne({
        _id: id,
        hotelId: req.user.hotelId
      });

      if (!allotment) {
        return res.status(404).json({
          success: false,
          error: 'Allotment not found'
        });
      }

      // Update the allocation
      const allocation = {};
      if (allocated !== undefined) allocation.allocated = allocated;
      if (sold !== undefined) allocation.sold = sold;
      if (blocked !== undefined) allocation.blocked = blocked;

      allotment.updateChannelAllocation(channelId, date, allocation);
      await allotment.save();

      // Log the update
      await allotmentService.logAction(id, req.user.id, 'updated', {
        channelId,
        date,
        allocation
      });

      res.json({
        success: true,
        message: 'Channel allocation updated successfully',
        data: allotment.getAllotmentForDate(date)
      });
    } catch (error) {
      console.error('Error updating channel allocation:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update channel allocation',
        message: error.message
      });
    }
  },

  /**
   * Process a booking (allocate rooms)
   */
  async processBooking(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const bookingData = {
        ...req.body,
        hotelId: req.user.hotelId
      };

      const result = await allotmentService.processBooking(bookingData);

      res.json({
        success: true,
        data: result,
        message: 'Booking processed successfully'
      });
    } catch (error) {
      console.error('Error processing booking:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process booking',
        message: error.message
      });
    }
  },

  /**
   * Release rooms (cancellation)
   */
  async releaseRooms(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const releaseData = {
        ...req.body,
        hotelId: req.user.hotelId,
        userId: req.user.id
      };

      const result = await allotmentService.releaseRooms(releaseData);

      res.json({
        success: true,
        data: result,
        message: 'Rooms released successfully'
      });
    } catch (error) {
      console.error('Error releasing rooms:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to release rooms',
        message: error.message
      });
    }
  },

  /**
   * Get analytics for an allotment
   */
  async getAnalytics(req, res) {
    try {
      const { id } = req.params;
      const { 
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate = new Date().toISOString(),
        groupBy = 'day'
      } = req.query;

      // Verify allotment belongs to user's hotel
      const allotment = await RoomTypeAllotment.findOne({
        _id: id,
        hotelId: req.user.hotelId
      });

      if (!allotment) {
        return res.status(404).json({
          success: false,
          error: 'Allotment not found'
        });
      }

      const analytics = await allotmentService.generateAnalytics(id, {
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      });

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch analytics',
        message: error.message
      });
    }
  },

  /**
   * Get channel performance summary
   */
  async getChannelPerformance(req, res) {
    try {
      const { id } = req.params;
      const { 
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        endDate = new Date().toISOString()
      } = req.query;

      const allotment = await RoomTypeAllotment.findOne({
        _id: id,
        hotelId: req.user.hotelId
      });

      if (!allotment) {
        return res.status(404).json({
          success: false,
          error: 'Allotment not found'
        });
      }

      // Get performance data for each channel
      const channelPerformance = [];
      
      for (const channel of allotment.channels) {
        if (channel.isActive) {
          const performance = await allotmentService.getChannelPerformance(
            id, 
            channel.channelId, 
            new Date(endDate)
          );

          channelPerformance.push({
            channelId: channel.channelId,
            channelName: channel.channelName,
            priority: channel.priority,
            commission: channel.commission,
            isActive: channel.isActive,
            performance
          });
        }
      }

      res.json({
        success: true,
        data: {
          period: { startDate, endDate },
          channels: channelPerformance
        }
      });
    } catch (error) {
      console.error('Error fetching channel performance:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch channel performance',
        message: error.message
      });
    }
  },

  /**
   * Optimize allocations based on performance
   */
  async optimizeAllocations(req, res) {
    try {
      const { id } = req.params;

      // Verify allotment belongs to user's hotel
      const allotment = await RoomTypeAllotment.findOne({
        _id: id,
        hotelId: req.user.hotelId
      });

      if (!allotment) {
        return res.status(404).json({
          success: false,
          error: 'Allotment not found'
        });
      }

      const result = await allotmentService.optimizeAllocations(id, req.user.id);

      res.json({
        success: true,
        data: result,
        message: 'Allocations optimized successfully'
      });
    } catch (error) {
      console.error('Error optimizing allocations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to optimize allocations',
        message: error.message
      });
    }
  },

  /**
   * Get availability for a date range and room type
   */
  async getAvailability(req, res) {
    try {
      const { roomTypeId, startDate, endDate, channelId } = req.query;

      if (!roomTypeId || !startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: 'Room type ID, start date, and end date are required'
        });
      }

      const allotment = await RoomTypeAllotment.findOne({
        hotelId: req.user.hotelId,
        roomTypeId,
        status: 'active'
      });

      if (!allotment) {
        return res.status(404).json({
          success: false,
          error: 'No active allotment found for this room type'
        });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      const availability = [];

      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        const dailyAllotment = allotment.getAllotmentForDate(date);
        
        if (dailyAllotment) {
          const dateAvailability = {
            date: new Date(date),
            totalInventory: dailyAllotment.totalInventory,
            totalSold: dailyAllotment.totalSold,
            freeStock: dailyAllotment.freeStock,
            occupancyRate: dailyAllotment.occupancyRate,
            channels: dailyAllotment.channelAllotments.map(channel => ({
              channelId: channel.channelId,
              allocated: channel.allocated,
              sold: channel.sold,
              available: channel.available,
              blocked: channel.blocked
            }))
          };

          // If specific channel requested, filter
          if (channelId) {
            const channelData = dailyAllotment.channelAllotments.find(c => c.channelId === channelId);
            if (channelData) {
              dateAvailability.channelAvailable = channelData.available;
            } else {
              dateAvailability.channelAvailable = 0;
            }
          }

          availability.push(dateAvailability);
        } else {
          availability.push({
            date: new Date(date),
            totalInventory: allotment.defaultSettings.totalInventory,
            totalSold: 0,
            freeStock: allotment.defaultSettings.totalInventory,
            occupancyRate: 0,
            channels: [],
            channelAvailable: channelId ? 0 : undefined
          });
        }
      }

      res.json({
        success: true,
        data: {
          roomTypeId,
          period: { startDate, endDate },
          channelId: channelId || 'all',
          availability
        }
      });
    } catch (error) {
      console.error('Error fetching availability:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch availability',
        message: error.message
      });
    }
  },

  /**
   * Get allotment recommendations
   */
  async getRecommendations(req, res) {
    try {
      const { id } = req.params;

      const allotment = await RoomTypeAllotment.findOne({
        _id: id,
        hotelId: req.user.hotelId
      });

      if (!allotment) {
        return res.status(404).json({
          success: false,
          error: 'Allotment not found'
        });
      }

      // Generate fresh recommendations
      allotment.generateRecommendations();
      await allotment.save();

      res.json({
        success: true,
        data: {
          recommendations: allotment.analytics.recommendations,
          lastUpdated: new Date(),
          totalRecommendations: allotment.analytics.recommendations.length
        }
      });
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch recommendations',
        message: error.message
      });
    }
  },

  /**
   * Export allotment data
   */
  async exportAllotment(req, res) {
    try {
      const { id } = req.params;
      const { format = 'json', startDate, endDate } = req.query;

      const allotment = await RoomTypeAllotment.findOne({
        _id: id,
        hotelId: req.user.hotelId
      })
      .populate('roomTypeId', 'name code')
      .lean();

      if (!allotment) {
        return res.status(404).json({
          success: false,
          error: 'Allotment not found'
        });
      }

      // Filter by date range if provided
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        allotment.dailyAllotments = allotment.dailyAllotments.filter(day => {
          const dayDate = new Date(day.date);
          return dayDate >= start && dayDate <= end;
        });
      }

      let exportData;
      let contentType;
      let filename;

      switch (format) {
        case 'csv':
          exportData = this.convertToCSV(allotment);
          contentType = 'text/csv';
          filename = `allotment-${allotment.name}-${new Date().toISOString().split('T')[0]}.csv`;
          break;
        case 'json':
        default:
          exportData = JSON.stringify(allotment, null, 2);
          contentType = 'application/json';
          filename = `allotment-${allotment.name}-${new Date().toISOString().split('T')[0]}.json`;
          break;
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(exportData);
    } catch (error) {
      console.error('Error exporting allotment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export allotment',
        message: error.message
      });
    }
  },

  /**
   * Convert allotment data to CSV format
   */
  convertToCSV(allotment) {
    const headers = [
      'Date',
      'Total Inventory',
      'Total Sold',
      'Free Stock',
      'Occupancy Rate',
      'Channel',
      'Allocated',
      'Sold',
      'Available',
      'Blocked'
    ];

    const rows = [];
    
    allotment.dailyAllotments.forEach(day => {
      day.channelAllotments.forEach(channel => {
        rows.push([
          new Date(day.date).toISOString().split('T')[0],
          day.totalInventory,
          day.totalSold,
          day.freeStock,
          `${day.occupancyRate}%`,
          channel.channelId,
          channel.allocated,
          channel.sold,
          channel.available,
          channel.blocked
        ]);
      });
    });

    return [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
  },

  /**
   * Get allotment summary dashboard data
   */
  async getDashboard(req, res) {
    try {
      console.log('🔍 getDashboard called, user:', req.user ? 'exists' : 'missing');
      
      const hotelId = req.user.hotelId;
      if (!hotelId) {
        console.log('❌ No hotelId found in user');
        return res.status(400).json({
          success: false,
          error: 'Hotel ID not found'
        });
      }

      console.log('🏨 Using hotelId:', hotelId);

      // Get all allotments for the hotel
      const allotments = await RoomTypeAllotment.find({ hotelId })
        .populate('roomTypeId', 'name code baseRate')
        .lean();

      console.log('📊 Found allotments:', allotments.length);

      // Calculate dashboard metrics
      const totalAllotments = allotments.length;
      
      // Get unique room types
      const uniqueRoomTypes = new Set(allotments.map(a => a.roomTypeId?._id?.toString()));
      const totalRoomTypes = uniqueRoomTypes.size;

      // Get unique channels from the allotment channels array
      const uniqueChannels = new Set();
      allotments.forEach(allotment => {
        console.log('🔍 Processing allotment channels:', allotment.channels?.length || 0);
        if (allotment.channels) {
          allotment.channels.forEach(channel => {
            console.log('📍 Adding channel:', channel.channelId);
            uniqueChannels.add(channel.channelId);
          });
        }
      });
      const totalChannels = uniqueChannels.size;
      console.log('📊 Total unique channels found:', totalChannels, 'Channels:', Array.from(uniqueChannels));

      // Calculate occupancy and revenue from analytics data
      let totalOccupancy = 0;
      let totalRevenue = 0;
      let channelPerformance = {};
      let occupancyCount = 0;

      allotments.forEach(allotment => {
        // Use analytics data for metrics
        if (allotment.analytics?.metrics?.totalRevenue) {
          totalRevenue += allotment.analytics.metrics.totalRevenue;
        }

        if (allotment.analytics?.metrics?.averageOccupancy) {
          totalOccupancy += allotment.analytics.metrics.averageOccupancy;
          occupancyCount++;
        }

        // Process channel performance from analytics
        if (allotment.analytics?.metrics?.channelPerformance) {
          allotment.analytics.metrics.channelPerformance.forEach(channel => {
            if (!channelPerformance[channel.channelId]) {
              channelPerformance[channel.channelId] = {
                channelId: channel.channelId,
                channelName: channel.channelId.replace('_', '.'),
                totalSold: 0,
                totalRevenue: 0,
                totalAllocated: 0
              };
            }
            channelPerformance[channel.channelId].totalSold += channel.bookings || 0;
            channelPerformance[channel.channelId].totalRevenue += channel.revenue || 0;
          });
        }

        // Also check channels array for performance data and daily allocations
        if (allotment.channels) {
          allotment.channels.forEach(channel => {
            if (!channelPerformance[channel.channelId]) {
              channelPerformance[channel.channelId] = {
                channelId: channel.channelId,
                channelName: channel.channelName || channel.channelId.replace('_', '.'),
                totalSold: 0,
                totalRevenue: 0,
                totalAllocated: 0
              };
            }
          });
        }

        // Extract data from dailyAllotments if available
        if (allotment.dailyAllotments && allotment.dailyAllotments.length > 0) {
          allotment.dailyAllotments.forEach(dailyAllotment => {
            if (dailyAllotment.channelAllotments) {
              dailyAllotment.channelAllotments.forEach(channelData => {
                if (!channelPerformance[channelData.channelId]) {
                  channelPerformance[channelData.channelId] = {
                    channelId: channelData.channelId,
                    channelName: channelData.channelName || channelData.channelId.replace('_', '.'),
                    totalSold: 0,
                    totalRevenue: 0,
                    totalAllocated: 0
                  };
                }
              
                // Add up the metrics
                channelPerformance[channelData.channelId].totalSold += channelData.sold || 0;
                channelPerformance[channelData.channelId].totalAllocated += channelData.allocated || 0;
                if (channelData.rate) {
                  channelPerformance[channelData.channelId].totalRevenue += (channelData.sold || 0) * channelData.rate;
                }
              });
            }
          });
        }
      });

      const averageOccupancyRate = occupancyCount > 0 ? totalOccupancy / occupancyCount : 0;

      // Calculate utilizationRate for all channels and find top performing channel
      const channelList = Object.values(channelPerformance).map(channel => ({
        ...channel,
        utilizationRate: channel.totalAllocated > 0 ? (channel.totalSold / channel.totalAllocated) * 100 : 0
      }));
      
      const topPerformingChannel = channelList.length > 0 
        ? channelList.reduce((top, channel) => 
            channel.totalRevenue > (top?.totalRevenue || 0) ? channel : top
          ) 
        : null;

      // Find low utilization channels (less than 50% occupancy)
      const lowUtilizationChannels = channelList.filter(channel => {
        return channel.utilizationRate < 50 && channel.totalAllocated > 0;
      });

      const dashboardData = {
        totalAllotments,
        totalRoomTypes,
        totalChannels,
        averageOccupancyRate: Math.round(averageOccupancyRate * 100) / 100,
        totalRevenue,
        topPerformingChannel,
        lowUtilizationChannels: lowUtilizationChannels.slice(0, 5), // Limit to 5
        recentRecommendations: [] // Could be populated with AI recommendations
      };
      
      console.log('✅ Returning real dashboard data:', dashboardData);
      
      res.json({
        success: true,
        data: dashboardData
      });
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard data',
        message: error.message
      });
    }
  }
};

export default allotmentController;