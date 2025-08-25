import axios from 'axios';
import crypto from 'crypto';
import { getRedisClient } from '../config/redis.js';
import logger from '../utils/logger.js';
import Room from '../models/Room.js';
import Hotel from '../models/Hotel.js';

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
      const response = await axios.post(`${this.baseURL}/oauth/token`, {
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret
      });

      return response.data.access_token;
    } catch (error) {
      logger.error('Booking.com authentication failed:', error.message);
      throw new Error('Authentication failed');
    }
  }

  async syncAvailability(hotelId) {
    const syncId = crypto.randomUUID();
    
    try {
      logger.info(`Starting Booking.com availability sync for hotel: ${hotelId}`);
      
      // Get hotel configuration
      const hotel = await Hotel.findById(hotelId);
      if (!hotel || !hotel.otaConnections.bookingCom.isEnabled) {
        throw new Error('Hotel not configured for Booking.com integration');
      }

      const bookingComHotelId = hotel.otaConnections.bookingCom.credentials.hotelId;
      
      // Store sync start status in Redis
      if (this.redis) {
        await this.redis.setex(`sync:${syncId}`, 3600, JSON.stringify({
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

      // Update sync status
      if (this.redis) {
        await this.redis.setex(`sync:${syncId}`, 3600, JSON.stringify({
          hotelId,
          status: 'completed',
          startedAt: new Date().toISOString(),
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
      
      // Update sync status to failed
      if (this.redis) {
        await this.redis.setex(`sync:${syncId}`, 3600, JSON.stringify({
          hotelId,
          status: 'failed',
          startedAt: new Date().toISOString(),
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
    if (!this.redis) {
      return {
        status: 'unknown',
        message: 'Redis not available for status tracking'
      };
    }

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