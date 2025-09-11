import APIKey from '../models/APIKey.js';
import WebhookEndpoint from '../models/WebhookEndpoint.js';
import APIMetrics from '../models/APIMetrics.js';
import apiMetricsService from '../services/apiMetricsService.js';
import webhookDeliveryService from '../services/webhookDeliveryService.js';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/appError.js';
import logger from '../utils/logger.js';

const apiManagementController = {
  
  // ===== API KEYS MANAGEMENT =====

  /**
   * Get all API keys for a hotel
   */
  getAPIKeys: catchAsync(async (req, res) => {
    const { page = 1, limit = 10, status, type, search } = req.query;
    const { hotelId } = req.user;

    const filter = { hotelId };
    
    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;
    if (type && ['read', 'write', 'admin'].includes(type)) filter.type = type;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    
    const [apiKeys, total] = await Promise.all([
      APIKey.find(filter)
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      APIKey.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        apiKeys,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit)
        }
      }
    });
  }),

  /**
   * Create new API key
   */
  createAPIKey: catchAsync(async (req, res) => {
    const { name, description, type, permissions, rateLimit, allowedIPs, allowedDomains, expiresAt } = req.body;
    const { hotelId, id: createdBy } = req.user;

    // Generate new API key
    const apiKey = new APIKey({
      name,
      description,
      hotelId,
      createdBy,
      type: type || 'read',
      permissions: permissions || [],
      rateLimit: rateLimit || {},
      allowedIPs: allowedIPs || [],
      allowedDomains: allowedDomains || [],
      expiresAt: expiresAt ? new Date(expiresAt) : null
    });

    await apiKey.save();

    // Return the key only once (for security)
    const response = apiKey.toObject();
    response.key = apiKey.keyId; // Show the actual key only on creation
    delete response.keyHash;

    logger.info('API key created', {
      keyId: apiKey.keyId.substring(0, 10) + '...',
      hotelId,
      createdBy,
      type
    });

    res.status(201).json({
      success: true,
      data: response,
      message: 'API key created successfully. Please save this key as it will not be shown again.'
    });
  }),

  /**
   * Update API key
   */
  updateAPIKey: catchAsync(async (req, res) => {
    const { id } = req.params;
    const { hotelId } = req.user;
    const updates = req.body;

    // Remove sensitive fields that shouldn't be updated directly
    delete updates.keyId;
    delete updates.keyHash;
    delete updates.hotelId;
    delete updates.createdBy;

    const apiKey = await APIKey.findOneAndUpdate(
      { _id: id, hotelId },
      updates,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    if (!apiKey) {
      throw new AppError('API key not found', 404);
    }

    logger.info('API key updated', {
      keyId: apiKey.keyId.substring(0, 10) + '...',
      hotelId,
      updates: Object.keys(updates)
    });

    res.json({
      success: true,
      data: apiKey,
      message: 'API key updated successfully'
    });
  }),

  /**
   * Delete API key
   */
  deleteAPIKey: catchAsync(async (req, res) => {
    const { id } = req.params;
    const { hotelId } = req.user;

    const apiKey = await APIKey.findOneAndDelete({ _id: id, hotelId });
    
    if (!apiKey) {
      throw new AppError('API key not found', 404);
    }

    logger.info('API key deleted', {
      keyId: apiKey.keyId.substring(0, 10) + '...',
      hotelId
    });

    res.json({
      success: true,
      message: 'API key deleted successfully'
    });
  }),

  /**
   * Toggle API key status
   */
  toggleAPIKeyStatus: catchAsync(async (req, res) => {
    const { id } = req.params;
    const { hotelId } = req.user;

    const apiKey = await APIKey.findOne({ _id: id, hotelId });
    
    if (!apiKey) {
      throw new AppError('API key not found', 404);
    }

    apiKey.isActive = !apiKey.isActive;
    await apiKey.save();

    logger.info('API key status toggled', {
      keyId: apiKey.keyId.substring(0, 10) + '...',
      hotelId,
      newStatus: apiKey.isActive
    });

    res.json({
      success: true,
      data: apiKey,
      message: `API key ${apiKey.isActive ? 'activated' : 'deactivated'} successfully`
    });
  }),

  // ===== WEBHOOK MANAGEMENT =====

  /**
   * Get all webhook endpoints for a hotel
   */
  getWebhooks: catchAsync(async (req, res) => {
    const { page = 1, limit = 10, status, search } = req.query;
    const { hotelId } = req.user;

    const filter = { hotelId };
    
    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { url: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    
    const [webhooks, total] = await Promise.all([
      WebhookEndpoint.find(filter)
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      WebhookEndpoint.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        webhooks,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit)
        }
      }
    });
  }),

  /**
   * Create new webhook endpoint
   */
  createWebhook: catchAsync(async (req, res) => {
    const { 
      name, 
      description, 
      url, 
      events, 
      httpConfig, 
      retryPolicy, 
      filters 
    } = req.body;
    const { hotelId, id: createdBy } = req.user;

    const webhook = new WebhookEndpoint({
      name,
      description,
      url,
      hotelId,
      createdBy,
      events: events || [],
      httpConfig: httpConfig || {},
      retryPolicy: retryPolicy || {},
      filters: filters || { enabled: false }
    });

    await webhook.save();

    logger.info('Webhook endpoint created', {
      webhookId: webhook._id,
      hotelId,
      url: webhook.url,
      events: webhook.events
    });

    res.status(201).json({
      success: true,
      data: webhook,
      message: 'Webhook endpoint created successfully'
    });
  }),

  /**
   * Update webhook endpoint
   */
  updateWebhook: catchAsync(async (req, res) => {
    const { id } = req.params;
    const { hotelId } = req.user;
    const updates = req.body;

    // Remove sensitive fields
    delete updates.secret;
    delete updates.hotelId;
    delete updates.createdBy;

    const webhook = await WebhookEndpoint.findOneAndUpdate(
      { _id: id, hotelId },
      updates,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    if (!webhook) {
      throw new AppError('Webhook endpoint not found', 404);
    }

    logger.info('Webhook endpoint updated', {
      webhookId: webhook._id,
      hotelId,
      updates: Object.keys(updates)
    });

    res.json({
      success: true,
      data: webhook,
      message: 'Webhook endpoint updated successfully'
    });
  }),

  /**
   * Delete webhook endpoint
   */
  deleteWebhook: catchAsync(async (req, res) => {
    const { id } = req.params;
    const { hotelId } = req.user;

    const webhook = await WebhookEndpoint.findOneAndDelete({ _id: id, hotelId });
    
    if (!webhook) {
      throw new AppError('Webhook endpoint not found', 404);
    }

    logger.info('Webhook endpoint deleted', {
      webhookId: webhook._id,
      hotelId,
      url: webhook.url
    });

    res.json({
      success: true,
      message: 'Webhook endpoint deleted successfully'
    });
  }),

  /**
   * Test webhook endpoint
   */
  testWebhook: catchAsync(async (req, res) => {
    const { id } = req.params;
    const { hotelId } = req.user;

    const webhook = await WebhookEndpoint.findOne({ _id: id, hotelId });
    
    if (!webhook) {
      throw new AppError('Webhook endpoint not found', 404);
    }

    const result = await webhookDeliveryService.testEndpoint(webhook._id);

    res.json({
      success: result.success,
      data: result,
      message: result.success ? 'Test webhook delivered successfully' : 'Test webhook failed'
    });
  }),

  /**
   * Get webhook secret (for regeneration)
   */
  regenerateWebhookSecret: catchAsync(async (req, res) => {
    const { id } = req.params;
    const { hotelId } = req.user;

    const webhook = await WebhookEndpoint.findOne({ _id: id, hotelId });
    
    if (!webhook) {
      throw new AppError('Webhook endpoint not found', 404);
    }

    webhook.secret = WebhookEndpoint.generateSecret();
    await webhook.save();

    logger.info('Webhook secret regenerated', {
      webhookId: webhook._id,
      hotelId
    });

    res.json({
      success: true,
      data: { secret: webhook.secret },
      message: 'Webhook secret regenerated successfully'
    });
  }),

  // ===== METRICS AND ANALYTICS =====

  /**
   * Get API metrics dashboard
   */
  getMetrics: catchAsync(async (req, res) => {
    const { timeRange = '24h' } = req.query;
    const { hotelId } = req.user;

    const metrics = await apiMetricsService.getDashboardMetrics(hotelId, timeRange);
    
    res.json({
      success: true,
      data: metrics
    });
  }),

  /**
   * Get top API endpoints
   */
  getTopEndpoints: catchAsync(async (req, res) => {
    const { timeRange = '24h', limit = 10 } = req.query;
    const { hotelId } = req.user;

    const endpoints = await apiMetricsService.getTopEndpoints(hotelId, timeRange, parseInt(limit));
    
    res.json({
      success: true,
      data: endpoints
    });
  }),

  /**
   * Get API metrics by endpoint
   */
  getEndpointMetrics: catchAsync(async (req, res) => {
    const { endpoint } = req.params;
    const { timeRange = '24h', period = 'hour' } = req.query;
    const { hotelId } = req.user;

    const [method, path] = endpoint.split(' ', 2);
    
    let startTime, endTime = new Date();
    
    switch (timeRange) {
      case '1h':
        startTime = new Date(endTime.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(endTime.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);
    }

    const metrics = await APIMetrics.find({
      hotelId,
      'endpoint.method': method,
      'endpoint.path': path,
      period,
      timestamp: { $gte: startTime, $lte: endTime }
    }).sort({ timestamp: 1 });

    res.json({
      success: true,
      data: metrics
    });
  }),

  /**
   * Get API key usage statistics
   */
  getAPIKeyUsage: catchAsync(async (req, res) => {
    const { timeRange = '24h' } = req.query;
    const { hotelId } = req.user;

    let startTime;
    const endTime = new Date();

    switch (timeRange) {
      case '24h':
        startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(endTime.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(endTime.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);
    }

    const [apiKeys, keyUsageMetrics] = await Promise.all([
      APIKey.find({ hotelId, isActive: true })
        .select('name type usage'),
      
      APIMetrics.aggregate([
        {
          $match: {
            hotelId,
            timestamp: { $gte: startTime, $lte: endTime },
            'apiKeyUsage.keyRequests': { $exists: true }
          }
        },
        {
          $project: {
            keyRequests: { $objectToArray: '$apiKeyUsage.keyRequests' }
          }
        },
        {
          $unwind: '$keyRequests'
        },
        {
          $group: {
            _id: '$keyRequests.k',
            totalRequests: { $sum: '$keyRequests.v' }
          }
        },
        {
          $sort: { totalRequests: -1 }
        }
      ])
    ]);

    // Combine API key data with usage metrics
    const keyUsageMap = new Map(keyUsageMetrics.map(k => [k._id, k.totalRequests]));
    
    const apiKeyUsage = apiKeys.map(key => ({
      id: key._id,
      name: key.name,
      type: key.type,
      totalRequests: key.usage.totalRequests || 0,
      periodRequests: keyUsageMap.get(key._id.toString()) || 0,
      lastUsed: key.usage.lastUsed
    }));

    res.json({
      success: true,
      data: {
        apiKeys: apiKeyUsage,
        summary: {
          totalKeys: apiKeys.length,
          activeKeys: apiKeys.filter(k => k.usage.lastUsed && 
            k.usage.lastUsed >= startTime).length
        }
      }
    });
  }),

  /**
   * Get webhook delivery statistics
   */
  getWebhookStats: catchAsync(async (req, res) => {
    const { timeRange = '24h' } = req.query;
    const { hotelId } = req.user;

    const webhooks = await WebhookEndpoint.find({ hotelId })
      .select('name url stats health events');

    // Calculate totals
    const totalStats = webhooks.reduce((acc, webhook) => ({
      totalDeliveries: acc.totalDeliveries + (webhook.stats.totalDeliveries || 0),
      successfulDeliveries: acc.successfulDeliveries + (webhook.stats.successfulDeliveries || 0),
      failedDeliveries: acc.failedDeliveries + (webhook.stats.failedDeliveries || 0)
    }), { totalDeliveries: 0, successfulDeliveries: 0, failedDeliveries: 0 });

    // Get retry queue status
    const retryQueueStatus = webhookDeliveryService.getRetryQueueStatus();

    res.json({
      success: true,
      data: {
        webhooks: webhooks.map(w => ({
          id: w._id,
          name: w.name,
          url: w.url,
          events: w.events,
          stats: w.stats,
          health: w.health
        })),
        summary: {
          ...totalStats,
          successRate: totalStats.totalDeliveries > 0 
            ? ((totalStats.successfulDeliveries / totalStats.totalDeliveries) * 100).toFixed(2)
            : 0,
          retryQueue: retryQueueStatus
        }
      }
    });
  }),

  /**
   * Export API logs
   */
  exportLogs: catchAsync(async (req, res) => {
    const { startDate, endDate, format = 'json', endpoints } = req.query;
    const { hotelId } = req.user;

    const filter = {
      hotelId,
      timestamp: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    if (endpoints) {
      const endpointList = endpoints.split(',');
      filter['endpoint.path'] = { $in: endpointList };
    }

    const logs = await APIMetrics.find(filter)
      .sort({ timestamp: -1 })
      .limit(10000); // Limit to prevent memory issues

    if (format === 'csv') {
      // Convert to CSV format
      const csvHeader = 'Timestamp,Method,Path,Requests,Errors,Avg Response Time\n';
      const csvData = logs.map(log => 
        `${log.timestamp},${log.endpoint.method},${log.endpoint.path},${log.requests.total},${log.errors.total},${log.performance.averageResponseTime}`
      ).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="api-logs.csv"');
      res.send(csvHeader + csvData);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="api-logs.json"');
      res.json(logs);
    }
  })
};

export default apiManagementController;