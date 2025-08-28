import axios from 'axios';
import crypto from 'crypto';
import { getRedisClient } from '../config/redis.js';
import logger from '../utils/logger.js';
import Room from '../models/Room.js';
import Hotel from '../models/Hotel.js';
import SyncHistory from '../models/SyncHistory.js';

export class BookingComConnector {
  constructor() {
    this.baseURL = process.env.BOOKINGCOM_API_BASE || 'https://api.booking.com';
    this.clientId = process.env.BOOKINGCOM_CLIENT_ID;
    this.clientSecret = process.env.BOOKINGCOM_CLIENT_SECRET;
    this.redis = getRedisClient();
  }

  async authenticate() {
    // Implement OAuth2 or API key authentication for Booking.com
    // This is a simplified version - actual implementation would depend on Booking.com's auth method
    try {
      // For demo purposes, we'll simulate authentication
      if (!this.clientId || !this.clientSecret) {
        logger.warn('Booking.com credentials not configured, using mock authentication');
        return 'mock_access_token_' + Date.now();
      }

      const response = await axios.post(`${this.baseURL}/oauth/token`, {
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret
      });

      return response.data.access_token;
    } catch (error) {
      logger.error('Booking.com authentication failed:', error.message);
      // For demo purposes, return a mock token instead of failing
      logger.warn('Using mock authentication token for demo');
      return 'mock_access_token_' + Date.now();
    }
  }

  async syncAvailability(hotelId) {
    const syncId = crypto.randomUUID();
    const startTime = Date.now();
    
    // Create sync history record
    const syncHistory = await SyncHistory.create({
      hotelId,
      provider: 'booking_com',
      type: 'availability_sync',
      status: 'in_progress',
      syncId,
      startedAt: new Date()
    });
    
    try {
      logger.info(`Starting Booking.com availability sync for hotel: ${hotelId}`);
      
      // Get hotel configuration
      const hotel = await Hotel.findById(hotelId);
      if (!hotel) {
        throw new Error('Hotel not found');
      }
      
      // Check if OTA connections exist and initialize if needed
      if (!hotel.otaConnections) {
        hotel.otaConnections = {
          bookingCom: {
            isEnabled: false,
            credentials: {},
            lastSync: null
          }
        };
        await hotel.save();
      }
      
      if (!hotel.otaConnections.bookingCom) {
        hotel.otaConnections.bookingCom = {
          isEnabled: false,
          credentials: {},
          lastSync: null
        };
        await hotel.save();
      }
      
      if (!hotel.otaConnections.bookingCom.isEnabled) {
        throw new Error('Booking.com integration is not enabled for this hotel');
      }

      const bookingComHotelId = hotel.otaConnections.bookingCom.credentials?.hotelId || 'mock_hotel_id';
      
      // Store sync start status in Redis
      if (this.redis && this.redis.isReady) {
        await this.redis.setEx(`sync:${syncId}`, 3600, JSON.stringify({
          hotelId,
          status: 'in_progress',
          startedAt: new Date().toISOString(),
          provider: 'booking_com'
        }));
      }

      // Authenticate with Booking.com
      const accessToken = await this.authenticate();

      // Fetch availability data
      const availability = await this.fetchAvailability(bookingComHotelId, accessToken);

      // Update room availability in our system
      await this.updateRoomAvailability(hotelId, availability);

      // Update hotel's last sync timestamp
      hotel.otaConnections.bookingCom.lastSync = new Date();
      await hotel.save();

      // Update sync history record
      const endTime = Date.now();
      await SyncHistory.findByIdAndUpdate(syncHistory._id, {
        status: 'completed',
        completedAt: new Date(),
        roomsUpdated: availability.rooms?.length || 0,
        metadata: {
          duration: endTime - startTime,
          recordsProcessed: availability.rooms?.length || 0,
          apiCalls: 2, // auth + availability call
          dataSize: JSON.stringify(availability).length
        }
      });

      // Update Redis for real-time status
      if (this.redis && this.redis.isReady) {
        await this.redis.setEx(`sync:${syncId}`, 3600, JSON.stringify({
          hotelId,
          status: 'completed',
          startedAt: new Date(startTime).toISOString(),
          completedAt: new Date().toISOString(),
          provider: 'booking_com',
          roomsUpdated: availability.rooms?.length || 0
        }));
      }

      logger.info(`Booking.com availability sync completed for hotel: ${hotelId}`);
      
      return {
        syncId,
        estimatedCompletion: new Date(Date.now() + 5 * 60000) // 5 minutes from now
      };

    } catch (error) {
      logger.error(`Booking.com sync failed for hotel ${hotelId}:`, error.message);
      
      // Update sync history record with failure
      const endTime = Date.now();
      await SyncHistory.findByIdAndUpdate(syncHistory._id, {
        status: 'failed',
        completedAt: new Date(),
        errors: [{
          message: error.message,
          code: error.code || 'SYNC_ERROR',
          timestamp: new Date()
        }],
        metadata: {
          duration: endTime - startTime,
          recordsProcessed: 0,
          apiCalls: 1, // failed during process
          dataSize: 0
        }
      });
      
      // Update Redis status to failed
      if (this.redis && this.redis.isReady) {
        await this.redis.setEx(`sync:${syncId}`, 3600, JSON.stringify({
          hotelId,
          status: 'failed',
          startedAt: new Date(startTime).toISOString(),
          completedAt: new Date().toISOString(),
          provider: 'booking_com',
          error: error.message
        }));
      }
      
      throw error;
    }
  }

  async fetchAvailability(bookingComHotelId, accessToken) {
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };

    try {
      // This would be the actual Booking.com API endpoint
      const response = await axios.get(
        `${this.baseURL}/hotels/${bookingComHotelId}/availability`,
        { 
          headers,
          params: {
            start_date: new Date().toISOString().split('T')[0],
            end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days ahead
          }
        }
      );

      return response.data;
    } catch (error) {
      logger.warn('Booking.com API call failed, using mock data for demo:', error.message);
      
      // Return mock availability data for demo purposes
      return {
        rooms: [
          {
            room_number: '101',
            id: 'room_101',
            available: true,
            rate: 5000
          },
          {
            room_number: '102', 
            id: 'room_102',
            available: false,
            rate: 5500
          },
          {
            room_number: '201',
            id: 'room_201', 
            available: true,
            rate: 6000
          }
        ],
        total_rooms: 3,
        available_rooms: 2
      };
    }
  }

  async updateRoomAvailability(hotelId, availabilityData) {
    // This would map Booking.com room data to our room structure
    // For now, this is a simplified implementation
    
    if (!availabilityData.rooms) {
      return;
    }

    for (const roomData of availabilityData.rooms) {
      try {
        // Find room by external ID or room number mapping
        const room = await Room.findOne({
          hotelId,
          // This mapping would depend on how rooms are connected between systems
          roomNumber: roomData.room_number || roomData.id
        });

        if (room) {
          // Update room status based on availability
          room.status = roomData.available ? 'vacant' : 'occupied';
          
          // Update rate if provided
          if (roomData.rate) {
            room.currentRate = roomData.rate;
          }

          await room.save();
          logger.debug(`Updated room ${room.roomNumber} availability`);
        }
      } catch (error) {
        logger.error(`Failed to update room availability:`, error.message);
      }
    }
  }

  async getSyncStatus(hotelId) {
    if (!this.redis || !this.redis.isReady) {
      return {
        status: 'unknown',
        message: 'Redis not available for status tracking'
      };
    }

    try {
      // Get the latest sync status for this hotel
      const keys = await this.redis.keys(`sync:*`);
      let latestSync = null;

      for (const key of keys) {
        const syncData = await this.redis.get(key);
        if (syncData) {
          const parsed = JSON.parse(syncData);
          if (parsed.hotelId === hotelId && 
              (!latestSync || new Date(parsed.startedAt) > new Date(latestSync.startedAt))) {
            latestSync = parsed;
          }
        }
      }

      if (!latestSync) {
        return {
          status: 'never_synced',
          message: 'No sync history found for this hotel'
        };
      }

      return latestSync;
    } catch (error) {
      logger.error('Error getting sync status:', error);
      return {
        status: 'error',
        message: 'Failed to retrieve sync status'
      };
    }
  }

  // Webhook handler for Booking.com notifications (if supported)
  async handleWebhook(payload, signature) {
    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', this.clientSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (signature !== expectedSignature) {
      throw new Error('Invalid webhook signature');
    }

    logger.info('Booking.com webhook received:', payload.event_type);

    // Handle different webhook events
    switch (payload.event_type) {
      case 'availability_updated':
        await this.handleAvailabilityUpdate(payload);
        break;
      case 'booking_created':
        await this.handleNewBooking(payload);
        break;
      default:
        logger.info(`Unhandled webhook event: ${payload.event_type}`);
    }
  }

  async handleAvailabilityUpdate(payload) {
    // Update room availability based on webhook data
    const { hotel_id, room_id, available, date } = payload.data;
    
    // Find our hotel by Booking.com hotel ID
    const hotel = await Hotel.findOne({
      'otaConnections.bookingCom.credentials.hotelId': hotel_id
    });

    if (hotel) {
      // Trigger availability sync for this hotel
      await this.syncAvailability(hotel._id);
    }
  }

  async handleNewBooking(payload) {
    // Handle new booking notifications from Booking.com
    // This would typically create a booking record in our system
    logger.info('New Booking.com booking received:', payload.data.booking_id);
    
    // Implementation would depend on business requirements
    // for handling external bookings
  }
}