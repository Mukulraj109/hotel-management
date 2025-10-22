import express from 'express';
import posController from '../controllers/posController.js';
import posTaxRoutes from './posTax.js';
import measurementUnitRoutes from './measurementUnits.js';
import posAttributeRoutes from './posAttributes.js';
import billMessageRoutes from './billMessages.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { ensurePropertyAccess } from '../middleware/propertyAccess.js';

const router = express.Router();

// Outlet routes
router.post('/outlets', authenticate, authorize(['admin', 'manager']), ensurePropertyAccess, posController.createOutlet);
router.get('/outlets', authenticate, ensurePropertyAccess, posController.getOutlets);
router.put('/outlets/:id', authenticate, authorize(['admin', 'manager']), ensurePropertyAccess, posController.updateOutlet);

// Menu routes
router.post('/menus', authenticate, authorize(['admin', 'manager']), ensurePropertyAccess, posController.createMenu);
router.get('/menus/outlet/:outletId', authenticate, ensurePropertyAccess, posController.getMenusByOutlet);
router.post('/menus/:menuId/items', authenticate, authorize(['admin', 'manager']), ensurePropertyAccess, posController.addMenuItem);

// Order routes
router.post('/orders', authenticate, ensurePropertyAccess, posController.createOrder);
router.get('/orders', authenticate, ensurePropertyAccess, posController.getOrders);
router.put('/orders/:id/status', authenticate, ensurePropertyAccess, posController.updateOrderStatus);
router.put('/orders/:id/payment', authenticate, ensurePropertyAccess, posController.processPayment);

// Dashboard routes
router.get('/dashboard/stats', authenticate, ensurePropertyAccess, posController.getDashboardStats);

// Calculation routes
router.post('/calculate/order-totals', authenticate, ensurePropertyAccess, posController.calculateOrderTotals);
router.post('/calculate/billing-totals', authenticate, ensurePropertyAccess, posController.calculateBillingTotals);

// Reporting routes
router.get('/reports/sales', authenticate, authorize(['admin', 'manager']), ensurePropertyAccess, posController.getSalesReport);

// Tax management routes
router.use('/taxes', posTaxRoutes);

// Measurement unit routes
router.use('/measurement-units', measurementUnitRoutes);

// POS attribute routes
router.use('/attributes', posAttributeRoutes);

// Bill message routes
router.use('/bill-messages', billMessageRoutes);

export default router;