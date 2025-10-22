import express from 'express';
import bookingEngineController from '../controllers/bookingEngineController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { ensurePropertyAccess } from '../middleware/propertyAccess.js';

const router = express.Router();

// Booking Widget Routes
router.post('/widgets', authenticate, ensurePropertyAccess, authorize(['admin', 'marketing_manager', 'frontdesk']), bookingEngineController.createBookingWidget);
router.get('/widgets', authenticate, ensurePropertyAccess, authorize(['admin', 'marketing_manager', 'manager', 'frontdesk']), bookingEngineController.getBookingWidgets);
router.put('/widgets/:id', authenticate, ensurePropertyAccess, authorize(['admin', 'marketing_manager', 'frontdesk']), bookingEngineController.updateBookingWidget);
router.get('/widgets/:widgetId/code', bookingEngineController.getWidgetCode);
router.post('/widgets/:widgetId/booking', bookingEngineController.processWidgetBooking);

// Widget Tracking Routes (Public for external websites)
router.post('/widget/track', bookingEngineController.trackWidgetEvent);
router.get('/widgets/:widgetId/analytics', authenticate, ensurePropertyAccess, authorize(['admin', 'marketing_manager', 'manager', 'frontdesk']), bookingEngineController.getWidgetAnalytics);
router.get('/widgets/performance/summary', authenticate, ensurePropertyAccess, authorize(['admin', 'marketing_manager', 'manager', 'frontdesk']), bookingEngineController.getWidgetsPerformanceSummary);

// Promo Code Routes
router.post('/promo-codes', authenticate, ensurePropertyAccess, authorize(['admin', 'marketing_manager', 'frontdesk']), bookingEngineController.createPromoCode);
router.get('/promo-codes', authenticate, ensurePropertyAccess, authorize(['admin', 'marketing_manager', 'manager', 'frontdesk']), bookingEngineController.getPromoCodes);
router.put('/promo-codes/:id', authenticate, ensurePropertyAccess, authorize(['admin', 'marketing_manager', 'frontdesk']), bookingEngineController.updatePromoCode);
router.post('/promo-codes/validate', bookingEngineController.validatePromoCode);

// Guest CRM Routes
router.get('/crm/guests', authenticate, ensurePropertyAccess, authorize(['admin', 'marketing_manager', 'manager', 'frontdesk']), bookingEngineController.getGuestCRM);
router.get('/crm/guests/:id', authenticate, ensurePropertyAccess, authorize(['admin', 'marketing_manager', 'manager', 'frontdesk']), bookingEngineController.getGuestProfile);
router.put('/crm/guests/:id', authenticate, ensurePropertyAccess, authorize(['admin', 'marketing_manager', 'frontdesk']), bookingEngineController.updateGuestProfile);

// Email Campaign Routes
router.post('/campaigns', authenticate, ensurePropertyAccess, authorize(['admin', 'marketing_manager', 'frontdesk']), bookingEngineController.createEmailCampaign);
router.get('/campaigns', authenticate, ensurePropertyAccess, authorize(['admin', 'marketing_manager', 'manager', 'frontdesk']), bookingEngineController.getEmailCampaigns);
router.post('/campaigns/:campaignId/send', authenticate, ensurePropertyAccess, authorize(['admin', 'marketing_manager', 'frontdesk']), bookingEngineController.sendEmailCampaign);
router.get('/campaigns/:id/analytics', authenticate, ensurePropertyAccess, authorize(['admin', 'marketing_manager', 'manager', 'frontdesk']), bookingEngineController.getCampaignAnalytics);

// Loyalty Program Routes
router.post('/loyalty-programs', authenticate, ensurePropertyAccess, authorize(['admin', 'marketing_manager', 'frontdesk']), bookingEngineController.createLoyaltyProgram);
router.get('/loyalty-programs', authenticate, ensurePropertyAccess, bookingEngineController.getLoyaltyPrograms);
router.post('/loyalty/points', authenticate, ensurePropertyAccess, bookingEngineController.processLoyaltyPoints);

// Landing Page Routes
router.post('/landing-pages', authenticate, ensurePropertyAccess, authorize(['admin', 'marketing_manager', 'frontdesk']), bookingEngineController.createLandingPage);
router.get('/landing-pages', authenticate, ensurePropertyAccess, authorize(['admin', 'marketing_manager', 'manager', 'frontdesk']), bookingEngineController.getLandingPages);
router.get('/landing-pages/:id/analytics', authenticate, ensurePropertyAccess, authorize(['admin', 'marketing_manager', 'manager', 'frontdesk']), bookingEngineController.getLandingPageAnalytics);

// Review Management Routes
router.post('/reviews', bookingEngineController.createReview);
router.get('/reviews', authenticate, ensurePropertyAccess, authorize(['admin', 'marketing_manager', 'manager', 'frontdesk']), bookingEngineController.getReviews);
router.post('/reviews/:id/respond', authenticate, ensurePropertyAccess, authorize(['admin', 'marketing_manager', 'frontdesk']), bookingEngineController.respondToReview);
router.put('/reviews/:id/moderate', authenticate, ensurePropertyAccess, authorize(['admin', 'marketing_manager', 'frontdesk']), bookingEngineController.moderateReview);

// Dashboard and Analytics Routes
router.get('/dashboard', authenticate, ensurePropertyAccess, authorize(['admin', 'marketing_manager', 'manager', 'frontdesk']), bookingEngineController.getMarketingDashboard);

export default router;
