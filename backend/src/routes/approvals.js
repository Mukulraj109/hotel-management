import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { ensurePropertyAccess } from '../middleware/propertyAccess.js';
import {
  createApprovalRequest,
  getApprovalRequests,
  getApprovalRequestById,
  approveRequest,
  rejectRequest,
  cancelRequest,
  getApprovalStats,
  getPendingCount
} from '../controllers/approvalController.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Approvals
 *   description: Approval request management for frontdesk operations
 */

/**
 * @swagger
 * /approvals:
 *   post:
 *     summary: Create a new approval request
 *     tags: [Approvals]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - requestType
 *               - targetResource
 *               - targetResourceId
 *               - requestData
 *             properties:
 *               requestType:
 *                 type: string
 *                 enum: [price_change, rate_adjustment, room_type_add, room_type_delete]
 *               targetResource:
 *                 type: string
 *                 enum: [room_type, booking, room]
 *               targetResourceId:
 *                 type: string
 *               requestData:
 *                 type: object
 *                 properties:
 *                   original:
 *                     type: object
 *                   proposed:
 *                     type: object
 *     responses:
 *       201:
 *         description: Approval request created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Access denied
 */
router.post(
  '/',
  authenticate,
  ensurePropertyAccess,
  authorize('frontdesk', 'manager', 'admin'),
  createApprovalRequest
);

/**
 * @swagger
 * /approvals:
 *   get:
 *     summary: Get all approval requests
 *     description: Frontdesk users see only their requests, managers/admins see all hotel requests
 *     tags: [Approvals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *       - in: query
 *         name: requestType
 *         schema:
 *           type: string
 *           enum: [price_change, rate_adjustment, room_type_add, room_type_delete]
 *       - in: query
 *         name: targetResource
 *         schema:
 *           type: string
 *           enum: [room_type, booking, room]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: List of approval requests
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Access denied
 */
router.get(
  '/',
  authenticate,
  ensurePropertyAccess,
  authorize('frontdesk', 'manager', 'admin'),
  getApprovalRequests
);

/**
 * @swagger
 * /approvals/my-requests:
 *   get:
 *     summary: Get my approval requests (alias for GET /approvals for frontdesk users)
 *     tags: [Approvals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *     responses:
 *       200:
 *         description: List of my approval requests
 *       401:
 *         description: Not authenticated
 */
router.get(
  '/my-requests',
  authenticate,
  ensurePropertyAccess,
  authorize('frontdesk', 'manager', 'admin'),
  getApprovalRequests
);

/**
 * @swagger
 * /approvals/pending-count:
 *   get:
 *     summary: Get count of pending approval requests
 *     tags: [Approvals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Count of pending requests
 *       401:
 *         description: Not authenticated
 */
router.get(
  '/pending-count',
  authenticate,
  ensurePropertyAccess,
  authorize('frontdesk', 'manager', 'admin'),
  getPendingCount
);

/**
 * @swagger
 * /approvals/stats:
 *   get:
 *     summary: Get approval statistics
 *     tags: [Approvals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Approval statistics
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Access denied (managers and admins only)
 */
router.get(
  '/stats',
  authenticate,
  ensurePropertyAccess,
  authorize('manager', 'admin'),
  getApprovalStats
);

/**
 * @swagger
 * /approvals/{id}:
 *   get:
 *     summary: Get a single approval request by ID
 *     tags: [Approvals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Approval request details
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Access denied
 *       404:
 *         description: Approval request not found
 */
router.get(
  '/:id',
  authenticate,
  ensurePropertyAccess,
  authorize('frontdesk', 'manager', 'admin'),
  getApprovalRequestById
);

/**
 * @swagger
 * /approvals/{id}/approve:
 *   put:
 *     summary: Approve an approval request and apply changes
 *     tags: [Approvals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reviewNotes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Approval request approved and changes applied
 *       400:
 *         description: Invalid request or status
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Access denied (managers and admins only)
 *       404:
 *         description: Approval request not found
 */
router.put(
  '/:id/approve',
  authenticate,
  ensurePropertyAccess,
  authorize('manager', 'admin'),
  approveRequest
);

/**
 * @swagger
 * /approvals/{id}/reject:
 *   put:
 *     summary: Reject an approval request
 *     tags: [Approvals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reviewNotes
 *             properties:
 *               reviewNotes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Approval request rejected
 *       400:
 *         description: Invalid request or status
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Access denied (managers and admins only)
 *       404:
 *         description: Approval request not found
 */
router.put(
  '/:id/reject',
  authenticate,
  ensurePropertyAccess,
  authorize('manager', 'admin'),
  rejectRequest
);

/**
 * @swagger
 * /approvals/{id}/cancel:
 *   put:
 *     summary: Cancel a pending approval request (requester only)
 *     tags: [Approvals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Approval request cancelled
 *       400:
 *         description: Cannot cancel non-pending request
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Access denied (requester only)
 *       404:
 *         description: Approval request not found
 */
router.put(
  '/:id/cancel',
  authenticate,
  ensurePropertyAccess,
  authorize('frontdesk', 'manager', 'admin'),
  cancelRequest
);

/**
 * @swagger
 * /approvals/{id}:
 *   delete:
 *     summary: Cancel a pending approval request (requester only) - Alternative method
 *     tags: [Approvals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Approval request cancelled
 *       400:
 *         description: Cannot cancel non-pending request
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Access denied (requester only)
 *       404:
 *         description: Approval request not found
 */
router.delete(
  '/:id',
  authenticate,
  ensurePropertyAccess,
  authorize('frontdesk', 'manager', 'admin'),
  cancelRequest
);

export default router;
