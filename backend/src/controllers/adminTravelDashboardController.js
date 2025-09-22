import TravelAgent from '../models/TravelAgent.js';
import TravelAgentBooking from '../models/TravelAgentBooking.js';
import TravelAgentRates from '../models/TravelAgentRates.js';
import { catchAsync } from '../utils/catchAsync.js';
import { ApplicationError } from '../middleware/errorHandler.js';
import mongoose from 'mongoose';

/**
 * @swagger
 * components:
 *   tags:
 *     name: AdminTravelDashboard
 *     description: Admin travel dashboard endpoints
 */

/**
 * @swagger
 * /api/v1/admin/travel-dashboard:
 *   get:
 *     summary: Get travel dashboard overview
 *     tags: [AdminTravelDashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 365d]
 *           default: 30d
 *       - in: query
 *         name: hotelId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Travel dashboard data
 */
export const getTravelDashboardOverview = catchAsync(async (req, res) => {
  const { period = '30d', hotelId } = req.query;

  // Calculate date range based on period
  const periodMap = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 };
  const days = periodMap[period] || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  let baseQuery = { isActive: true };
  let bookingQuery = { isActive: true, createdAt: { $gte: startDate } };

  // Filter by hotel if specified
  if (hotelId && hotelId !== 'all') {
    baseQuery.hotelId = mongoose.Types.ObjectId(hotelId);
    bookingQuery.hotelId = mongoose.Types.ObjectId(hotelId);
  } else if (req.user.hotelId) {
    // If user has hotel restriction, apply it
    baseQuery.hotelId = req.user.hotelId;
    bookingQuery.hotelId = req.user.hotelId;
  }

  const [
    totalAgents,
    activeAgents,
    pendingApprovals,
    totalBookings,
    revenueData,
    commissionData,
    topPerformers,
    recentBookings,
    monthlyTrends
  ] = await Promise.all([
    // Total travel agents
    TravelAgent.countDocuments(baseQuery),

    // Active travel agents
    TravelAgent.countDocuments({ ...baseQuery, status: 'active' }),

    // Pending approvals
    TravelAgent.countDocuments({ ...baseQuery, status: 'pending_approval' }),

    // Total bookings in period
    TravelAgentBooking.countDocuments(bookingQuery),

    // Revenue data
    TravelAgentBooking.aggregate([
      { $match: bookingQuery },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$pricing.totalAmount' },
          averageBookingValue: { $avg: '$pricing.totalAmount' },
          totalBookings: { $sum: 1 }
        }
      }
    ]),

    // Commission data
    TravelAgentBooking.aggregate([
      { $match: bookingQuery },
      {
        $group: {
          _id: null,
          totalCommission: { $sum: '$commission.totalCommission' },
          pendingCommission: {
            $sum: {
              $cond: [
                { $eq: ['$commission.paymentStatus', 'pending'] },
                '$commission.totalCommission',
                0
              ]
            }
          },
          paidCommission: {
            $sum: {
              $cond: [
                { $eq: ['$commission.paymentStatus', 'paid'] },
                '$commission.totalCommission',
                0
              ]
            }
          }
        }
      }
    ]),

    // Top performing agents
    TravelAgentBooking.aggregate([
      { $match: bookingQuery },
      {
        $group: {
          _id: '$travelAgentId',
          totalBookings: { $sum: 1 },
          totalRevenue: { $sum: '$pricing.totalAmount' },
          totalCommission: { $sum: '$commission.totalCommission' }
        }
      },
      {
        $lookup: {
          from: 'travelagents',
          localField: '_id',
          foreignField: '_id',
          as: 'agent'
        }
      },
      {
        $project: {
          agentName: { $arrayElemAt: ['$agent.companyName', 0] },
          agentCode: { $arrayElemAt: ['$agent.agentCode', 0] },
          totalBookings: 1,
          totalRevenue: 1,
          totalCommission: 1,
          averageBookingValue: { $divide: ['$totalRevenue', '$totalBookings'] }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 5 }
    ]),

    // Recent bookings
    TravelAgentBooking.find(bookingQuery)
      .populate('travelAgentId', 'companyName agentCode')
      .populate('hotelId', 'name')
      .sort({ createdAt: -1 })
      .limit(10),

    // Monthly trends for the current year
    TravelAgentBooking.aggregate([
      {
        $match: {
          ...bookingQuery,
          createdAt: {
            $gte: new Date(new Date().getFullYear(), 0, 1),
            $lt: new Date(new Date().getFullYear() + 1, 0, 1)
          }
        }
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          bookings: { $sum: 1 },
          revenue: { $sum: '$pricing.totalAmount' },
          commission: { $sum: '$commission.totalCommission' }
        }
      },
      { $sort: { '_id': 1 } }
    ])
  ]);

  // Process the aggregated data
  const revenue = revenueData[0] || { totalRevenue: 0, averageBookingValue: 0, totalBookings: 0 };
  const commission = commissionData[0] || { totalCommission: 0, pendingCommission: 0, paidCommission: 0 };

  // Calculate growth metrics (simplified - would need previous period data for accurate calculation)
  const agentGrowth = activeAgents > 0 ? ((activeAgents - pendingApprovals) / activeAgents * 100) : 0;
  const revenueGrowth = revenue.totalRevenue > 0 ? 12.5 : 0; // Placeholder - would calculate from previous period

  res.json({
    success: true,
    data: {
      overview: {
        totalAgents,
        activeAgents,
        pendingApprovals,
        totalBookings,
        agentGrowth: Math.round(agentGrowth * 100) / 100,
        revenueGrowth: Math.round(revenueGrowth * 100) / 100
      },
      revenue: {
        totalRevenue: revenue.totalRevenue,
        averageBookingValue: Math.round(revenue.averageBookingValue || 0),
        totalBookings: revenue.totalBookings
      },
      commission: {
        totalCommission: commission.totalCommission,
        pendingCommission: commission.pendingCommission,
        paidCommission: commission.paidCommission,
        commissionRate: revenue.totalRevenue > 0
          ? Math.round((commission.totalCommission / revenue.totalRevenue * 100) * 100) / 100
          : 0
      },
      topPerformers,
      recentBookings,
      monthlyTrends,
      period,
      generatedAt: new Date()
    }
  });
});

/**
 * @swagger
 * /api/v1/admin/travel-dashboard/analytics:
 *   get:
 *     summary: Get detailed travel analytics
 *     tags: [AdminTravelDashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 365d]
 *       - in: query
 *         name: hotelId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Detailed analytics data
 */
export const getTravelAnalytics = catchAsync(async (req, res) => {
  const { period = '30d', hotelId } = req.query;

  const periodMap = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 };
  const days = periodMap[period] || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  let baseQuery = { isActive: true, createdAt: { $gte: startDate } };

  if (hotelId && hotelId !== 'all') {
    baseQuery.hotelId = mongoose.Types.ObjectId(hotelId);
  } else if (req.user.hotelId) {
    baseQuery.hotelId = req.user.hotelId;
  }

  const [
    bookingStatusBreakdown,
    paymentStatusBreakdown,
    seasonalityAnalysis,
    leadTimeAnalysis,
    commissionTiers,
    averageStayDuration
  ] = await Promise.all([
    // Booking status breakdown
    TravelAgentBooking.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: '$bookingStatus',
          count: { $sum: 1 },
          revenue: { $sum: '$pricing.totalAmount' }
        }
      }
    ]),

    // Payment status breakdown
    TravelAgentBooking.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: '$paymentDetails.status',
          count: { $sum: 1 },
          amount: { $sum: '$pricing.totalAmount' }
        }
      }
    ]),

    // Seasonality analysis
    TravelAgentBooking.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: '$performance.seasonality',
          count: { $sum: 1 },
          revenue: { $sum: '$pricing.totalAmount' },
          avgCommission: { $avg: '$commission.rate' }
        }
      }
    ]),

    // Lead time analysis
    TravelAgentBooking.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                { case: { $lte: ['$performance.leadTime', 7] }, then: '0-7 days' },
                { case: { $lte: ['$performance.leadTime', 30] }, then: '8-30 days' },
                { case: { $lte: ['$performance.leadTime', 90] }, then: '31-90 days' },
                { case: { $gt: ['$performance.leadTime', 90] }, then: '90+ days' }
              ],
              default: 'Unknown'
            }
          },
          count: { $sum: 1 },
          avgLeadTime: { $avg: '$performance.leadTime' }
        }
      }
    ]),

    // Commission tier analysis
    TravelAgentBooking.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                { case: { $lt: ['$commission.rate', 5] }, then: '0-5%' },
                { case: { $lt: ['$commission.rate', 10] }, then: '5-10%' },
                { case: { $lt: ['$commission.rate', 15] }, then: '10-15%' },
                { case: { $gte: ['$commission.rate', 15] }, then: '15%+' }
              ],
              default: 'Unknown'
            }
          },
          count: { $sum: 1 },
          totalCommission: { $sum: '$commission.totalCommission' },
          avgRate: { $avg: '$commission.rate' }
        }
      }
    ]),

    // Average stay duration
    TravelAgentBooking.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: null,
          avgNights: { $avg: '$bookingDetails.nights' },
          avgRooms: { $avg: '$guestDetails.totalRooms' },
          avgGuests: { $avg: '$guestDetails.totalGuests' }
        }
      }
    ])
  ]);

  res.json({
    success: true,
    data: {
      bookingStatusBreakdown,
      paymentStatusBreakdown,
      seasonalityAnalysis,
      leadTimeAnalysis,
      commissionTiers,
      averageStayMetrics: averageStayDuration[0] || {
        avgNights: 0,
        avgRooms: 0,
        avgGuests: 0
      },
      period,
      generatedAt: new Date()
    }
  });
});

/**
 * @swagger
 * /api/v1/admin/travel-dashboard/pending-commissions:
 *   get:
 *     summary: Get pending commission payments
 *     tags: [AdminTravelDashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Pending commission payments
 */
export const getPendingCommissions = catchAsync(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  let hotelId = req.user.hotelId;
  if (req.query.hotelId && req.query.hotelId !== 'all') {
    hotelId = req.query.hotelId;
  }

  const pendingCommissions = await TravelAgentBooking.getPendingCommissions(hotelId);

  // Paginate results
  const paginatedCommissions = pendingCommissions.slice(skip, skip + parseInt(limit));
  const total = pendingCommissions.length;

  // Calculate summary
  const totalPendingAmount = pendingCommissions.reduce((sum, booking) =>
    sum + booking.commission.totalCommission, 0
  );

  res.json({
    success: true,
    data: {
      commissions: paginatedCommissions,
      summary: {
        totalPendingAmount,
        totalBookings: total,
        averageCommission: total > 0 ? totalPendingAmount / total : 0
      },
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNext: skip + paginatedCommissions.length < total,
        hasPrev: page > 1
      }
    }
  });
});

/**
 * @swagger
 * /api/v1/admin/travel-dashboard/rates:
 *   get:
 *     summary: Get travel agent rates overview
 *     tags: [AdminTravelDashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Travel agent rates data
 */
export const getTravelAgentRates = catchAsync(async (req, res) => {
  let baseQuery = { isActive: true };

  if (req.user.hotelId) {
    baseQuery.hotelId = req.user.hotelId;
  }

  const [
    totalRates,
    activeRates,
    expiringSoon,
    ratesByType,
    topDiscounts
  ] = await Promise.all([
    // Total rates
    TravelAgentRates.countDocuments(baseQuery),

    // Active rates (not expired)
    TravelAgentRates.countDocuments({
      ...baseQuery,
      validTo: { $gte: new Date() }
    }),

    // Expiring soon (within 30 days)
    TravelAgentRates.find({
      ...baseQuery,
      validTo: {
        $gte: new Date(),
        $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    }).populate('travelAgentId', 'companyName agentCode')
     .populate('roomTypeId', 'name'),

    // Rates by type
    TravelAgentRates.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: '$rateType',
          count: { $sum: 1 },
          avgDiscount: { $avg: '$discountPercentage' }
        }
      }
    ]),

    // Top discounts
    TravelAgentRates.find({
      ...baseQuery,
      rateType: 'discount_percentage',
      validTo: { $gte: new Date() }
    })
    .populate('travelAgentId', 'companyName agentCode')
    .populate('roomTypeId', 'name')
    .sort({ discountPercentage: -1 })
    .limit(10)
  ]);

  res.json({
    success: true,
    data: {
      overview: {
        totalRates,
        activeRates,
        expiringSoonCount: expiringSoon.length
      },
      expiringSoon,
      ratesByType,
      topDiscounts,
      generatedAt: new Date()
    }
  });
});

/**
 * @swagger
 * /api/v1/admin/travel-dashboard/export:
 *   get:
 *     summary: Export travel dashboard data
 *     tags: [AdminTravelDashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *           default: json
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 365d]
 *     responses:
 *       200:
 *         description: Exported data
 */
export const exportTravelData = catchAsync(async (req, res) => {
  const { format = 'json', period = '30d' } = req.query;

  // Get comprehensive data for export
  const overviewData = await getTravelDashboardOverview(
    { query: { period, hotelId: req.user.hotelId } },
    { json: () => {} }
  );

  // For now, return JSON format
  // In a real implementation, you'd format as CSV for CSV requests
  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=travel-dashboard-export.csv');
    // Convert to CSV format here
    res.send('CSV export not implemented yet');
  } else {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=travel-dashboard-export.json');
    res.json({
      success: true,
      exportedAt: new Date(),
      period,
      data: overviewData
    });
  }
});