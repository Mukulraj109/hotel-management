import express from 'express';
import revenueController from '../controllers/revenueManagementController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { ensurePropertyAccess } from '../middleware/propertyAccess.js';

const router = express.Router();

// Apply authentication and property access to all revenue management routes
router.use(authenticate);
router.use(ensurePropertyAccess);

// Pricing Rules Routes
router.post('/pricing-rules', authorize(['admin', 'revenue_manager']), revenueController.createPricingRule);
router.get('/pricing-rules', authorize(['admin', 'revenue_manager', 'manager']), revenueController.getPricingRules);
router.put('/pricing-rules/:id', authorize(['admin', 'revenue_manager']), revenueController.updatePricingRule);
router.delete('/pricing-rules/:id', authorize(['admin', 'revenue_manager']), revenueController.deletePricingRule);

// Dynamic Pricing Routes
router.get('/dynamic-rate', revenueController.calculateDynamicRate);

// Demand Forecasting Routes
router.post('/demand-forecast', authorize(['admin', 'revenue_manager']), revenueController.generateDemandForecast);
router.get('/demand-forecast', authorize(['admin', 'revenue_manager', 'manager']), revenueController.getDemandForecast);

// Rate Shopping Routes
router.post('/competitor-rates', authorize(['admin', 'revenue_manager']), revenueController.addCompetitorRate);
router.get('/competitor-rates', authorize(['admin', 'revenue_manager', 'manager']), revenueController.getCompetitorRates);
router.put('/competitor-rates', authorize(['admin', 'revenue_manager']), revenueController.updateCompetitorRates);

// Package Management Routes
router.post('/packages', authorize(['admin', 'revenue_manager']), revenueController.createPackage);
router.get('/packages', revenueController.getPackages);
router.put('/packages/:id', authorize(['admin', 'revenue_manager']), revenueController.updatePackage);

// Corporate Rates Routes
router.post('/corporate-rates', authorize(['admin', 'revenue_manager']), revenueController.createCorporateRate);
router.get('/corporate-rates', authorize(['admin', 'revenue_manager', 'manager']), revenueController.getCorporateRates);

// Revenue Analytics Routes
router.get('/analytics', authorize(['admin', 'revenue_manager', 'manager']), revenueController.getRevenueAnalytics);
router.get('/analytics/summary', authorize(['admin', 'revenue_manager', 'manager']), revenueController.getRevenueSummary);

// Optimization Routes
router.get('/optimization/recommendations', authorize(['admin', 'revenue_manager']), revenueController.getOptimizationRecommendations);

// Dashboard Metrics Route
router.get('/dashboard/metrics', authorize(['admin', 'revenue_manager', 'manager']), revenueController.getDashboardMetrics);

// Room Type Rate Management Routes
router.put('/room-type-rates/:id', authorize(['admin', 'revenue_manager']), revenueController.updateRoomTypeRate);
router.post('/room-type-rates/bulk-update', authorize(['admin', 'revenue_manager']), revenueController.bulkUpdateRoomTypeRates);

// Room Types for Dynamic Pricing
router.get('/room-types', authorize(['admin', 'revenue_manager', 'manager']), revenueController.getRoomTypesForPricing);

export default router;