import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { AppError } from '../utils/appError.js';
import { catchAsync } from '../utils/catchAsync.js';
import { BookingComConnector } from '../services/bookingComConnector.js';

const router = express.Router();

// Manual sync trigger for Booking.com
router.post('/bookingcom/sync', 
  authenticate, 
  authorize('admin'), 
  catchAsync(async (req, res) => {
    const { hotelId } = req.body;
    
    if (!hotelId) {
      throw new AppError('Hotel ID is required', 400);
    }

    try {
      const connector = new BookingComConnector();
      const result = await connector.syncAvailability(hotelId);

      res.json({
        status: 'success',
        data: {
          message: 'Sync initiated successfully',
          syncId: result.syncId,
          estimatedCompletion: result.estimatedCompletion
        }
      });
    } catch (error) {
      throw new AppError(`Sync failed: ${error.message}`, 500);
    }
  })
);

// Get Booking.com sync status
router.get('/bookingcom/status/:hotelId', 
  authenticate, 
  authorize('admin', 'staff'), 
  catchAsync(async (req, res) => {
    const { hotelId } = req.params;

    try {
      const connector = new BookingComConnector();
      const status = await connector.getSyncStatus(hotelId);

      res.json({
        status: 'success',
        data: status
      });
    } catch (error) {
      throw new AppError(`Failed to get sync status: ${error.message}`, 500);
    }
  })
);

// Get OTA sync history
router.get('/sync-history', 
  authenticate, 
  authorize('admin', 'staff'), 
  catchAsync(async (req, res) => {
    const { hotelId, page = 1, limit = 10 } = req.query;

    // This would typically come from a sync history collection
    // For now, return mock data
    const history = [
      {
        id: '1',
        hotelId,
        provider: 'booking_com',
        type: 'availability_sync',
        status: 'completed',
        startedAt: new Date(Date.now() - 3600000),
        completedAt: new Date(Date.now() - 3300000),
        roomsUpdated: 25,
        errors: []
      },
      {
        id: '2',
        hotelId,
        provider: 'booking_com',
        type: 'availability_sync',
        status: 'failed',
        startedAt: new Date(Date.now() - 7200000),
        completedAt: new Date(Date.now() - 7100000),
        roomsUpdated: 0,
        errors: ['Authentication failed']
      }
    ];

    res.json({
      status: 'success',
      data: {
        history,
        pagination: {
          current: parseInt(page),
          pages: 1,
          total: history.length
        }
      }
    });
  })
);

export default router;