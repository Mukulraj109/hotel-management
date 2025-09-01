import express from 'express';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';
import { 
  generateReport,
  getReportStatus,
  getCachedReport,
  clearReportCache,
  getReportTemplates,
  scheduleReport,
  exportReport,
  getDashboardMetrics,
  getRealtimeKPIs,
  forecastOccupancy,
  predictDemand,
  analyzeMarketTrends
} from '../controllers/analyticsController.js';

const router = express.Router();

// Apply authentication middleware to all analytics routes
router.use(authMiddleware);

// Basic report generation
router.post('/reports/generate', roleMiddleware(['admin', 'manager']), generateReport);
router.get('/reports/status/:reportId', roleMiddleware(['admin', 'manager']), getReportStatus);
router.get('/reports/cached/:cacheKey', roleMiddleware(['admin', 'manager']), getCachedReport);

// Report management
router.get('/reports/templates', roleMiddleware(['admin', 'manager']), getReportTemplates);
router.delete('/reports/cache/:reportType?', roleMiddleware(['admin']), clearReportCache);
router.post('/reports/schedule', roleMiddleware(['admin']), scheduleReport);
router.get('/reports/export/:reportId/:format', roleMiddleware(['admin', 'manager']), exportReport);

// Dashboard and real-time metrics
router.get('/dashboard/metrics', roleMiddleware(['admin', 'manager']), getDashboardMetrics);
router.get('/kpis/realtime', roleMiddleware(['admin', 'manager', 'staff']), getRealtimeKPIs);

// Advanced analytics endpoints
router.get('/reports/executive-summary', roleMiddleware(['admin']), (req, res, next) => {
  req.reportType = 'executive_summary';
  generateReport(req, res, next);
});

router.get('/reports/revenue-analysis', roleMiddleware(['admin', 'manager']), (req, res, next) => {
  req.reportType = 'revenue_analysis';
  generateReport(req, res, next);
});

router.get('/reports/occupancy-analysis', roleMiddleware(['admin', 'manager']), (req, res, next) => {
  req.reportType = 'occupancy_analysis';
  generateReport(req, res, next);
});

router.get('/reports/guest-segmentation', roleMiddleware(['admin', 'manager']), (req, res, next) => {
  req.reportType = 'guest_segmentation';
  generateReport(req, res, next);
});

router.get('/reports/booking-trends', roleMiddleware(['admin', 'manager']), (req, res, next) => {
  req.reportType = 'booking_trends';
  generateReport(req, res, next);
});

router.get('/reports/performance-comparison', roleMiddleware(['admin', 'manager']), (req, res, next) => {
  req.reportType = 'performance_comparison';
  generateReport(req, res, next);
});

router.get('/reports/channel-analysis', roleMiddleware(['admin', 'manager']), (req, res, next) => {
  req.reportType = 'channel_analysis';
  generateReport(req, res, next);
});

router.get('/reports/seasonal-analysis', roleMiddleware(['admin', 'manager']), (req, res, next) => {
  req.reportType = 'seasonal_analysis';
  generateReport(req, res, next);
});

// ETL management endpoints
router.post('/etl/run', roleMiddleware(['admin']), async (req, res) => {
  try {
    const { ETLService } = await import('../services/analytics/ETLService.js');
    const etlService = new ETLService();
    
    // Run ETL in background
    etlService.executeFullETL().catch(error => {
      console.error('ETL execution failed:', error);
    });
    
    res.json({
      success: true,
      message: 'ETL process initiated',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to initiate ETL process',
      error: error.message
    });
  }
});

router.get('/etl/status', roleMiddleware(['admin']), async (req, res) => {
  try {
    const { ETLService } = await import('../services/analytics/ETLService.js');
    const etlService = new ETLService();
    
    const status = {
      isRunning: etlService.isRunning || false,
      lastRun: etlService.lastRunTimestamp || null,
      nextScheduled: etlService.nextScheduledRun || null,
      status: etlService.isRunning ? 'running' : 'idle'
    };
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get ETL status',
      error: error.message
    });
  }
});

// Predictive analytics endpoints
router.get('/forecast/occupancy/:hotelId', roleMiddleware(['admin', 'manager']), forecastOccupancy);
router.get('/predict/demand/:hotelId', roleMiddleware(['admin', 'manager']), predictDemand);
router.get('/market/trends/:hotelId', roleMiddleware(['admin', 'manager']), analyzeMarketTrends);

export default router;