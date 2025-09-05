import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import connectDB from './config/database.js';
import { connectRedis } from './config/redis.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/logger.js';
import { comprehensiveAPILogger } from './middleware/comprehensiveLogger.js';
import logger from './utils/logger.js';
import websocketService from './services/websocketService.js';
import inventoryScheduler from './services/inventoryScheduler.js';
import pricingScheduler from './schedulers/pricingScheduler.js';
import { applyEventMiddleware } from './middleware/eventMiddleware.js';
import queueService from './services/queueService.js';
import bookingWorkflowEngine from './services/bookingWorkflowEngine.js';
import payloadRetentionService from './services/payloadRetentionService.js';
import otaPayloadService from './services/otaPayloadService.js';

// Route imports
import authRoutes from './routes/auth.js';
import roomRoutes from './routes/rooms.js';
import bookingRoutes from './routes/bookings.js';
import enhancedBookingRoutes from './routes/enhancedBookings.js';
import paymentRoutes from './routes/payments.js';
import housekeepingRoutes from './routes/housekeeping.js';
import inventoryRoutes from './routes/inventory.js';
import guestRoutes from './routes/guests.js';
import reportRoutes from './routes/reports.js';
import otaRoutes from './routes/ota.js';
import webhookRoutes from './routes/webhooks.js';
import adminRoutes from './routes/admin.js';
import adminDashboardRoutes from './routes/adminDashboard.js';
import staffDashboardRoutes from './routes/staffDashboard.js';
import dailyInventoryCheckRoutes from './routes/dailyInventoryCheck.js';
import inventoryNotificationRoutes from './routes/inventoryNotifications.js';
import guestServiceRoutes from './routes/guestServices.js';
import reviewRoutes from './routes/reviews.js';
import maintenanceRoutes from './routes/maintenance.js';
import incidentRoutes from './routes/incidents.js';
import invoiceRoutes from './routes/invoices.js';
import supplyRequestRoutes from './routes/supplyRequests.js';
import communicationRoutes from './routes/communications.js';
import messageTemplateRoutes from './routes/messageTemplates.js';
import contactRoutes from './routes/contact.js';
import billingHistoryRoutes from './routes/billingHistory.js';
import loyaltyRoutes from './routes/loyalty.js';
import hotelServicesRoutes from './routes/hotelServices.js';
import notificationRoutes from './routes/notifications.js';
import digitalKeyRoutes from './routes/digitalKeys.js';
import meetUpRequestRoutes from './routes/meetUpRequests.js';
import dashboardUpdatesRoutes from './routes/dashboardUpdates.js';
import corporateRoutes from './routes/corporate.js';
import roomInventoryRoutes from './routes/roomInventory.js';
import photoUploadRoutes from './routes/photoUpload.js';
import staffTaskRoutes from './routes/staffTasks.js';
import checkoutInventoryRoutes from './routes/checkoutInventory.js';
import dailyRoutineCheckRoutes from './routes/dailyRoutineCheck.js';
import testCheckoutsRoutes from './routes/testCheckouts.js';
import attractionsRoutes from './routes/attractions.js';
import analyticsRoutes from './routes/analytics.js';
import posRoutes from './routes/pos.js';
import revenueManagementRoutes from './routes/revenueManagement.js';
import channelManagerRoutes from './routes/channelManager.js';
import bookingEngineRoutes from './routes/bookingEngine.js';
import financialRoutes from './routes/financial.js';
import tapeChartRoutes from './routes/tapeChart.js';
import dashboardRoutes from './routes/dashboard.js';
import roomBlockRoutes from './routes/roomBlocks.js';
import assignmentRulesRoutes from './routes/assignmentRules.js';
import advancedReservationsRoutes from './routes/advancedReservations.js';
import billingSessionRoutes from './routes/billingSessions.js';
import posReportsRoutes from './routes/posReports.js';
import guestLookupRoutes from './routes/guestLookup.js';
import availabilityRoutes from './routes/availability.js';
import rateManagementRoutes from './routes/rateManagement.js';
import roomTypesRoutes from './routes/roomTypes.js';
import channelManagementRoutes from './routes/channelManagement.js';
import otaWebhookRoutes from './routes/otaWebhooks.js';
import externalBookingsRoutes from './routes/externalBookings.js';
import revenueOptimizationRoutes from './routes/revenueOptimization.js';
import inventoryManagementRoutes from './routes/inventoryManagement.js';
import mappingRoutes from './routes/mapping.js';
import currencyRoutes from './routes/currency.js';
import languageRoutes from './routes/language.js';
import translationRoutes from './routes/translations.js';
import channelLocalizationRoutes from './routes/channelLocalization.js';
import otaAmendmentRoutes from './routes/otaAmendments.js';
import auditRoutes from './routes/audit.js';
import laundryRoutes from './routes/laundry.js';
import aiRoutes from './routes/ai.js';

// Security & Compliance Routes
import gdprRoutes from './routes/gdpr.js';
import credentialRoutes from './routes/credentials.js';
import rolePermissionRoutes from './routes/rolePermissions.js';
import dataPrivacyRoutes from './routes/dataPrivacy.js';
import securityMonitoringRoutes from './routes/securityMonitoring.js';

const app = express();

// Connect to databases
try {
  await connectDB();
} catch (error) {
  logger.warn('Database connection failed, continuing without database');
}

try {
  await connectRedis();
} catch (error) {
  logger.warn('Redis connection failed, continuing without Redis');
}

// Initialize event middleware and queue service
await applyEventMiddleware();
await queueService.initialize();

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Hotel Management System API',
      version: '1.0.0',
      description: 'A comprehensive hotel management system API',
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://hotel-management-xcsx.onrender.com/api/v1' 
          : 'http://localhost:4000/api/v1',
        description: 'API Server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.js', './src/models/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Trust proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: "*",
  credentials: true,
  optionsSuccessStatus: 200
}));

// Rate limiting - very lenient for development
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 1 * 60 * 1000, // 1 minute window
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || (process.env.NODE_ENV === 'production' ? 1000 : 10000), // 10k requests per minute in dev
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks and static files
    return req.path === '/health' || req.path.startsWith('/uploads/');
  }
});
// app.use('/api/', limiter); // Temporarily disabled for development

// Body parsing middleware
app.use('/api/v1/webhooks', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Security sanitization
app.use(mongoSanitize());
app.use(hpp());

// Compression
app.use(compression());

// Logging - Basic request logging
app.use(requestLogger);

// Comprehensive API logging (stores payloads and OTA data)
app.use(comprehensiveAPILogger({
  logPayloads: process.env.LOG_PAYLOADS !== 'false',
  maxPayloadSize: parseInt(process.env.MAX_LOG_PAYLOAD_SIZE) || 1024 * 1024,
  storeOTAPayloads: process.env.STORE_OTA_PAYLOADS !== 'false',
  excludePaths: ['/health', '/docs', '/uploads']
}));

// Serve static files for uploaded photos
app.use('/uploads', express.static('uploads'));

// API Documentation
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is healthy',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/rooms', roomRoutes);
app.use('/api/v1/bookings/enhanced', enhancedBookingRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/housekeeping', housekeepingRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/guests', guestRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/ota', otaRoutes);
app.use('/api/v1/webhooks', webhookRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/admin-dashboard', adminDashboardRoutes);
app.use('/api/v1/staff-dashboard', staffDashboardRoutes);
app.use('/api/v1/daily-inventory-checks', dailyInventoryCheckRoutes);
app.use('/api/v1/inventory-notifications', inventoryNotificationRoutes);
app.use('/api/v1/guest-services', guestServiceRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/maintenance', maintenanceRoutes);
app.use('/api/v1/incidents', incidentRoutes);
app.use('/api/v1/invoices', invoiceRoutes);
app.use('/api/v1/supply-requests', supplyRequestRoutes);
app.use('/api/v1/communications', communicationRoutes);
app.use('/api/v1/message-templates', messageTemplateRoutes);
app.use('/api/v1/contact', contactRoutes);
app.use('/api/v1/billing-history', billingHistoryRoutes);
app.use('/api/v1/loyalty', loyaltyRoutes);
app.use('/api/v1/hotel-services', hotelServicesRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/digital-keys', digitalKeyRoutes);
app.use('/api/v1/meet-up-requests', meetUpRequestRoutes);
app.use('/api/v1/dashboard-updates', dashboardUpdatesRoutes);
app.use('/api/v1/room-inventory', roomInventoryRoutes);
app.use('/api/v1/photos', photoUploadRoutes);
app.use('/api/v1/staff-tasks', staffTaskRoutes);
app.use('/api/v1/checkout-inventory', checkoutInventoryRoutes);
app.use('/api/v1/daily-routine-check', dailyRoutineCheckRoutes);
app.use('/api/v1/test', testCheckoutsRoutes);
app.use('/api/v1/attractions', attractionsRoutes);
app.use('/api/v1/corporate', corporateRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/pos', posRoutes);
app.use('/api/v1/revenue-management', revenueManagementRoutes);
app.use('/api/v1/channel-manager', channelManagerRoutes);
app.use('/api/v1/booking-engine', bookingEngineRoutes);
app.use('/api/v1/financial', financialRoutes);
app.use('/api/v1/tape-chart', tapeChartRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/room-blocks', roomBlockRoutes);
app.use('/api/v1/assignment-rules', assignmentRulesRoutes);
app.use('/api/v1/advanced-reservations', advancedReservationsRoutes);
app.use('/api/v1/billing-sessions', billingSessionRoutes);
app.use('/api/v1/pos/reports', posReportsRoutes);
app.use('/api/v1/guest-lookup', guestLookupRoutes);
app.use('/api/v1/availability', availabilityRoutes);
app.use('/api/v1/rates', rateManagementRoutes);
app.use('/api/v1/room-types', roomTypesRoutes);
app.use('/api/v1/channels', channelManagementRoutes);
app.use('/api/v1/ota-webhooks', otaWebhookRoutes);
app.use('/api/v1/external', externalBookingsRoutes);
app.use('/api/v1/revenue', revenueOptimizationRoutes);
app.use('/api/v1/inventory-management', inventoryManagementRoutes);
app.use('/api/v1/mappings', mappingRoutes);
app.use('/api/v1/currencies', currencyRoutes);
app.use('/api/v1/languages', languageRoutes);
app.use('/api/v1/translations', translationRoutes);
app.use('/api/v1/channel-localization', channelLocalizationRoutes);
app.use('/api/v1/ota-amendments', otaAmendmentRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/laundry', laundryRoutes);
app.use('/api/v1/ai', aiRoutes);

// Security & Compliance API Routes
app.use('/api/v1/gdpr', gdprRoutes);
app.use('/api/v1/credentials', credentialRoutes);
app.use('/api/v1/roles', rolePermissionRoutes);
app.use('/api/v1/data-privacy', dataPrivacyRoutes);
app.use('/api/v1/security-monitoring', securityMonitoringRoutes);

// 404 handler
app.all('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Can't find ${req.originalUrl} on this server`,
  });
});

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 4000;

const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`API Documentation available at http://localhost:${PORT}/docs`);
});

// Initialize WebSocket server
websocketService.initialize(server);

// Start inventory scheduler
inventoryScheduler.start();

// Start pricing scheduler (already auto-starts, but ensure it's initialized)
if (!pricingScheduler.isRunning) {
  pricingScheduler.start();
}

// Start queue processing for OTA sync
await queueService.startProcessing();

// Start booking workflow engine
await bookingWorkflowEngine.start();

// Start payload retention service
payloadRetentionService.start();

// Start OTA payload service cleanup
try {
  otaPayloadService.startCleanup();
  logger.info('OTA payload service cleanup started');
} catch (error) {
  logger.warn('OTA payload service cleanup failed to start:', error.message);
}

// Final success message
logger.info('🚀 All services started successfully - Hotel Management System is ready!', {
  port: PORT,
  environment: process.env.NODE_ENV,
  features: {
    encryption: true,
    gdpr: true,
    rolePermissions: true,
    securityMonitoring: true,
    credentialManagement: true
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  inventoryScheduler.stop();
  pricingScheduler.stop();
  bookingWorkflowEngine.stop();
  await queueService.stopProcessing();
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  inventoryScheduler.stop();
  pricingScheduler.stop();
  bookingWorkflowEngine.stop();
  await queueService.stopProcessing();
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

export default app;