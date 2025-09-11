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
// import pricingScheduler from './schedulers/pricingScheduler.js'; // Temporarily disabled - requires tensorflow
import { applyEventMiddleware } from './middleware/eventMiddleware.js';
import queueService from './services/queueService.js';
import bookingWorkflowEngine from './services/bookingWorkflowEngine.js'; // Temporarily disabled to debug hang
import payloadRetentionService from './services/payloadRetentionService.js'; // Temporarily disabled to debug hang
import otaPayloadService from './services/otaPayloadService.js'; // Temporarily disabled to debug hang

// Route imports - TEMPORARILY COMMENTED FOR DEVELOPMENT
import authRoutes from './routes/auth.js';
import roomRoutes from './routes/rooms.js';
import bookingRoutes from './routes/bookings.js';
import enhancedBookingRoutes from './routes/enhancedBookings.js'; // Temporarily disabled
import paymentRoutes from './routes/payments.js';
import housekeepingRoutes from './routes/housekeeping.js'; // Temporarily disabled
import inventoryRoutes from './routes/inventory.js'; // Temporarily disabled
import guestRoutes from './routes/guests.js';
import reportRoutes from './routes/reports.js'; // Temporarily disabled
import otaRoutes from './routes/ota.js'; // Temporarily disabled
import webhookRoutes from './routes/webhooks.js'; // Temporarily disabled
import adminRoutes from './routes/admin.js';
import adminDashboardRoutes from './routes/adminDashboard.js'; // Temporarily disabled
import staffDashboardRoutes from './routes/staffDashboard.js'; // Temporarily disabled
import dailyInventoryCheckRoutes from './routes/dailyInventoryCheck.js'; // Temporarily disabled
import inventoryNotificationRoutes from './routes/inventoryNotifications.js'; // Temporarily disabled
import guestServiceRoutes from './routes/guestServices.js'; // Temporarily disabled
import reviewRoutes from './routes/reviews.js'; // Temporarily disabled
import maintenanceRoutes from './routes/maintenance.js'; // Temporarily disabled
import incidentRoutes from './routes/incidents.js'; // Temporarily disabled
import invoiceRoutes from './routes/invoices.js'; // Temporarily disabled
import supplyRequestRoutes from './routes/supplyRequests.js'; // Temporarily disabled
import communicationRoutes from './routes/communications.js'; // Temporarily disabled
import messageTemplateRoutes from './routes/messageTemplates.js'; // Temporarily disabled
import contactRoutes from './routes/contact.js'; // Temporarily disabled
import billingHistoryRoutes from './routes/billingHistory.js'; // Temporarily disabled
import loyaltyRoutes from './routes/loyalty.js'; // Temporarily disabled
import hotelServicesRoutes from './routes/hotelServices.js'; // Temporarily disabled
import notificationRoutes from './routes/notifications.js'; // Temporarily disabled
import digitalKeyRoutes from './routes/digitalKeys.js'; // Temporarily disabled
import meetUpRequestRoutes from './routes/meetUpRequests.js'; // Temporarily disabled
import dashboardUpdatesRoutes from './routes/dashboardUpdates.js'; // Temporarily disabled
import corporateRoutes from './routes/corporate.js'; // Temporarily disabled
import roomInventoryRoutes from './routes/roomInventory.js'; // Temporarily disabled
import photoUploadRoutes from './routes/photoUpload.js'; // Temporarily disabled
import staffTaskRoutes from './routes/staffTasks.js'; // Temporarily disabled
import checkoutInventoryRoutes from './routes/checkoutInventory.js'; // Temporarily disabled
import dailyRoutineCheckRoutes from './routes/dailyRoutineCheck.js'; // Temporarily disabled
import testCheckoutsRoutes from './routes/testCheckouts.js'; // Temporarily disabled
import attractionsRoutes from './routes/attractions.js'; // Temporarily disabled
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
import channelManagementRoutes from './routes/channelManagement.js'; // Temporarily disabled due to syntax errors
import otaWebhookRoutes from './routes/otaWebhooks.js';
import externalBookingsRoutes from './routes/externalBookings.js';
// import revenueOptimizationRoutes from './routes/revenueOptimization.js'; // Temporarily disabled - requires tensorflow
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
import roomTaxRoutes from './routes/roomTax.js';
import revenueAccountRoutes from './routes/revenueAccounts.js';
import roomChargeRoutes from './routes/roomCharges.js';
import phoneExtensionRoutes from './routes/phoneExtensions.js';
import billMessageRoutes from './routes/billMessages.js';
import hotelAreaRoutes from './routes/hotelAreas.js';
import webSettingsRoutes from './routes/webSettings.js';
import webOptimizationRoutes from './routes/webOptimization.js'; // error in this 
import salutationRoutes from './routes/salutations.js';
import guestImportRoutes from './routes/guestImport.js';
import blacklistRoutes from './routes/blacklist.js';
import vipRoutes from './routes/vip.js';
import customFieldRoutes from './routes/customFields.js';
import userManagementRoutes from './routes/userManagement.js';
import loginActivityRoutes from './routes/loginActivity.js';
import userAnalyticsRoutes from './routes/userAnalytics.js';
import seasonalPricingRoutes from './routes/seasonalPricing.js';
import addOnServicesRoutes from './routes/addOnServices.js';
import dayUseRoutes from './routes/dayUse.js';
import bookingFormRoutes from './routes/bookingForm.js';
import allotmentRoutes from './routes/allotment.js';
import centralizedRatesRoutes from './routes/centralizedRates.js';
import propertyGroupsRoutes from './routes/propertyGroups.js';
import departmentRoutes from './routes/departments.js';
import reasonRoutes from './routes/reasons.js';
import paymentMethodRoutes from './routes/paymentMethods.js';
import guestManagementRoutes from './routes/guestManagement.js';
import operationalManagementRoutes from './routes/operationalManagement.js';
import apiManagementRoutes from './routes/apiManagement.js';
// import discountPricingRoutes from './routes/discountPricing.js';//error in this

// Security & Compliance Routes - TEMPORARILY COMMENTED
import gdprRoutes from './routes/gdpr.js';
import credentialRoutes from './routes/credentials.js';
import rolePermissionRoutes from './routes/rolePermissions.js';
import dataPrivacyRoutes from './routes/dataPrivacy.js';
import securityMonitoringRoutes from './routes/securityMonitoring.js';

const app = express();

// Initialize the application
async function initializeApp() {
  logger.info('🔄 Starting app initialization...');
  
  // Connect to databases
  try {
    logger.info('🔄 Connecting to MongoDB...');
    await connectDB();
    logger.info('✅ MongoDB connection completed');
  } catch (error) {
    logger.warn('❌ Database connection failed, continuing without database', { error: error.message });
  }

  try {
    logger.info('🔄 Connecting to Redis...');
    await connectRedis();
    logger.info('✅ Redis connection completed');
  } catch (error) {
    logger.warn('❌ Redis connection failed, continuing without Redis', { error: error.message });
  }


  try {
    logger.info('🔄 Applying event middleware...');
    await applyEventMiddleware();
    logger.info('✅ Event middleware applied');
    
    logger.info('🔄 Initializing queue service...');
    await queueService.initialize();
    logger.info('✅ Queue service initialized');
  } catch (error) {
    logger.warn('❌ Event middleware or queue service initialization failed:', { error: error.message });
  }
  
  logger.info('✅ App initialization completed successfully');
}

// Start initialization
initializeApp().catch(error => {
  logger.error('App initialization failed:', error);
});

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

// Comprehensive API logging (stores payloads and OTA data) - TEMPORARILY COMMENTED
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

// API Routes - TEMPORARILY COMMENTED FOR DEVELOPMENT
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
app.use('/api/v1/seasonal-pricing', seasonalPricingRoutes);
app.use('/api/v1/add-on-services', addOnServicesRoutes);
app.use('/api/v1/day-use', dayUseRoutes);
app.use('/api/v1/room-types', roomTypesRoutes);
app.use('/api/v1/channels', channelManagementRoutes); // Temporarily disabled due to syntax errors
app.use('/api/v1/ota-webhooks', otaWebhookRoutes);
app.use('/api/v1/external', externalBookingsRoutes);
// app.use('/api/v1/revenue', revenueOptimizationRoutes); // Temporarily disabled - requires tensorflow
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
app.use('/api/v1/room-taxes', roomTaxRoutes);
app.use('/api/v1/revenue-accounts', revenueAccountRoutes);
app.use('/api/v1/room-charges', roomChargeRoutes);
app.use('/api/v1/phone-extensions', phoneExtensionRoutes);
app.use('/api/v1/bill-messages', billMessageRoutes);
app.use('/api/v1/hotel-areas', hotelAreaRoutes);
app.use('/api/v1/web-settings', webSettingsRoutes);
app.use('/api/v1/web-optimization', webOptimizationRoutes);
app.use('/api/v1/salutations', salutationRoutes);
app.use('/api/v1/guest-import', guestImportRoutes);
app.use('/api/v1/blacklist', blacklistRoutes);
app.use('/api/v1/vip', vipRoutes);
app.use('/api/v1/custom-fields', customFieldRoutes);
app.use('/api/v1/user-management', userManagementRoutes);
app.use('/api/v1/login-activity', loginActivityRoutes);
app.use('/api/v1/user-analytics', userAnalyticsRoutes);
app.use('/api/v1/booking-forms', bookingFormRoutes);
app.use('/api/v1/allotments', allotmentRoutes);
app.use('/api/v1/centralized-rates', centralizedRatesRoutes);
app.use('/api/v1/property-groups', propertyGroupsRoutes);
app.use('/api/v1/departments', departmentRoutes);
app.use('/api/v1/reasons', reasonRoutes);
app.use('/api/v1/payment-methods', paymentMethodRoutes);
app.use('/api/v1/guest-management', guestManagementRoutes);
app.use('/api/v1/operational-management', operationalManagementRoutes);
app.use('/api/v1/api-management', apiManagementRoutes);
// app.use('/api/v1/discount-pricing', discountPricingRoutes); // error in this 

// Security & Compliance API Routes - TEMPORARILY COMMENTED
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

const server = app.listen(PORT, async () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📚 API Documentation available at http://localhost:${PORT}/docs`);
  
  // Initialize services after server starts
  try {
    logger.info('🔄 Starting post-server services initialization...');
    
    // Initialize WebSocket server - TEMPORARILY COMMENTED
    logger.info('🔄 Initializing WebSocket server...');
    websocketService.initialize(server);
    logger.info('✅ WebSocket server initialized');

    // Start inventory scheduler - TEMPORARILY COMMENTED
    logger.info('🔄 Starting inventory scheduler...');
    inventoryScheduler.start();
    logger.info('✅ Inventory scheduler started');

    // Start pricing scheduler (already auto-starts, but ensure it's initialized)
    // if (!pricingScheduler.isRunning) {
    //   pricingScheduler.start();
    // } // Temporarily disabled - requires tensorflow

    // Start queue processing for OTA sync - TEMPORARILY COMMENTED
    try {
      logger.info('🔄 Starting queue processing...');
      await queueService.startProcessing();
      logger.info('✅ Queue processing started');
    } catch (error) {
      logger.warn('❌ Queue processing failed to start:', { error: error.message });
    }

    // Start booking workflow engine - TEMPORARILY DISABLED
    try {
      logger.info('🔄 Starting booking workflow engine...');
      await bookingWorkflowEngine.start();
      logger.info('✅ Booking workflow engine started');
    } catch (error) {
      logger.warn('❌ Booking workflow engine failed to start:', { error: error.message });
    }

    // Start payload retention service - TEMPORARILY DISABLED
    try {
      logger.info('🔄 Starting payload retention service...');
      payloadRetentionService.start();
      logger.info('✅ Payload retention service started');
    } catch (error) {
      logger.warn('❌ Payload retention service failed to start:', { error: error.message });
    }

    // Start OTA payload service cleanup - TEMPORARILY DISABLED
    try {
      logger.info('🔄 Starting OTA payload service cleanup...');
      otaPayloadService.startCleanup();
      logger.info('✅ OTA payload service cleanup started');
    } catch (error) {
      logger.warn('❌ OTA payload service cleanup failed to start:', { error: error.message });
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
  } catch (error) {
    logger.error('Failed to start services:', error);
    process.exit(1);
  }
});

// Graceful shutdown - TEMPORARILY COMMENTED
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  inventoryScheduler.stop();
  // pricingScheduler.stop(); // Temporarily disabled - requires tensorflow
  bookingWorkflowEngine.stop(); // Temporarily disabled
  await queueService.stopProcessing();
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  inventoryScheduler.stop();
  // pricingScheduler.stop(); // Temporarily disabled - requires tensorflow
  bookingWorkflowEngine.stop(); // Temporarily disabled
  await queueService.stopProcessing();
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

export default app;