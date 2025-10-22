import express from 'express';
import channelController from '../controllers/channelManagerController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { ensurePropertyAccess } from '../middleware/propertyAccess.js';

const router = express.Router();

// Apply authentication and property access to all channel manager routes
router.use(authenticate);
router.use(ensurePropertyAccess);

// Channel Management Routes
router.post('/channels', authorize(['admin', 'channel_manager', 'frontdesk']), channelController.createChannel);
router.get('/channels', authorize(['admin', 'channel_manager', 'manager', 'frontdesk']), channelController.getChannels);
router.get('/channels/:id', authorize(['admin', 'channel_manager', 'manager', 'frontdesk']), channelController.getChannel);
router.put('/channels/:id', authorize(['admin', 'channel_manager', 'frontdesk']), channelController.updateChannel);
router.delete('/channels/:id', authorize(['admin', 'channel_manager', 'frontdesk']), channelController.deleteChannel);
router.post('/channels/:channelId/test-connection', authorize(['admin', 'channel_manager', 'frontdesk']), channelController.testChannelConnection);

// Synchronization Routes
router.post('/sync/channel/:channelId', authorize(['admin', 'channel_manager', 'frontdesk']), channelController.syncToChannel);
router.post('/sync/all-channels', authorize(['admin', 'channel_manager', 'frontdesk']), channelController.syncToAllChannels);
router.get('/sync/history', authorize(['admin', 'channel_manager', 'manager', 'frontdesk']), channelController.getSyncHistory);

// Reservation Management Routes
router.post('/reservations/pull/:channelId', authorize(['admin', 'channel_manager', 'frontdesk']), channelController.pullReservations);
router.get('/reservations/mappings', authorize(['admin', 'channel_manager', 'manager', 'frontdesk']), channelController.getReservationMappings);

// Rate Parity Routes
router.post('/rate-parity/monitor', authorize(['admin', 'channel_manager', 'frontdesk']), channelController.monitorRateParity);
router.get('/rate-parity/logs', authorize(['admin', 'channel_manager', 'manager', 'frontdesk']), channelController.getRateParityLogs);

// Performance Routes
router.get('/performance/:channelId', authorize(['admin', 'channel_manager', 'manager', 'frontdesk']), channelController.getChannelPerformance);
router.get('/performance', authorize(['admin', 'channel_manager', 'manager', 'frontdesk']), channelController.getAllChannelsPerformance);

// Overbooking Protection Routes
router.post('/overbooking/check', authorize(['admin', 'channel_manager', 'frontdesk']), channelController.checkOverbooking);
router.post('/overbooking/rules', authorize(['admin', 'channel_manager', 'frontdesk']), channelController.createOverbookingRule);
router.get('/overbooking/rules', authorize(['admin', 'channel_manager', 'manager', 'frontdesk']), channelController.getOverbookingRules);

// Dashboard and Analytics Routes
router.get('/dashboard/stats', authorize(['admin', 'channel_manager', 'manager', 'frontdesk']), channelController.getDashboardStats);
router.get('/analytics', authorize(['admin', 'channel_manager', 'manager', 'frontdesk']), channelController.getChannelAnalytics);

export default router;
