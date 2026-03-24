import express from 'express';
import posController from '../controllers/posController.js';
import posTaxRoutes from './posTax.js';
import measurementUnitRoutes from './measurementUnits.js';
import posAttributeRoutes from './posAttributes.js';
import billMessageRoutes from './billMessages.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { ensurePropertyAccess } from '../middleware/propertyAccess.js';
import { ensureTenantContext } from '../middleware/tenantIsolation.js';
// TODO: Add request body validation (e.g., express-validator or Joi) to POST/PUT routes
import { validate, schemas } from '../middleware/validation.js';

const router = express.Router();

// Outlet routes
router.post('/outlets', authenticate, ensureTenantContext, authorize(['admin', 'manager']), ensurePropertyAccess, posController.createOutlet);
router.get('/outlets', authenticate, ensureTenantContext, ensurePropertyAccess, posController.getOutlets);
router.put('/outlets/:id', authenticate, ensureTenantContext, authorize(['admin', 'manager']), ensurePropertyAccess, posController.updateOutlet);

// Menu routes
router.post('/menus', authenticate, ensureTenantContext, authorize(['admin', 'manager']), ensurePropertyAccess, posController.createMenu);
router.get('/menus/outlet/:outletId', authenticate, ensureTenantContext, ensurePropertyAccess, posController.getMenusByOutlet);
router.post('/menus/:menuId/items', authenticate, ensureTenantContext, authorize(['admin', 'manager']), ensurePropertyAccess, posController.addMenuItem);

// Order routes
router.post('/orders', authenticate, ensureTenantContext, ensurePropertyAccess, posController.createOrder);
router.get('/orders', authenticate, ensureTenantContext, ensurePropertyAccess, posController.getOrders);
router.put('/orders/:id/status', authenticate, ensureTenantContext, ensurePropertyAccess, posController.updateOrderStatus);
router.put('/orders/:id/payment', authenticate, ensureTenantContext, ensurePropertyAccess, posController.processPayment);

// Dashboard routes
router.get('/dashboard/stats', authenticate, ensureTenantContext, ensurePropertyAccess, posController.getDashboardStats);

// Calculation routes
router.post('/calculate/order-totals', authenticate, ensureTenantContext, ensurePropertyAccess, posController.calculateOrderTotals);
router.post('/calculate/billing-totals', authenticate, ensureTenantContext, ensurePropertyAccess, posController.calculateBillingTotals);

// Reporting routes
router.get('/reports/sales', authenticate, ensureTenantContext, authorize(['admin', 'manager']), ensurePropertyAccess, posController.getSalesReport);

// Tax management routes
router.use('/taxes', posTaxRoutes);

// Measurement unit routes
router.use('/measurement-units', measurementUnitRoutes);

// POS attribute routes
router.use('/attributes', posAttributeRoutes);

// Bill message routes
router.use('/bill-messages', billMessageRoutes);

export default router;