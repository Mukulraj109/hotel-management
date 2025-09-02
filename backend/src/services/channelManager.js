import { Channel, InventorySync, ReservationMapping, RatePurityLog, ChannelPerformance } from '../models/ChannelManager.js';
import Room from '../models/Room.js';
import Booking from '../models/Booking.js';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

class ChannelManagerService {
  constructor() {
    this.connectors = {
      'booking.com': new BookingComConnector(),
      'expedia': new ExpediaConnector(),
      'airbnb': new AirbnbConnector(),
      'agoda': new AgodaConnector()
    };
  }

  /**
   * Sync rates and inventory to all active channels
   */
  async syncToAllChannels(roomTypeId, dateRange) {
    const activeChannels = await Channel.find({ 
      isActive: true, 
      connectionStatus: 'connected',
      'settings.autoSync': true 
    });

    const syncResults = [];

    for (const channel of activeChannels) {
      try {
        const result = await this.syncToChannel(channel._id, roomTypeId, dateRange);
        syncResults.push({
          channelId: channel._id,
          channelName: channel.name,
          status: 'success',
          result
        });
      } catch (error) {
        console.error(`Sync failed for channel ${channel.name}:`, error);
        syncResults.push({
          channelId: channel._id,
          channelName: channel.name,
          status: 'error',
          error: error.message
        });
      }
    }

    return syncResults;
  }

  /**
   * Sync to a specific channel
   */
  async syncToChannel(channelId, roomTypeId, dateRange) {
    const channel = await Channel.findById(channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    const connector = this.connectors[channel.category];
    if (!connector) {
      throw new Error(`No connector available for ${channel.category}`);
    }

    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    const syncPromises = [];

    // Iterate through each date in range
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const syncData = await this.prepareSyncData(channel, roomTypeId, new Date(date));
      syncPromises.push(this.executeSyncForDate(connector, channel, syncData));
    }

    const results = await Promise.allSettled(syncPromises);
    await this.updateChannelLastSync(channelId);

    return {
      totalDates: results.length,
      successful: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
      errors: results.filter(r => r.status === 'rejected').map(r => r.reason)
    };
  }

  /**
   * Prepare sync data for a specific date
   */
  async prepareSyncData(channel, roomTypeId, date) {
    // Get room availability
    const availability = await this.getRoomAvailability(roomTypeId, date);
    
    // Get rates
    const rates = await this.getRoomRates(roomTypeId, date);
    
    // Get restrictions
    const restrictions = await this.getRoomRestrictions(roomTypeId, date);
    
    // Find room mapping
    const roomMapping = channel.roomMappings.find(
      rm => rm.hotelRoomTypeId.toString() === roomTypeId.toString()
    );

    if (!roomMapping) {
      throw new Error(`Room mapping not found for room type ${roomTypeId}`);
    }

    return {
      channelRoomTypeId: roomMapping.channelRoomTypeId,
      date,
      inventory: availability,
      rates,
      restrictions,
      roomMapping
    };
  }

  /**
   * Execute sync for a specific date
   */
  async executeSyncForDate(connector, channel, syncData) {
    const syncRecord = new InventorySync({
      syncId: uuidv4(),
      channel: channel._id,
      roomType: syncData.roomMapping.hotelRoomTypeId,
      date: syncData.date,
      inventory: syncData.inventory,
      rates: syncData.rates,
      restrictions: syncData.restrictions,
      syncStatus: 'pending'
    });

    try {
      // Save sync record
      await syncRecord.save();

      // Execute sync via connector
      const result = await connector.syncRatesAndInventory({
        credentials: channel.credentials,
        roomTypeId: syncData.channelRoomTypeId,
        date: syncData.date,
        inventory: syncData.inventory,
        rates: syncData.rates,
        restrictions: syncData.restrictions
      });

      // Update sync record
      syncRecord.syncStatus = result.success ? 'success' : 'failed';
      syncRecord.errorMessage = result.error || null;
      syncRecord.lastSyncAttempt = new Date();
      await syncRecord.save();

      return result;
    } catch (error) {
      syncRecord.syncStatus = 'failed';
      syncRecord.errorMessage = error.message;
      syncRecord.syncAttempts += 1;
      syncRecord.lastSyncAttempt = new Date();
      await syncRecord.save();
      throw error;
    }
  }

  /**
   * Pull reservations from all channels
   */
  async pullReservationsFromAllChannels() {
    const activeChannels = await Channel.find({ 
      isActive: true, 
      connectionStatus: 'connected'
    });

    const reservationResults = [];

    for (const channel of activeChannels) {
      try {
        const reservations = await this.pullReservationsFromChannel(channel._id);
        reservationResults.push({
          channelId: channel._id,
          channelName: channel.name,
          reservationsCount: reservations.length,
          reservations
        });
      } catch (error) {
        console.error(`Failed to pull reservations from ${channel.name}:`, error);
        reservationResults.push({
          channelId: channel._id,
          channelName: channel.name,
          error: error.message
        });
      }
    }

    return reservationResults;
  }

  /**
   * Pull reservations from specific channel
   */
  async pullReservationsFromChannel(channelId) {
    const channel = await Channel.findById(channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    const connector = this.connectors[channel.category];
    if (!connector) {
      throw new Error(`No connector available for ${channel.category}`);
    }

    // Get reservations from last sync or last 24 hours
    const lastSync = channel.lastSync.reservations || new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const channelReservations = await connector.getReservations({
      credentials: channel.credentials,
      fromDate: lastSync,
      toDate: new Date()
    });

    const processedReservations = [];

    for (const reservation of channelReservations) {
      try {
        const hotelBooking = await this.createHotelBooking(reservation, channel);
        
        // Create reservation mapping
        await ReservationMapping.create({
          mappingId: uuidv4(),
          hotelReservationId: hotelBooking._id,
          channelReservationId: reservation.id,
          channel: channel._id,
          status: 'confirmed'
        });

        processedReservations.push({
          channelReservationId: reservation.id,
          hotelReservationId: hotelBooking._id,
          status: 'processed'
        });
      } catch (error) {
        console.error(`Failed to process reservation ${reservation.id}:`, error);
        processedReservations.push({
          channelReservationId: reservation.id,
          status: 'error',
          error: error.message
        });
      }
    }

    // Update last sync time
    await this.updateChannelLastSync(channelId, 'reservations');

    return processedReservations;
  }

  /**
   * Create hotel booking from channel reservation
   */
  async createHotelBooking(channelReservation, channel) {
    // Find room mapping
    const roomMapping = channel.roomMappings.find(
      rm => rm.channelRoomTypeId === channelReservation.roomTypeId
    );

    if (!roomMapping) {
      throw new Error(`Room mapping not found for channel room type ${channelReservation.roomTypeId}`);
    }

    // Find available room of the mapped type
    const availableRoom = await Room.findOne({
      roomType: roomMapping.hotelRoomTypeId,
      isActive: true
    });

    if (!availableRoom) {
      throw new Error(`No available room found for room type ${roomMapping.hotelRoomTypeId}`);
    }

    // Create booking
    const booking = new Booking({
      bookingId: uuidv4(),
      roomId: availableRoom._id,
      roomType: roomMapping.hotelRoomTypeId,
      checkInDate: new Date(channelReservation.checkIn),
      checkOutDate: new Date(channelReservation.checkOut),
      totalAmount: channelReservation.totalAmount,
      status: 'confirmed',
      channel: 'ota',
      channelName: channel.name,
      guest: {
        firstName: channelReservation.guest.firstName,
        lastName: channelReservation.guest.lastName,
        email: channelReservation.guest.email,
        phone: channelReservation.guest.phone
      },
      payment: {
        method: 'channel',
        status: 'paid',
        paidAmount: channelReservation.totalAmount
      },
      specialRequests: channelReservation.specialRequests || []
    });

    await booking.save();
    return booking;
  }

  /**
   * Monitor rate parity across channels
   */
  async monitorRateParity(roomTypeId, dateRange) {
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    const parityViolations = [];

    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const baseRate = await this.getRoomRates(roomTypeId, new Date(date));
      const channelRates = await this.getChannelRates(roomTypeId, new Date(date));
      
      const logEntry = {
        logId: uuidv4(),
        roomType: roomTypeId,
        date: new Date(date),
        baseRate: baseRate.baseRate,
        channelRates: [],
        violations: [],
        overallCompliance: true
      };

      for (const channelRate of channelRates) {
        const variance = ((channelRate.rate - baseRate.baseRate) / baseRate.baseRate) * 100;
        const isCompliant = Math.abs(variance) <= (channelRate.allowedVariance || 0);
        
        logEntry.channelRates.push({
          channel: channelRate.channelId,
          rate: channelRate.rate,
          variance,
          compliant: isCompliant
        });

        if (!isCompliant) {
          logEntry.violations.push({
            channel: channelRate.channelId,
            violationType: variance > 0 ? 'rate_too_high' : 'rate_too_low',
            expectedRate: baseRate.baseRate,
            actualRate: channelRate.rate,
            variance
          });
          logEntry.overallCompliance = false;
          parityViolations.push({
            date: new Date(date),
            channel: channelRate.channelName,
            violation: logEntry.violations[logEntry.violations.length - 1]
          });
        }
      }

      await RatePurityLog.create(logEntry);
    }

    return {
      totalDatesChecked: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1,
      violationsFound: parityViolations.length,
      violations: parityViolations
    };
  }

  /**
   * Get channel performance analytics
   */
  async getChannelPerformance(channelId, dateRange) {
    const performance = await ChannelPerformance.find({
      channel: channelId,
      date: {
        $gte: new Date(dateRange.startDate),
        $lte: new Date(dateRange.endDate)
      }
    }).populate('channel', 'name category');

    const summary = performance.reduce((acc, day) => {
      acc.totalBookings += day.metrics.bookings;
      acc.totalRevenue += day.metrics.revenue;
      acc.totalCommission += day.metrics.commission;
      acc.totalNetRevenue += day.metrics.netRevenue;
      acc.totalImpressions += day.metrics.impressions;
      acc.totalClicks += day.metrics.clicks;
      return acc;
    }, {
      totalBookings: 0,
      totalRevenue: 0,
      totalCommission: 0,
      totalNetRevenue: 0,
      totalImpressions: 0,
      totalClicks: 0
    });

    return {
      summary: {
        ...summary,
        averageRate: summary.totalBookings > 0 ? summary.totalRevenue / summary.totalBookings : 0,
        conversionRate: summary.totalImpressions > 0 ? (summary.totalBookings / summary.totalImpressions) * 100 : 0,
        clickThroughRate: summary.totalImpressions > 0 ? (summary.totalClicks / summary.totalImpressions) * 100 : 0
      },
      dailyData: performance
    };
  }

  /**
   * Prevent overbooking across channels
   */
  async preventOverbooking(roomTypeId, date) {
    // Get total rooms available
    const totalRooms = await Room.countDocuments({
      roomType: roomTypeId,
      isActive: true
    });

    // Get existing bookings
    const existingBookings = await Booking.countDocuments({
      roomType: roomTypeId,
      checkInDate: { $lte: date },
      checkOutDate: { $gt: date },
      status: { $in: ['confirmed', 'checked_in'] }
    });

    // Get pending sync inventory
    const pendingSyncs = await InventorySync.find({
      roomType: roomTypeId,
      date,
      syncStatus: 'pending'
    });

    const totalAllocated = pendingSyncs.reduce((sum, sync) => sum + sync.inventory.available, existingBookings);

    if (totalAllocated > totalRooms) {
      // Overbooking detected - adjust inventory across channels
      const adjustment = totalAllocated - totalRooms;
      await this.redistributeInventory(roomTypeId, date, adjustment);
      
      return {
        overbookingDetected: true,
        totalRooms,
        totalAllocated,
        adjustment
      };
    }

    return {
      overbookingDetected: false,
      totalRooms,
      totalAllocated
    };
  }

  // Helper methods
  async getRoomAvailability(roomTypeId, date) {
    const totalRooms = await Room.countDocuments({
      roomType: roomTypeId,
      isActive: true
    });

    const bookedRooms = await Booking.countDocuments({
      roomType: roomTypeId,
      checkInDate: { $lte: date },
      checkOutDate: { $gt: date },
      status: { $in: ['confirmed', 'checked_in'] }
    });

    return {
      available: Math.max(0, totalRooms - bookedRooms),
      sold: bookedRooms,
      blocked: 0,
      overbooking: 0
    };
  }

  async getRoomRates(roomTypeId, date) {
    // This would integrate with your rate management system
    // For now, returning default rates
    return {
      baseRate: 5000, // in paise/cents
      sellingRate: 5500,
      currency: 'INR'
    };
  }

  async getRoomRestrictions(roomTypeId, date) {
    // This would check for any restrictions
    return {
      closed: false,
      closeToArrival: false,
      closeToDeparture: false,
      minLengthOfStay: 1,
      maxLengthOfStay: 30
    };
  }

  async getChannelRates(roomTypeId, date) {
    // Mock implementation - would fetch from actual channels
    return [];
  }

  async redistributeInventory(roomTypeId, date, adjustment) {
    // Implementation for redistributing inventory when overbooking is detected
    const pendingSyncs = await InventorySync.find({
      roomType: roomTypeId,
      date,
      syncStatus: 'pending'
    }).populate('channel');

    // Distribute the reduction proportionally
    const totalAvailable = pendingSyncs.reduce((sum, sync) => sum + sync.inventory.available, 0);
    
    for (const sync of pendingSyncs) {
      const proportion = sync.inventory.available / totalAvailable;
      const reduction = Math.ceil(adjustment * proportion);
      sync.inventory.available = Math.max(0, sync.inventory.available - reduction);
      await sync.save();
    }
  }

  async updateChannelLastSync(channelId, type = 'all') {
    const updateData = {};
    const now = new Date();
    
    if (type === 'all' || type === 'rates') updateData['lastSync.rates'] = now;
    if (type === 'all' || type === 'inventory') updateData['lastSync.inventory'] = now;
    if (type === 'all' || type === 'restrictions') updateData['lastSync.restrictions'] = now;
    if (type === 'reservations') updateData['lastSync.reservations'] = now;

    await Channel.findByIdAndUpdate(channelId, updateData);
  }
}

// Channel Connector Base Class
class ChannelConnector {
  constructor() {
    this.baseUrl = '';
    this.timeout = 30000;
  }

  async syncRatesAndInventory(data) {
    throw new Error('syncRatesAndInventory must be implemented by connector');
  }

  async getReservations(data) {
    throw new Error('getReservations must be implemented by connector');
  }

  async makeRequest(method, endpoint, data = null, headers = {}) {
    try {
      const response = await axios({
        method,
        url: `${this.baseUrl}${endpoint}`,
        data,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        timeout: this.timeout
      });
      return response.data;
    } catch (error) {
      console.error(`API request failed: ${method} ${endpoint}`, error.message);
      throw error;
    }
  }
}

// Booking.com Connector
class BookingComConnector extends ChannelConnector {
  constructor() {
    super();
    this.baseUrl = 'https://supply-xml.booking.com';
  }

  async syncRatesAndInventory({ credentials, roomTypeId, date, inventory, rates, restrictions }) {
    try {
      const xmlData = this.buildInventoryXML({
        hotelId: credentials.hotelId,
        roomTypeId,
        date,
        inventory,
        rates,
        restrictions
      });

      const response = await this.makeRequest('POST', '/hotels/ota/OTA_HotelInvCountNotifRQ', xmlData, {
        'Content-Type': 'application/xml',
        'Authorization': `Basic ${Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64')}`
      });

      return { success: true, response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getReservations({ credentials, fromDate, toDate }) {
    // Implementation for pulling reservations from Booking.com
    return [];
  }

  buildInventoryXML({ hotelId, roomTypeId, date, inventory, rates, restrictions }) {
    // Build OTA XML for inventory update
    return `<?xml version="1.0" encoding="UTF-8"?>
      <OTA_HotelInvCountNotifRQ>
        <Inventories HotelCode="${hotelId}">
          <Inventory>
            <StatusApplicationControl RoomTypeCode="${roomTypeId}" Start="${date.toISOString().split('T')[0]}" End="${date.toISOString().split('T')[0]}"/>
            <InvCounts>
              <InvCount Count="${inventory.available}"/>
            </InvCounts>
          </Inventory>
        </Inventories>
      </OTA_HotelInvCountNotifRQ>`;
  }
}

// Expedia Connector
class ExpediaConnector extends ChannelConnector {
  constructor() {
    super();
    this.baseUrl = 'https://services.expediapartnercentral.com';
  }

  async syncRatesAndInventory({ credentials, roomTypeId, date, inventory, rates, restrictions }) {
    try {
      const data = {
        hotelId: credentials.hotelId,
        roomTypeId,
        date: date.toISOString().split('T')[0],
        availability: inventory.available,
        rate: rates.sellingRate,
        currency: rates.currency
      };

      const response = await this.makeRequest('POST', '/api/v1/inventory', data, {
        'Authorization': `Bearer ${credentials.apiKey}`
      });

      return { success: true, response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getReservations({ credentials, fromDate, toDate }) {
    // Implementation for pulling reservations from Expedia
    return [];
  }
}

// Airbnb Connector  
class AirbnbConnector extends ChannelConnector {
  constructor() {
    super();
    this.baseUrl = 'https://api.airbnb.com';
  }

  async syncRatesAndInventory({ credentials, roomTypeId, date, inventory, rates, restrictions }) {
    try {
      const data = {
        listing_id: credentials.listingId,
        date: date.toISOString().split('T')[0],
        available: inventory.available > 0,
        price: rates.sellingRate / 100 // Airbnb expects major currency units
      };

      const response = await this.makeRequest('PUT', '/v2/calendar_days', data, {
        'Authorization': `Bearer ${credentials.accessToken}`
      });

      return { success: true, response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getReservations({ credentials, fromDate, toDate }) {
    // Implementation for pulling reservations from Airbnb
    return [];
  }
}

// Agoda Connector
class AgodaConnector extends ChannelConnector {
  constructor() {
    super();
    this.baseUrl = 'https://affiliateservice7.agoda.com';
  }

  async syncRatesAndInventory({ credentials, roomTypeId, date, inventory, rates, restrictions }) {
    try {
      const data = {
        hotelId: credentials.hotelId,
        roomTypeId,
        date: date.toISOString().split('T')[0],
        availability: inventory.available,
        rate: rates.sellingRate
      };

      const response = await this.makeRequest('POST', '/webservice/UpdateInventory', data, {
        'X-API-Key': credentials.apiKey
      });

      return { success: true, response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getReservations({ credentials, fromDate, toDate }) {
    // Implementation for pulling reservations from Agoda
    return [];
  }
}

export default ChannelManagerService;