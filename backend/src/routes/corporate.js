import express from 'express';
import {
  createCorporateCompany,
  getAllCorporateCompanies,
  getCorporateCompany,
  updateCorporateCompany,
  deleteCorporateCompany,
  getCorporateCompanyCreditSummary,
  getCorporateCompanyBookings,
  getLowCreditCompanies,
  updateCorporateCredit
} from '../controllers/corporateController.js';

import {
  createGroupBooking,
  getAllGroupBookings,
  getGroupBooking,
  updateGroupBooking,
  confirmGroupBooking,
  cancelGroupBooking,
  getUpcomingGroupBookings,
  updateGroupBookingRoom
} from '../controllers/groupBookingController.js';

import {
  createCreditTransaction,
  getAllCreditTransactions,
  getCreditTransaction,
  approveCreditTransaction,
  rejectCreditTransaction,
  getOverdueTransactions,
  getMonthlyCreditReport,
  getCompanyCreditSummary,
  bulkApproveCreditTransactions
} from '../controllers/corporateCreditController.js';

import {
  calculateGST,
  validateGSTNumber,
  calculateBookingGST,
  reverseCalculateGST,
  generateGSTInvoiceData,
  getStateCodes,
  updateBookingGSTDetails
} from '../controllers/gstController.js';

import {
  getCorporateDashboardOverview,
  getMonthlyTrends,
  getCompanyPerformance,
  getBookingAnalytics,
  getCreditAnalysis
} from '../controllers/corporateTrackingController.js';

import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { corporateCompanyValidation, groupBookingValidation, creditTransactionValidation } from '../validation/corporateValidation.js';

const router = express.Router();

// Apply authentication to all corporate routes
router.use(authenticate);

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

// Corporate Company Routes
/**
 * @swagger
 * /api/v1/corporate/companies:
 *   get:
 *     summary: Get all corporate companies
 *     tags: [Corporate]
 *   post:
 *     summary: Create a new corporate company
 *     tags: [Corporate]
 */
router
  .route('/companies')
  .get(authorize('admin', 'staff'), getAllCorporateCompanies)
  .post(
    authorize('admin', 'staff'),
    validate(corporateCompanyValidation.create),
    createCorporateCompany
  );

/**
 * @swagger
 * /api/v1/corporate/companies/low-credit:
 *   get:
 *     summary: Get companies with low credit
 *     tags: [Corporate]
 */
router
  .route('/companies/low-credit')
  .get(authorize('admin', 'staff'), getLowCreditCompanies);

/**
 * @swagger
 * /api/v1/corporate/companies/{id}:
 *   get:
 *     summary: Get a corporate company by ID
 *     tags: [Corporate]
 *   patch:
 *     summary: Update a corporate company
 *     tags: [Corporate]
 *   delete:
 *     summary: Delete a corporate company
 *     tags: [Corporate]
 */
router
  .route('/companies/:id')
  .get(authorize('admin', 'staff'), getCorporateCompany)
  .patch(
    authorize('admin', 'staff'),
    validate(corporateCompanyValidation.update),
    updateCorporateCompany
  )
  .delete(authorize('admin'), deleteCorporateCompany);

/**
 * @swagger
 * /api/v1/corporate/companies/{id}/credit-summary:
 *   get:
 *     summary: Get credit summary for a corporate company
 *     tags: [Corporate]
 */
router
  .route('/companies/:id/credit-summary')
  .get(authorize('admin', 'staff'), getCorporateCompanyCreditSummary);

/**
 * @swagger
 * /api/v1/corporate/companies/{id}/bookings:
 *   get:
 *     summary: Get all bookings for a corporate company
 *     tags: [Corporate]
 */
router
  .route('/companies/:id/bookings')
  .get(authorize('admin', 'staff'), getCorporateCompanyBookings);

/**
 * @swagger
 * /api/v1/corporate/companies/{id}/update-credit:
 *   patch:
 *     summary: Update corporate company credit
 *     tags: [Corporate]
 */
router
  .route('/companies/:id/update-credit')
  .patch(authorize('admin'), updateCorporateCredit);

// Group Booking Routes
/**
 * @swagger
 * /api/v1/corporate/group-bookings:
 *   get:
 *     summary: Get all group bookings
 *     tags: [Group Bookings]
 *   post:
 *     summary: Create a new group booking
 *     tags: [Group Bookings]
 */
router
  .route('/group-bookings')
  .get(authorize('admin', 'staff'), getAllGroupBookings)
  .post(
    authorize('admin', 'staff'),
    validate(groupBookingValidation.create),
    createGroupBooking
  );

/**
 * @swagger
 * /api/v1/corporate/group-bookings/upcoming:
 *   get:
 *     summary: Get upcoming group bookings
 *     tags: [Group Bookings]
 */
router
  .route('/group-bookings/upcoming')
  .get(authorize('admin', 'staff'), getUpcomingGroupBookings);

/**
 * @swagger
 * /api/v1/corporate/group-bookings/{id}:
 *   get:
 *     summary: Get a group booking by ID
 *     tags: [Group Bookings]
 *   patch:
 *     summary: Update a group booking
 *     tags: [Group Bookings]
 */
router
  .route('/group-bookings/:id')
  .get(authorize('admin', 'staff'), getGroupBooking)
  .patch(
    authorize('admin', 'staff'),
    validate(groupBookingValidation.update),
    updateGroupBooking
  );

/**
 * @swagger
 * /api/v1/corporate/group-bookings/{id}/confirm:
 *   patch:
 *     summary: Confirm group booking and create individual bookings
 *     tags: [Group Bookings]
 */
router
  .route('/group-bookings/:id/confirm')
  .patch(authorize('admin', 'staff'), confirmGroupBooking);

/**
 * @swagger
 * /api/v1/corporate/group-bookings/{id}/cancel:
 *   patch:
 *     summary: Cancel group booking or specific rooms
 *     tags: [Group Bookings]
 */
router
  .route('/group-bookings/:id/cancel')
  .patch(authorize('admin', 'staff'), cancelGroupBooking);

/**
 * @swagger
 * /api/v1/corporate/group-bookings/{id}/rooms/{roomIndex}:
 *   patch:
 *     summary: Update specific room in group booking
 *     tags: [Group Bookings]
 */
router
  .route('/group-bookings/:id/rooms/:roomIndex')
  .patch(authorize('admin', 'staff'), updateGroupBookingRoom);

// Credit Transaction Routes
/**
 * @swagger
 * /api/v1/corporate/credit/transactions:
 *   get:
 *     summary: Get all credit transactions
 *     tags: [Corporate Credit]
 *   post:
 *     summary: Create a new credit transaction
 *     tags: [Corporate Credit]
 */
router
  .route('/credit/transactions')
  .get(authorize('admin', 'staff'), getAllCreditTransactions)
  .post(
    authorize('admin', 'staff'),
    validate(creditTransactionValidation.create),
    createCreditTransaction
  );

/**
 * @swagger
 * /api/v1/corporate/credit/transactions/{id}:
 *   get:
 *     summary: Get a credit transaction by ID
 *     tags: [Corporate Credit]
 */
router
  .route('/credit/transactions/:id')
  .get(authorize('admin', 'staff'), getCreditTransaction);

/**
 * @swagger
 * /api/v1/corporate/credit/transactions/{id}/approve:
 *   patch:
 *     summary: Approve a credit transaction
 *     tags: [Corporate Credit]
 */
router
  .route('/credit/transactions/:id/approve')
  .patch(authorize('admin'), approveCreditTransaction);

/**
 * @swagger
 * /api/v1/corporate/credit/transactions/{id}/reject:
 *   patch:
 *     summary: Reject a credit transaction
 *     tags: [Corporate Credit]
 */
router
  .route('/credit/transactions/:id/reject')
  .patch(authorize('admin'), rejectCreditTransaction);

/**
 * @swagger
 * /api/v1/corporate/credit/overdue:
 *   get:
 *     summary: Get overdue credit transactions
 *     tags: [Corporate Credit]
 */
router
  .route('/credit/overdue')
  .get(authorize('admin', 'staff'), getOverdueTransactions);

/**
 * @swagger
 * /api/v1/corporate/credit/monthly-report:
 *   get:
 *     summary: Get monthly credit report
 *     tags: [Corporate Credit]
 */
router
  .route('/credit/monthly-report')
  .get(authorize('admin', 'staff'), getMonthlyCreditReport);

/**
 * @swagger
 * /api/v1/corporate/credit/summary/{companyId}:
 *   get:
 *     summary: Get credit summary for a specific company
 *     tags: [Corporate Credit]
 */
router
  .route('/credit/summary/:companyId')
  .get(authorize('admin', 'staff'), getCompanyCreditSummary);

/**
 * @swagger
 * /api/v1/corporate/credit/bulk-approve:
 *   patch:
 *     summary: Bulk approve credit transactions
 *     tags: [Corporate Credit]
 */
router
  .route('/credit/bulk-approve')
  .patch(authorize('admin'), bulkApproveCreditTransactions);

// GST Routes
/**
 * @swagger
 * /api/v1/corporate/gst/calculate:
 *   post:
 *     summary: Calculate GST for given amount and configuration
 *     tags: [GST]
 */
router
  .route('/gst/calculate')
  .post(authorize('admin', 'staff'), calculateGST);

/**
 * @swagger
 * /api/v1/corporate/gst/validate-number:
 *   post:
 *     summary: Validate GST number format
 *     tags: [GST]
 */
router
  .route('/gst/validate-number')
  .post(authorize('admin', 'staff'), validateGSTNumber);

/**
 * @swagger
 * /api/v1/corporate/gst/calculate-booking:
 *   post:
 *     summary: Calculate GST for booking items
 *     tags: [GST]
 */
router
  .route('/gst/calculate-booking')
  .post(authorize('admin', 'staff'), calculateBookingGST);

/**
 * @swagger
 * /api/v1/corporate/gst/reverse-calculate:
 *   post:
 *     summary: Calculate base amount from total amount including GST
 *     tags: [GST]
 */
router
  .route('/gst/reverse-calculate')
  .post(authorize('admin', 'staff'), reverseCalculateGST);

/**
 * @swagger
 * /api/v1/corporate/gst/generate-invoice-data/{bookingId}:
 *   get:
 *     summary: Generate GST invoice data for a booking
 *     tags: [GST]
 */
router
  .route('/gst/generate-invoice-data/:bookingId')
  .get(authorize('admin', 'staff'), generateGSTInvoiceData);

/**
 * @swagger
 * /api/v1/corporate/gst/state-codes:
 *   get:
 *     summary: Get all Indian state codes for GST
 *     tags: [GST]
 */
router
  .route('/gst/state-codes')
  .get(authorize('admin', 'staff'), getStateCodes);

/**
 * @swagger
 * /api/v1/corporate/gst/update-booking-gst/{bookingId}:
 *   patch:
 *     summary: Update GST details for a booking
 *     tags: [GST]
 */
router
  .route('/gst/update-booking-gst/:bookingId')
  .patch(authorize('admin', 'staff'), updateBookingGSTDetails);

// Admin Tracking Routes
/**
 * @swagger
 * /api/v1/corporate/admin/dashboard-overview:
 *   get:
 *     summary: Get corporate dashboard overview metrics
 *     tags: [Corporate Tracking]
 */
router
  .route('/admin/dashboard-overview')
  .get(authorize('admin'), getCorporateDashboardOverview);

/**
 * @swagger
 * /api/v1/corporate/admin/monthly-trends:
 *   get:
 *     summary: Get monthly trends for corporate bookings
 *     tags: [Corporate Tracking]
 */
router
  .route('/admin/monthly-trends')
  .get(authorize('admin'), getMonthlyTrends);

/**
 * @swagger
 * /api/v1/corporate/admin/company-performance:
 *   get:
 *     summary: Get detailed performance metrics for all corporate companies
 *     tags: [Corporate Tracking]
 */
router
  .route('/admin/company-performance')
  .get(authorize('admin'), getCompanyPerformance);

/**
 * @swagger
 * /api/v1/corporate/admin/booking-analytics:
 *   get:
 *     summary: Get detailed booking analytics for corporate bookings
 *     tags: [Corporate Tracking]
 */
router
  .route('/admin/booking-analytics')
  .get(authorize('admin'), getBookingAnalytics);

/**
 * @swagger
 * /api/v1/corporate/admin/credit-analysis:
 *   get:
 *     summary: Get comprehensive credit analysis for corporate companies
 *     tags: [Corporate Tracking]
 */
router
  .route('/admin/credit-analysis')
  .get(authorize('admin'), getCreditAnalysis);

export default router;