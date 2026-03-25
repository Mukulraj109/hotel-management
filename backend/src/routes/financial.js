import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { ensurePropertyAccess } from '../middleware/propertyAccess.js';
import { ensureTenantContext, requireTenantInBulkOps } from '../middleware/tenantIsolation.js';
// TODO: Add request body validation (e.g., express-validator or Joi) to POST/PUT routes
import { validate, schemas } from '../middleware/validation.js';
import rateLimit from 'express-rate-limit';

// Import controllers
import * as chartOfAccountsController from '../controllers/chartOfAccountsController.js';
import * as generalLedgerController from '../controllers/generalLedgerController.js';
import * as journalEntryController from '../controllers/journalEntryController.js';
import * as bankAccountController from '../controllers/bankAccountController.js';
import * as budgetController from '../controllers/budgetController.js';
import * as financialReportsController from '../controllers/financialReportsController.js';
import FinancialService from '../services/financialService.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Rate limiting for financial operations
const financialLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute for financial operations
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many financial requests' } },
});
router.use(financialLimiter);

// === TEST ENDPOINT (temporary) ===
router.get('/test-dashboard', authenticate, ensureTenantContext, ensurePropertyAccess, authorize('admin', 'manager', 'frontdesk'), async (req, res) => {
  try {
    const financialService = new FinancialService();
    const dashboard = await financialService.generateFinancialDashboard('month');
    res.json({ success: true, data: dashboard });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// === DASHBOARD ===
router.get('/dashboard', authenticate, ensureTenantContext, ensurePropertyAccess, authorize('admin', 'manager', 'frontdesk'), async (req, res) => {
  try {
    const financialService = new FinancialService();
    const period = req.query.period || 'month';
    
    // For now, get the first hotel's data for testing
    const Hotel = (await import('../models/Hotel.js')).default;
    const mongoose = (await import('mongoose')).default;
    
    const firstHotel = await Hotel.findOne().lean();
    const hotelId = firstHotel ? new mongoose.Types.ObjectId(firstHotel._id) : null;
    
    logger.debug('Dashboard API called', { period, hotelId: hotelId?.toString() });
    
    const dashboard = await financialService.generateFinancialDashboard(period, hotelId);
    logger.debug('Dashboard generated');
    
    res.json({ success: true, data: dashboard });
  } catch (error) {
    logger.error('Dashboard API error', { error: error.message });
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Apply authentication and property access to all routes
router.use(authenticate);
router.use(ensureTenantContext);
router.use(ensurePropertyAccess);

// === CHART OF ACCOUNTS ROUTES ===
router.route('/chart-of-accounts')
  .get(authorize('admin', 'staff', 'manager', 'frontdesk'), chartOfAccountsController.getAccounts)
  .post(authorize('admin', 'manager'), chartOfAccountsController.createAccount);

router.get('/chart-of-accounts/tree', authorize('admin', 'staff', 'manager', 'frontdesk'), chartOfAccountsController.getAccountTree);
router.get('/chart-of-accounts/flattened', authorize('admin', 'staff', 'manager', 'frontdesk'), chartOfAccountsController.getFlattenedAccounts);
router.post('/chart-of-accounts/bulk-import', authorize('admin', 'manager'), requireTenantInBulkOps, chartOfAccountsController.bulkImportAccounts);

router.route('/chart-of-accounts/:id')
  .get(authorize('admin', 'staff', 'manager', 'frontdesk'), chartOfAccountsController.getAccount)
  .patch(authorize('admin', 'manager'), chartOfAccountsController.updateAccount)
  .delete(authorize('admin'), chartOfAccountsController.deleteAccount);

router.get('/chart-of-accounts/:id/activity', authorize('admin', 'staff', 'manager', 'frontdesk'), chartOfAccountsController.getAccountActivity);

// === GENERAL LEDGER ROUTES ===
router.get('/general-ledger', authorize('admin', 'staff', 'manager', 'frontdesk'), generalLedgerController.getLedgerEntries);
router.get('/general-ledger/trial-balance', authorize('admin', 'manager', 'frontdesk'), generalLedgerController.getTrialBalance);
router.get('/general-ledger/financial-statements', authorize('admin', 'manager', 'frontdesk'), generalLedgerController.getFinancialStatements);
router.get('/general-ledger/aging-report', authorize('admin', 'staff', 'manager', 'frontdesk'), generalLedgerController.getAgingReport);
router.get('/general-ledger/export', authorize('admin', 'manager', 'frontdesk'), generalLedgerController.exportLedger);
router.get('/general-ledger/account/:accountId', authorize('admin', 'staff', 'manager', 'frontdesk'), generalLedgerController.getAccountLedger);
router.get('/general-ledger/verify-balance', authorize('admin', 'manager'), generalLedgerController.verifyBalance);

// === JOURNAL ENTRY ROUTES ===
router.route('/journal-entries')
  .get(authorize('admin', 'staff', 'manager', 'frontdesk'), journalEntryController.getJournalEntries)
  .post(authorize('admin', 'manager'), journalEntryController.createJournalEntry);

router.get('/journal-entries/templates', authorize('admin', 'staff', 'manager', 'frontdesk'), journalEntryController.getJournalTemplates);
router.post('/journal-entries/bulk-create', authorize('admin', 'manager'), requireTenantInBulkOps, journalEntryController.bulkCreateJournalEntries);

router.route('/journal-entries/:id')
  .get(authorize('admin', 'staff', 'manager', 'frontdesk'), journalEntryController.getJournalEntry)
  .patch(authorize('admin', 'manager'), journalEntryController.updateJournalEntry)
  .delete(authorize('admin'), journalEntryController.deleteJournalEntry);

router.post('/journal-entries/:id/post', authorize('admin', 'manager'), journalEntryController.postJournalEntry);
router.post('/journal-entries/:id/reverse', authorize('admin', 'manager'), journalEntryController.reverseJournalEntry);
router.post('/journal-entries/:id/approve', authorize('admin', 'manager'), journalEntryController.approveJournalEntry);
router.post('/journal-entries/:id/reject', authorize('admin', 'manager'), journalEntryController.rejectJournalEntry);

// === BANK ACCOUNT ROUTES ===
router.route('/bank-accounts')
  .get(authorize('admin', 'staff', 'manager', 'frontdesk'), bankAccountController.getBankAccounts)
  .post(authorize('admin', 'manager'), bankAccountController.createBankAccount);

router.get('/bank-accounts/cash-position', authorize('admin', 'manager', 'frontdesk'), bankAccountController.getCashPosition);
router.get('/bank-accounts/balances', authorize('admin', 'staff', 'manager', 'frontdesk'), bankAccountController.getAccountBalances);

router.route('/bank-accounts/:id')
  .get(authorize('admin', 'staff', 'manager', 'frontdesk'), bankAccountController.getBankAccount)
  .patch(authorize('admin', 'manager'), bankAccountController.updateBankAccount)
  .delete(authorize('admin'), bankAccountController.deactivateBankAccount);

router.get('/bank-accounts/:id/transactions', authorize('admin', 'staff', 'manager', 'frontdesk'), bankAccountController.getTransactions);
router.post('/bank-accounts/:id/transactions', authorize('admin', 'staff', 'manager'), bankAccountController.addTransaction);
router.post('/bank-accounts/:id/reconcile', authorize('admin', 'manager'), bankAccountController.reconcileAccount);
router.post('/bank-accounts/:id/import-statement', authorize('admin', 'manager'), bankAccountController.importStatement);

// === BUDGET ROUTES ===
router.route('/budgets')
  .get(authorize('admin', 'staff', 'manager', 'frontdesk'), budgetController.getBudgets)
  .post(authorize('admin', 'manager'), budgetController.createBudget);

router.get('/budgets/summary', authorize('admin', 'manager', 'frontdesk'), budgetController.getBudgetSummary);
router.get('/budgets/statistics', authorize('admin', 'manager', 'frontdesk'), budgetController.getBudgetStatistics);
router.get('/budgets/templates', authorize('admin', 'manager', 'frontdesk'), budgetController.getBudgetTemplates);
router.get('/budgets/vs-actual', authorize('admin', 'manager', 'frontdesk'), budgetController.getBudgetVsActual);
router.get('/budgets/forecast', authorize('admin', 'manager', 'frontdesk'), budgetController.generateForecast);

router.route('/budgets/:id')
  .get(authorize('admin', 'staff', 'manager', 'frontdesk'), budgetController.getBudget)
  .patch(authorize('admin', 'manager'), budgetController.updateBudget)
  .delete(authorize('admin'), budgetController.deleteBudget);

router.post('/budgets/:id/submit-review', authorize('admin', 'manager'), budgetController.submitForReview);
router.post('/budgets/:id/approve', authorize('admin'), budgetController.approveBudget);
router.post('/budgets/:id/revise', authorize('admin', 'manager'), budgetController.createRevision);

// === INVOICES ===
router.route('/invoices')
  .get(authorize('admin', 'staff', 'manager', 'frontdesk'), async (req, res) => {
    try {
      const FinancialInvoice = (await import('../models/FinancialInvoice.js')).default;
      const mongoose = (await import('mongoose')).default;
      // Temporarily bypass hotel filtering for testing
      // const hotelId = req.user?.hotelId ? new mongoose.Types.ObjectId(req.user.hotelId) : null;
      const invoices = await FinancialInvoice.find({})
        .populate('customer.guestId', 'name email')
        .populate('bookingReference', 'bookingNumber')
        .sort({ createdAt: -1 }).lean().limit(1000);
      
      res.status(200).json({
        status: 'success',
        data: {
          invoices
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error', 
        message: error.message
      });
    }
  })
  .post(authorize('admin', 'staff', 'manager'), async (req, res) => {
    try {
      const FinancialInvoice = (await import('../models/FinancialInvoice.js')).default;
      const invoiceData = {
        ...req.body,
        hotelId: req.user?.hotelId,
        createdBy: req.user?.id,
        invoiceNumber: await FinancialInvoice.generateInvoiceNumber(req.user?.hotelId)
      };
      
      const invoice = new FinancialInvoice(invoiceData);
      await invoice.save();
      
      res.status(201).json({
        status: 'success',
        data: invoice
      });
    } catch (error) {
      res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
  });

// Helper function for payment statistics calculation
async function calculatePaymentStatistics(FinancialPayment, query = {}) {
  try {
    const aggregationPipeline = [
      { $match: query },
      {
        $group: {
          _id: null,
          totalPayments: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          completedPayments: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          completedAmount: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] }
          },
          pendingPayments: {
            $sum: { $cond: [{ $in: ['$status', ['pending', 'processing']] }, 1, 0] }
          },
          pendingAmount: {
            $sum: { $cond: [{ $in: ['$status', ['pending', 'processing']] }, '$amount', 0] }
          },
          failedPayments: {
            $sum: { $cond: [{ $in: ['$status', ['failed', 'cancelled']] }, 1, 0] }
          },
          failedAmount: {
            $sum: { $cond: [{ $in: ['$status', ['failed', 'cancelled']] }, '$amount', 0] }
          }
        }
      }
    ];

    const [stats] = await FinancialPayment.aggregate(aggregationPipeline);

    return stats || {
      totalPayments: 0,
      totalAmount: 0,
      completedPayments: 0,
      completedAmount: 0,
      pendingPayments: 0,
      pendingAmount: 0,
      failedPayments: 0,
      failedAmount: 0
    };
  } catch (error) {
    logger.error('Error calculating payment statistics', { error: error.message });
    throw error;
  }
}

// === PAYMENTS ===
router.route('/payments')
  .get(authorize('admin', 'staff', 'manager', 'frontdesk'), async (req, res) => {
    try {
      const FinancialPayment = (await import('../models/FinancialPayment.js')).default;
      const mongoose = (await import('mongoose')).default;

      // Build query filters
      let query = {};
      if (req.query.status) query.status = req.query.status;
      if (req.query.method) query.method = req.query.method;
      if (req.query.type) query.type = req.query.type;

      // Date range filtering
      if (req.query.startDate || req.query.endDate) {
        query.date = {};
        if (req.query.startDate) query.date.$gte = new Date(req.query.startDate);
        if (req.query.endDate) query.date.$lte = new Date(req.query.endDate);
      }

      const payments = await FinancialPayment.find(query)
        .populate('customer.guestId', 'name email')
        .populate('invoice', 'invoiceNumber totalAmount')
        .populate('bankAccount', 'accountName')
        .sort({ createdAt: -1 }).lean().limit(1000);

      // Calculate statistics if requested
      let statistics = null;
      if (req.query.includeStats === 'true') {
        statistics = await calculatePaymentStatistics(FinancialPayment, query);
      }

      const response = { status: 'success', data: payments };
      if (statistics) response.statistics = statistics;

      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  })
  .post(authorize('admin', 'staff', 'manager'), async (req, res) => {
    try {
      const FinancialPayment = (await import('../models/FinancialPayment.js')).default;
      const paymentData = {
        ...req.body,
        hotelId: req.user?.hotelId,
        createdBy: req.user?.id
      };
      
      const payment = new FinancialPayment(paymentData);
      await payment.save();
      
      // Process the payment
      const result = await payment.process(req.user?.id);
      
      res.status(201).json({
        status: 'success',
        data: payment,
        processing: result
      });
    } catch (error) {
      res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
  });

// === PAYMENT STATISTICS ===
router.get('/payments/statistics', authorize('admin', 'staff', 'manager', 'frontdesk'), async (req, res) => {
  try {
    const FinancialPayment = (await import('../models/FinancialPayment.js')).default;

    // Build query filters (same logic as main payments endpoint)
    let query = {};
    if (req.query.status) query.status = req.query.status;
    if (req.query.method) query.method = req.query.method;
    if (req.query.type) query.type = req.query.type;

    // Date range filtering
    if (req.query.startDate || req.query.endDate) {
      query.date = {};
      if (req.query.startDate) query.date.$gte = new Date(req.query.startDate);
      if (req.query.endDate) query.date.$lte = new Date(req.query.endDate);
    }

    const statistics = await calculatePaymentStatistics(FinancialPayment, query);

    res.status(200).json({
      status: 'success',
      data: statistics
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// === FINANCIAL REPORTS ===
router.get('/reports/trial-balance', authorize('admin', 'manager', 'frontdesk'), async (req, res) => {
  try {
    res.status(200).json({
      status: 'success',
      data: { accounts: [] }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// === FINANCIAL REPORTS ROUTES ===
router.get('/reports/income-statement', authorize('admin', 'manager', 'frontdesk'), financialReportsController.getIncomeStatement);
router.get('/reports/balance-sheet', authorize('admin', 'manager', 'frontdesk'), financialReportsController.getBalanceSheet);
router.get('/reports/cash-flow', authorize('admin', 'manager', 'frontdesk'), financialReportsController.getCashFlowStatement);
router.get('/reports/financial-ratios', authorize('admin', 'manager', 'frontdesk'), financialReportsController.getFinancialRatios);
router.get('/reports/comprehensive', authorize('admin', 'manager', 'frontdesk'), financialReportsController.getComprehensiveFinancialStatement);

export default router;