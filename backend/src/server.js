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
import logger from './utils/logger.js';
import websocketService from './services/websocketService.js';
import inventoryScheduler from './services/inventoryScheduler.js';

// Route imports
import authRoutes from './routes/auth.js';
import roomRoutes from './routes/rooms.js';
import bookingRoutes from './routes/bookings.js';
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
import roomInventoryRoutes from './routes/roomInventory.js';
import photoUploadRoutes from './routes/photoUpload.js';
import staffTaskRoutes from './routes/staffTasks.js';

const app = express();

// Connect to databases
await connectDB();
await connectRedis();

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

// Rate limiting - more lenient for development
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || (process.env.NODE_ENV === 'production' ? 100 : 1000),
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks and static files
    return req.path === '/health' || req.path.startsWith('/uploads/');
  }
});
app.use('/api/', limiter);

// Body parsing middleware
app.use('/api/v1/webhooks', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Security sanitization
app.use(mongoSanitize());
app.use(hpp());

// Compression
app.use(compression());

// Logging
app.use(requestLogger);

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

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  inventoryScheduler.stop();
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  inventoryScheduler.stop();
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

export default app;