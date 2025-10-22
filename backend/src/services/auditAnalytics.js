import SettingsAuditLog from '../models/SettingsAuditLog.js';
import logger from '../utils/logger.js';
import { Parser } from 'json2csv';

class AuditAnalyticsService {
  /**
   * Get audit logs with filtering and pagination
   */
  async getAuditLogs(filters = {}, pagination = {}) {
    try {
      const {
        userId,
        propertyId,
        groupId,
        settingType,
        action,
        scope,
        status,
        startDate,
        endDate,
        search
      } = filters;

      const {
        page = 1,
        limit = 50,
        sortBy = 'timestamp',
        sortOrder = 'desc'
      } = pagination;

      // Build query
      const query = {};

      if (userId) query.userId = userId;
      if (groupId) query.groupId = groupId;
      if (settingType) query.settingType = settingType;
      if (action) query.action = action;
      if (scope) query.scope = scope;
      if (status) query.status = status;

      // Property filter - include both direct and affected properties
      if (propertyId) {
        query.$or = [
          { propertyId },
          { affectedPropertyIds: propertyId }
        ];
      }

      // Date range filter
      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
      }

      // Text search
      if (search) {
        query.$or = [
          { userName: { $regex: search, $options: 'i' } },
          { userEmail: { $regex: search, $options: 'i' } },
          { settingName: { $regex: search, $options: 'i' } },
          { settingType: { $regex: search, $options: 'i' } }
        ];
      }

      // Execute query
      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const [logs, totalCount] = await Promise.all([
        SettingsAuditLog.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .populate('userId', 'name email role')
          .populate('propertyId', 'name code')
          .populate('groupId', 'name description')
          .lean(),
        SettingsAuditLog.countDocuments(query)
      ]);

      return {
        logs,
        pagination: {
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
          totalCount
        }
      };
    } catch (error) {
      logger.error('Failed to get audit logs', { error: error.message, filters });
      throw error;
    }
  }

  /**
   * Get usage statistics
   */
  async getUsageStatistics(dateRange = {}) {
    try {
      const { startDate, endDate, groupBy = 'day' } = dateRange;

      // Get overall statistics
      const stats = await SettingsAuditLog.getStatistics(dateRange);

      // Get time series data
      const timeSeries = await this.getTimeSeriesData(startDate, endDate, groupBy);

      // Get most active users
      const mostActiveUsers = await SettingsAuditLog.getMostActiveUsers(10, dateRange);

      // Get most changed settings
      const mostChangedSettings = await SettingsAuditLog.getMostChangedSettings(10, dateRange);

      // Calculate additional metrics
      const totalChanges = stats.totalChanges[0]?.count || 0;
      const totalPropertiesAffected = stats.totalPropertiesAffected[0]?.total || 0;
      const averageDuration = stats.averageDuration[0]?.avg || 0;

      // Calculate success rate
      const successCount = stats.byStatus?.find(s => s._id === 'success')?.count || 0;
      const successRate = totalChanges > 0 ? (successCount / totalChanges) * 100 : 0;

      return {
        overview: {
          totalChanges,
          totalPropertiesAffected,
          averageDuration: Math.round(averageDuration),
          successRate: successRate.toFixed(2),
          dateRange: {
            startDate: startDate || 'all-time',
            endDate: endDate || 'now'
          }
        },
        byAction: stats.byAction || [],
        byScope: stats.byScope || [],
        bySettingType: stats.bySettingType || [],
        byStatus: stats.byStatus || [],
        timeSeries,
        mostActiveUsers,
        mostChangedSettings
      };
    } catch (error) {
      logger.error('Failed to get usage statistics', { error: error.message });
      throw error;
    }
  }

  /**
   * Get time series data
   */
  async getTimeSeriesData(startDate, endDate, groupBy = 'day') {
    try {
      const matchStage = {};

      if (startDate && endDate) {
        matchStage.timestamp = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }

      // Determine date format based on groupBy
      let dateFormat;
      switch (groupBy) {
        case 'hour':
          dateFormat = '%Y-%m-%d %H:00';
          break;
        case 'day':
          dateFormat = '%Y-%m-%d';
          break;
        case 'week':
          dateFormat = '%Y-W%V';
          break;
        case 'month':
          dateFormat = '%Y-%m';
          break;
        default:
          dateFormat = '%Y-%m-%d';
      }

      const timeSeries = await SettingsAuditLog.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: dateFormat, date: '$timestamp' } },
              action: '$action'
            },
            count: { $sum: 1 },
            propertiesAffected: { $sum: '$propertiesAffected' }
          }
        },
        { $sort: { '_id.date': 1 } }
      ]);

      // Transform data for charting
      const chartData = {};
      timeSeries.forEach(item => {
        const date = item._id.date;
        if (!chartData[date]) {
          chartData[date] = { date, total: 0 };
        }
        chartData[date][item._id.action] = item.count;
        chartData[date].total += item.count;
      });

      return Object.values(chartData);
    } catch (error) {
      logger.error('Failed to get time series data', { error: error.message });
      throw error;
    }
  }

  /**
   * Get property activity heatmap
   */
  async getPropertyActivityHeatmap(dateRange = {}) {
    try {
      const { startDate, endDate } = dateRange;

      const matchStage = {};

      if (startDate && endDate) {
        matchStage.timestamp = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }

      const heatmap = await SettingsAuditLog.aggregate([
        { $match: matchStage },
        { $unwind: { path: '$affectedPropertyIds', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$affectedPropertyIds',
            totalChanges: { $sum: 1 },
            byAction: {
              $push: {
                action: '$action',
                timestamp: '$timestamp'
              }
            },
            lastActivity: { $max: '$timestamp' }
          }
        },
        {
          $lookup: {
            from: 'hotels',
            localField: '_id',
            foreignField: '_id',
            as: 'property'
          }
        },
        { $unwind: { path: '$property', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            propertyId: '$_id',
            propertyName: '$property.name',
            propertyCode: '$property.code',
            totalChanges: 1,
            lastActivity: 1,
            actionBreakdown: {
              $reduce: {
                input: '$byAction',
                initialValue: {},
                in: {
                  $mergeObjects: [
                    '$$value',
                    {
                      $cond: [
                        { $eq: ['$$this.action', 'update'] },
                        { update: { $add: [{ $ifNull: ['$$value.update', 0] }, 1] } },
                        {}
                      ]
                    },
                    {
                      $cond: [
                        { $eq: ['$$this.action', 'create'] },
                        { create: { $add: [{ $ifNull: ['$$value.create', 0] }, 1] } },
                        {}
                      ]
                    },
                    {
                      $cond: [
                        { $eq: ['$$this.action', 'delete'] },
                        { delete: { $add: [{ $ifNull: ['$$value.delete', 0] }, 1] } },
                        {}
                      ]
                    },
                    {
                      $cond: [
                        { $eq: ['$$this.action', 'rollback'] },
                        { rollback: { $add: [{ $ifNull: ['$$value.rollback', 0] }, 1] } },
                        {}
                      ]
                    }
                  ]
                }
              }
            }
          }
        },
        { $sort: { totalChanges: -1 } }
      ]);

      return heatmap;
    } catch (error) {
      logger.error('Failed to get property activity heatmap', { error: error.message });
      throw error;
    }
  }

  /**
   * Get user activity
   */
  async getUserActivity(userId, options = {}) {
    try {
      const { limit = 100, skip = 0 } = options;

      const logs = await SettingsAuditLog.getLogsByUser(userId, { limit, skip });

      // Calculate user statistics
      const stats = await SettingsAuditLog.aggregate([
        { $match: { userId: userId } },
        {
          $facet: {
            totalChanges: [{ $count: 'count' }],
            byAction: [
              { $group: { _id: '$action', count: { $sum: 1 } } },
              { $sort: { count: -1 } }
            ],
            byScope: [
              { $group: { _id: '$scope', count: { $sum: 1 } } },
              { $sort: { count: -1 } }
            ],
            totalPropertiesAffected: [
              { $group: { _id: null, total: { $sum: '$propertiesAffected' } } }
            ],
            firstActivity: [
              { $sort: { timestamp: 1 } },
              { $limit: 1 },
              { $project: { timestamp: 1 } }
            ],
            lastActivity: [
              { $sort: { timestamp: -1 } },
              { $limit: 1 },
              { $project: { timestamp: 1 } }
            ]
          }
        }
      ]);

      return {
        logs,
        statistics: stats[0]
      };
    } catch (error) {
      logger.error('Failed to get user activity', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Get property activity
   */
  async getPropertyActivity(propertyId, options = {}) {
    try {
      const { limit = 100, skip = 0 } = options;

      const logs = await SettingsAuditLog.getLogsByProperty(propertyId, { limit, skip });

      // Calculate property statistics
      const stats = await SettingsAuditLog.aggregate([
        {
          $match: {
            $or: [
              { propertyId },
              { affectedPropertyIds: propertyId }
            ]
          }
        },
        {
          $facet: {
            totalChanges: [{ $count: 'count' }],
            byAction: [
              { $group: { _id: '$action', count: { $sum: 1 } } },
              { $sort: { count: -1 } }
            ],
            bySettingType: [
              { $group: { _id: '$settingType', count: { $sum: 1 } } },
              { $sort: { count: -1 } }
            ],
            uniqueUsers: [
              { $group: { _id: '$userId' } },
              { $count: 'count' }
            ],
            firstActivity: [
              { $sort: { timestamp: 1 } },
              { $limit: 1 },
              { $project: { timestamp: 1 } }
            ],
            lastActivity: [
              { $sort: { timestamp: -1 } },
              { $limit: 1 },
              { $project: { timestamp: 1 } }
            ]
          }
        }
      ]);

      return {
        logs,
        statistics: stats[0]
      };
    } catch (error) {
      logger.error('Failed to get property activity', { error: error.message, propertyId });
      throw error;
    }
  }

  /**
   * Export audit log to CSV
   */
  async exportAuditLog(filters = {}, format = 'csv') {
    try {
      // Get all matching logs (no pagination limit)
      const { logs } = await this.getAuditLogs(filters, { limit: 100000 });

      if (format === 'csv') {
        // Define fields for CSV
        const fields = [
          { label: 'Timestamp', value: 'timestamp' },
          { label: 'User Name', value: 'userName' },
          { label: 'User Email', value: 'userEmail' },
          { label: 'Action', value: 'action' },
          { label: 'Scope', value: 'scope' },
          { label: 'Setting Type', value: 'settingType' },
          { label: 'Setting Name', value: 'settingName' },
          { label: 'Properties Affected', value: 'propertiesAffected' },
          { label: 'Property Name', value: 'propertyId.name' },
          { label: 'Group Name', value: 'groupId.name' },
          { label: 'Status', value: 'status' },
          { label: 'Duration (ms)', value: 'duration' },
          { label: 'IP Address', value: 'ipAddress' }
        ];

        const parser = new Parser({ fields });
        const csv = parser.parse(logs);

        return {
          format: 'csv',
          data: csv,
          filename: `audit-log-${Date.now()}.csv`
        };
      } else if (format === 'json') {
        return {
          format: 'json',
          data: JSON.stringify(logs, null, 2),
          filename: `audit-log-${Date.now()}.json`
        };
      }

      throw new Error(`Unsupported export format: ${format}`);
    } catch (error) {
      logger.error('Failed to export audit log', { error: error.message, filters, format });
      throw error;
    }
  }

  /**
   * Calculate time savings
   * Estimate how much time was saved by bulk operations
   */
  async calculateTimeSavings(dateRange = {}) {
    try {
      const { startDate, endDate } = dateRange;

      const matchStage = {
        scope: { $in: ['group', 'all'] },
        action: 'update'
      };

      if (startDate && endDate) {
        matchStage.timestamp = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }

      const bulkOperations = await SettingsAuditLog.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalBulkOperations: { $sum: 1 },
            totalPropertiesAffected: { $sum: '$propertiesAffected' },
            averagePropertiesPerOperation: { $avg: '$propertiesAffected' }
          }
        }
      ]);

      if (!bulkOperations.length) {
        return {
          totalBulkOperations: 0,
          totalPropertiesAffected: 0,
          estimatedTimeSaved: 0,
          estimatedManualOperations: 0
        };
      }

      const data = bulkOperations[0];

      // Assume each manual operation takes 2 minutes
      const timePerManualOperation = 2; // minutes
      const manualOperationsAvoided = data.totalPropertiesAffected - data.totalBulkOperations;
      const timeSavedMinutes = manualOperationsAvoided * timePerManualOperation;

      return {
        totalBulkOperations: data.totalBulkOperations,
        totalPropertiesAffected: data.totalPropertiesAffected,
        averagePropertiesPerOperation: Math.round(data.averagePropertiesPerOperation),
        estimatedManualOperations: manualOperationsAvoided,
        estimatedTimeSavedMinutes: timeSavedMinutes,
        estimatedTimeSavedHours: (timeSavedMinutes / 60).toFixed(2),
        estimatedTimeSavedDays: (timeSavedMinutes / (60 * 8)).toFixed(2) // 8-hour work day
      };
    } catch (error) {
      logger.error('Failed to calculate time savings', { error: error.message });
      throw error;
    }
  }

  /**
   * Get recent activity feed
   */
  async getRecentActivity(limit = 20) {
    try {
      const logs = await SettingsAuditLog.getRecentLogs(limit);

      return logs;
    } catch (error) {
      logger.error('Failed to get recent activity', { error: error.message });
      throw error;
    }
  }

  /**
   * Get audit log by ID
   */
  async getAuditLogById(logId) {
    try {
      const log = await SettingsAuditLog.findById(logId)
        .populate('userId', 'name email role')
        .populate('propertyId', 'name code')
        .populate('groupId', 'name description')
        .lean();

      if (!log) {
        throw new Error('Audit log not found');
      }

      return log;
    } catch (error) {
      logger.error('Failed to get audit log by ID', { error: error.message, logId });
      throw error;
    }
  }
}

// Singleton instance
const auditAnalyticsService = new AuditAnalyticsService();

export default auditAnalyticsService;
export { AuditAnalyticsService };
