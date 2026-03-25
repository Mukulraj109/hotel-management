import cron from 'node-cron';
import Hotel from '../models/Hotel.js';
import nightAuditService from '../services/nightAuditService.js';
import logger from '../utils/logger.js';

export function scheduleNightAudit() {
  // Run at 2:00 AM daily
  cron.schedule('0 2 * * *', async () => {
    logger.info('Starting scheduled night audit run');

    try {
      const hotels = await Hotel.find({ isActive: true }).select('_id name').lean().limit(1000);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      for (const hotel of hotels) {
        try {
          await nightAuditService.runFullAudit(hotel._id, yesterday, null, 'scheduled');
          logger.info(`Night audit completed for hotel ${hotel.name}`, { hotelId: hotel._id });
        } catch (error) {
          logger.error(`Night audit failed for hotel ${hotel.name}`, {
            hotelId: hotel._id,
            error: error.message
          });
        }
      }

      logger.info('Scheduled night audit run completed', { hotelsProcessed: hotels.length });
    } catch (error) {
      logger.error('Scheduled night audit run failed', { error: error.message });
    }
  });

  logger.info('Night audit job scheduled for 2:00 AM daily');
}
