import Room from '../models/Room.js';
import Booking from '../models/Booking.js';
import TapeChart from '../models/TapeChart.js';
import mongoose from 'mongoose';

class AvailabilityService {
  /**
   * Check room availability for given dates and room type
   * @param {Date} checkInDate 
   * @param {Date} checkOutDate 
   * @param {String} roomType - optional
   * @param {Number} guestCount 
   * @param {String} hotelId 
   */
  async checkAvailability(checkInDate, checkOutDate, roomType = null, guestCount = 1, hotelId = null) {
    try {
      // Validate dates
      const checkIn = new Date(checkInDate);
      const checkOut = new Date(checkOutDate);
      
      if (checkIn >= checkOut) {
        throw new Error('Check-out date must be after check-in date');
      }

      if (checkIn < new Date().setHours(0, 0, 0, 0)) {
        throw new Error('Check-in date cannot be in the past');
      }

      // Get all rooms based on criteria
      const roomQuery = {
        isActive: true,
        status: { $ne: 'out_of_order' },
        capacity: { $gte: guestCount }
      };

      if (hotelId) {
        roomQuery.hotelId = hotelId;
      }

      if (roomType) {
        roomQuery.type = roomType;
      }

      const allRooms = await Room.find(roomQuery);

      // Get all bookings that overlap with the requested dates
      const overlappingBookings = await Booking.find({
        status: { $in: ['confirmed', 'checked_in'] },
        $or: [
          {
            checkIn: { $lt: checkOut },
            checkOut: { $gt: checkIn }
          }
        ]
      }).select('rooms checkIn checkOut');

      // Get blocked rooms from tape chart
      const blockedRooms = await TapeChart.find({
        date: {
          $gte: checkIn,
          $lt: checkOut
        },
        status: { $in: ['blocked', 'maintenance'] }
      }).select('roomId date');

      // Calculate available rooms
      const availableRooms = [];
      
      for (const room of allRooms) {
        const isAvailable = this.isRoomAvailable(
          room._id,
          checkIn,
          checkOut,
          overlappingBookings,
          blockedRooms
        );

        if (isAvailable) {
          availableRooms.push(room);
        }
      }

      return {
        available: availableRooms.length > 0,
        totalRooms: allRooms.length,
        availableRooms: availableRooms.length,
        rooms: availableRooms,
        checkIn,
        checkOut
      };

    } catch (error) {
      console.error('Error checking availability:', error);
      throw error;
    }
  }

  /**
   * Check if a specific room is available for given dates
   */
  isRoomAvailable(roomId, checkIn, checkOut, overlappingBookings, blockedRooms) {
    // Check if room is in any overlapping booking
    const isBooked = overlappingBookings.some(booking => 
      booking.rooms.some(room => 
        room.roomId.toString() === roomId.toString()
      )
    );

    if (isBooked) return false;

    // Check if room is blocked on any date in the range
    const isBlocked = blockedRooms.some(block => 
      block.roomId.toString() === roomId.toString() &&
      block.date >= checkIn && block.date < checkOut
    );

    return !isBlocked;
  }

  /**
   * Get availability calendar for a month
   */
  async getAvailabilityCalendar(year, month, roomType = null, hotelId = null) {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      
      const dailyAvailability = [];
      
      for (let day = 1; day <= endDate.getDate(); day++) {
        const currentDate = new Date(year, month - 1, day);
        const nextDate = new Date(year, month - 1, day + 1);
        
        const availability = await this.checkAvailability(
          currentDate,
          nextDate,
          roomType,
          1,
          hotelId
        );
        
        dailyAvailability.push({
          date: currentDate,
          available: availability.available,
          roomsAvailable: availability.availableRooms,
          totalRooms: availability.totalRooms
        });
      }
      
      return {
        year,
        month,
        availability: dailyAvailability
      };
    } catch (error) {
      console.error('Error getting availability calendar:', error);
      throw error;
    }
  }

  /**
   * Block rooms for maintenance or other reasons
   */
  async blockRooms(roomIds, startDate, endDate, reason = 'maintenance', userId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const blocks = [];
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      for (let date = new Date(start); date < end; date.setDate(date.getDate() + 1)) {
        for (const roomId of roomIds) {
          const block = await TapeChart.findOneAndUpdate(
            {
              roomId,
              date: new Date(date)
            },
            {
              roomId,
              date: new Date(date),
              status: 'blocked',
              blockReason: reason,
              blockedBy: userId,
              blockedAt: new Date()
            },
            {
              upsert: true,
              new: true,
              session
            }
          );
          blocks.push(block);
        }
      }

      await session.commitTransaction();
      return blocks;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Unblock rooms
   */
  async unblockRooms(roomIds, startDate, endDate) {
    try {
      const result = await TapeChart.deleteMany({
        roomId: { $in: roomIds },
        date: {
          $gte: new Date(startDate),
          $lt: new Date(endDate)
        },
        status: 'blocked'
      });

      return result;
    } catch (error) {
      console.error('Error unblocking rooms:', error);
      throw error;
    }
  }

  /**
   * Get room availability status for a specific date range
   */
  async getRoomAvailabilityStatus(roomId, startDate, endDate) {
    try {
      const bookings = await Booking.find({
        'rooms.roomId': roomId,
        status: { $in: ['confirmed', 'checked_in'] },
        $or: [
          {
            checkIn: { $lt: endDate },
            checkOut: { $gt: startDate }
          }
        ]
      }).select('checkIn checkOut status guestDetails');

      const blocks = await TapeChart.find({
        roomId,
        date: {
          $gte: startDate,
          $lt: endDate
        },
        status: 'blocked'
      }).select('date blockReason');

      return {
        roomId,
        bookings,
        blocks,
        startDate,
        endDate
      };
    } catch (error) {
      console.error('Error getting room availability status:', error);
      throw error;
    }
  }

  /**
   * Calculate occupancy rate for a date range
   */
  async calculateOccupancyRate(startDate, endDate, hotelId = null) {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

      const roomQuery = { isActive: true };
      if (hotelId) {
        roomQuery.hotelId = hotelId;
      }

      const totalRooms = await Room.countDocuments(roomQuery);
      const totalRoomNights = totalRooms * days;

      const bookings = await Booking.find({
        status: { $in: ['confirmed', 'checked_in', 'checked_out'] },
        checkIn: { $lt: end },
        checkOut: { $gt: start }
      });

      let occupiedRoomNights = 0;

      bookings.forEach(booking => {
        const bookingStart = booking.checkIn > start ? booking.checkIn : start;
        const bookingEnd = booking.checkOut < end ? booking.checkOut : end;
        const bookingDays = Math.ceil((bookingEnd - bookingStart) / (1000 * 60 * 60 * 24));
        occupiedRoomNights += booking.rooms.length * bookingDays;
      });

      const occupancyRate = totalRoomNights > 0 
        ? (occupiedRoomNights / totalRoomNights) * 100 
        : 0;

      return {
        startDate: start,
        endDate: end,
        totalRooms,
        totalRoomNights,
        occupiedRoomNights,
        occupancyRate: Math.round(occupancyRate * 100) / 100,
        averageDailyOccupancy: Math.round((occupiedRoomNights / days) * 100) / 100
      };
    } catch (error) {
      console.error('Error calculating occupancy rate:', error);
      throw error;
    }
  }

  /**
   * Find alternative available rooms when requested room is not available
   */
  async findAlternativeRooms(checkIn, checkOut, originalRoomType, guestCount = 1) {
    try {
      // Define room type upgrade path
      const upgradeMap = {
        'single': ['double', 'suite', 'deluxe'],
        'double': ['suite', 'deluxe'],
        'suite': ['deluxe'],
        'deluxe': []
      };

      const alternatives = [];
      const upgradePath = upgradeMap[originalRoomType] || [];

      for (const roomType of upgradePath) {
        const availability = await this.checkAvailability(
          checkIn,
          checkOut,
          roomType,
          guestCount
        );

        if (availability.available) {
          alternatives.push({
            roomType,
            availableRooms: availability.availableRooms,
            rooms: availability.rooms.slice(0, 3) // Return max 3 alternatives per type
          });
        }
      }

      return alternatives;
    } catch (error) {
      console.error('Error finding alternative rooms:', error);
      throw error;
    }
  }

  /**
   * Check and handle overbooking scenarios
   */
  async handleOverbooking(date, roomType = null) {
    try {
      const availability = await this.checkAvailability(
        date,
        new Date(date.getTime() + 24 * 60 * 60 * 1000),
        roomType
      );

      if (availability.availableRooms < 0) {
        // Overbooking detected
        return {
          isOverbooked: true,
          overbookingCount: Math.abs(availability.availableRooms),
          date,
          roomType,
          suggestions: await this.findAlternativeRooms(
            date,
            new Date(date.getTime() + 24 * 60 * 60 * 1000),
            roomType
          )
        };
      }

      return {
        isOverbooked: false,
        availableRooms: availability.availableRooms
      };
    } catch (error) {
      console.error('Error handling overbooking:', error);
      throw error;
    }
  }
}

export default new AvailabilityService();