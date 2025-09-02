import express from 'express';
import financialController from '../controllers/financialController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Chart of Accounts Routes
router.post('/accounts', authenticate, authorize(['admin', 'accountant', 'manager']), financialController.createAccount);
router.get('/accounts', authenticate, authorize(['admin', 'accountant', 'manager', 'front_desk']), financialController.getAccounts);
router.put('/accounts/:id', authenticate, authorize(['admin', 'accountant']), financialController.updateAccount);
router.delete('/accounts/:id', authenticate, authorize(['admin', 'accountant']), financialController.deleteAccount);

// General Ledger Routes
router.post('/journal-entries', authenticate, authorize(['admin', 'accountant']), financialController.createJournalEntry);
router.get('/journal-entries', authenticate, authorize(['admin', 'accountant', 'manager']), financialController.getJournalEntries);
router.post('/journal-entries/:id/reverse', authenticate, authorize(['admin', 'accountant']), financialController.reverseJournalEntry);

// Invoice Management Routes
router.post('/invoices', authenticate, authorize(['admin', 'accountant', 'manager', 'front_desk']), financialController.createInvoice);
router.get('/invoices', authenticate, authorize(['admin', 'accountant', 'manager', 'front_desk']), financialController.getInvoices);
router.put('/invoices/:id', authenticate, authorize(['admin', 'accountant', 'manager']), financialController.updateInvoice);

// Payment Management Routes
router.post('/payments', authenticate, authorize(['admin', 'accountant', 'manager', 'front_desk']), financialController.createPayment);
router.get('/payments', authenticate, authorize(['admin', 'accountant', 'manager', 'front_desk']), financialController.getPayments);

// Bank Account Management Routes
router.post('/bank-accounts', authenticate, authorize(['admin', 'accountant']), financialController.createBankAccount);
router.get('/bank-accounts', authenticate, authorize(['admin', 'accountant', 'manager']), financialController.getBankAccounts);
router.put('/bank-accounts/:id', authenticate, authorize(['admin', 'accountant']), financialController.updateBankAccount);

// Tax Configuration Routes
router.post('/tax-config', authenticate, authorize(['admin', 'accountant']), financialController.createTaxConfig);
router.get('/tax-config', authenticate, authorize(['admin', 'accountant', 'manager']), financialController.getTaxConfigs);

// Budget Management Routes
router.post('/budgets', authenticate, authorize(['admin', 'manager']), financialController.createBudget);
router.get('/budgets', authenticate, authorize(['admin', 'manager', 'accountant']), financialController.getBudgets);
router.post('/budgets/:budgetId/update-actuals', authenticate, authorize(['admin', 'accountant']), financialController.updateBudgetActuals);

// Financial Reports Routes
router.post('/reports/generate', authenticate, authorize(['admin', 'accountant', 'manager']), financialController.generateReport);
router.get('/reports', authenticate, authorize(['admin', 'accountant', 'manager']), financialController.getReports);

// Cost Center Management Routes
router.post('/cost-centers', authenticate, authorize(['admin', 'manager']), financialController.createCostCenter);
router.get('/cost-centers', authenticate, authorize(['admin', 'manager', 'accountant']), financialController.getCostCenters);

// Dashboard and Analytics Routes
router.get('/dashboard', authenticate, authorize(['admin', 'accountant', 'manager']), financialController.getFinancialDashboard);

// Reconciliation Routes
router.post('/reconciliation/bank', authenticate, authorize(['admin', 'accountant']), financialController.bankReconciliation);

export default router;