import cron from 'node-cron';
import mongoose from 'mongoose';
import NotificationAutomationService from './notificationAutomationService.js';

/**
 * Notification Scheduler Service
 * Handles scheduled notifications and overdue detection
 */
class NotificationScheduler {

  static isInitialized = false;

  /**
   * Initialize all scheduled notification jobs
   */
  static initializeScheduledJobs() {
    if (this.isInitialized) {
      console.log('📅 Notification scheduler already initialized');
      return;
    }

    console.log('📅 Initializing notification scheduler...');

    // Every 30 minutes - Check for overdue daily checks
    cron.schedule('*/30 * * * *', () => {
      this.checkOverdueDailyRoutineChecks();
    });

    // Every hour - Check for overdue maintenance requests
    cron.schedule('0 * * * *', () => {
      this.checkOverdueMaintenanceRequests();
    });

    // Every 2 hours - Check for overdue guest services
    cron.schedule('0 */2 * * *', () => {
      this.checkOverdueGuestServices();
    });

    // Every 4 hours - Check inventory levels during business hours
    cron.schedule('0 6-22/4 * * *', () => {
      this.checkInventoryLevels();
    });

    // Daily at 6 AM - Send daily operations summary
    cron.schedule('0 6 * * *', () => {
      this.sendDailyOperationsSummary();
    });

    // Daily at 8 PM - Send end-of-day summary
    cron.schedule('0 20 * * *', () => {
      this.sendEndOfDaySummary();
    });

    // Every 15 minutes during business hours - Send scheduled notifications
    cron.schedule('*/15 6-22 * * *', () => {
      this.processScheduledNotifications();
    });

    this.isInitialized = true;
    console.log('✅ Notification scheduler initialized successfully');
  }

  /**
   * Check for overdue daily routine checks
   */
  static async checkOverdueDailyRoutineChecks() {
    try {
      console.log('🔍 Checking for overdue daily routine checks...');

      const DailyRoutineCheck = mongoose.model('DailyRoutineCheck');
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago

      // Find daily checks that are overdue (pending/in_progress for more than 2 hours)
      const overdueChecks = await DailyRoutineCheck.find({
        status: { $in: ['pending', 'in_progress'] },
        checkDate: { $lt: twoHoursAgo }, // Check date was more than 2 hours ago
        createdAt: { $lt: twoHoursAgo } // Created more than 2 hours ago
      }).populate('roomId', 'roomNumber').populate('hotelId', '_id');

      console.log(`📋 Found ${overdueChecks.length} overdue daily checks`);

      for (const check of overdueChecks) {
        const now = new Date();
        const overdueHours = Math.floor((now - check.checkDate) / (1000 * 60 * 60));

        await NotificationAutomationService.triggerNotification(
          'daily_check_overdue',
          {
            roomNumber: check.roomId?.roomNumber || 'Unknown',
            checkId: check._id,
            assignedTo: check.checkedBy,
            overdueHours,
            checkDate: check.checkDate
          },
          'auto',
          'high',
          check.hotelId
        );

        // Update check status to overdue
        check.status = 'overdue';
        await check.save();
      }

    } catch (error) {
      console.error('❌ Error checking overdue daily routine checks:', error);
    }
  }

  /**
   * Check for overdue maintenance requests
   */
  static async checkOverdueMaintenanceRequests() {
    try {
      console.log('🔍 Checking for overdue maintenance requests...');

      const MaintenanceRequest = mongoose.model('MaintenanceRequest');
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
      const urgentThreshold = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours for urgent

      // Find maintenance requests that are overdue
      const overdueMaintenanceRequests = await MaintenanceRequest.find({
        $or: [
          {
            status: { $in: ['pending', 'in_progress'] },
            priority: 'urgent',
            createdAt: { $lt: urgentThreshold }
          },
          {
            status: { $in: ['pending', 'in_progress'] },
            priority: { $ne: 'urgent' },
            createdAt: { $lt: oneDayAgo }
          },
          {
            status: { $in: ['pending', 'in_progress'] },
            scheduledDate: { $lt: new Date() } // Past scheduled date
          }
        ]
      }).populate('roomId', 'roomNumber');

      console.log(`🔧 Found ${overdueMaintenanceRequests.length} overdue maintenance requests`);

      for (const request of overdueMaintenanceRequests) {
        const now = new Date();
        const overdueHours = Math.floor((now - request.createdAt) / (1000 * 60 * 60));

        await NotificationAutomationService.triggerNotification(
          'maintenance_overdue',
          {
            roomNumber: request.roomId?.roomNumber || 'Unknown',
            requestId: request._id,
            issueType: request.issueType,
            description: request.description,
            priority: request.priority,
            assignedTo: request.assignedTo,
            overdueHours,
            createdAt: request.createdAt
          },
          'auto',
          request.priority === 'urgent' ? 'urgent' : 'high',
          request.hotelId
        );
      }

    } catch (error) {
      console.error('❌ Error checking overdue maintenance requests:', error);
    }
  }

  /**
   * Check for overdue guest service requests
   */
  static async checkOverdueGuestServices() {
    try {
      console.log('🔍 Checking for overdue guest service requests...');

      const GuestService = mongoose.model('GuestService');
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      const urgentThreshold = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes for urgent

      const overdueServices = await GuestService.find({
        $or: [
          {
            status: { $in: ['pending', 'assigned', 'in_progress'] },
            priority: { $in: ['urgent', 'now'] },
            createdAt: { $lt: urgentThreshold }
          },
          {
            status: { $in: ['pending', 'assigned'] },
            priority: { $nin: ['urgent', 'now'] },
            createdAt: { $lt: twoHoursAgo }
          }
        ]
      }).populate('bookingId', 'rooms');

      console.log(`🛎️ Found ${overdueServices.length} overdue guest service requests`);

      for (const service of overdueServices) {
        // Get room number
        let roomNumber = 'Unknown';
        try {
          const booking = await mongoose.model('Booking').findById(service.bookingId).populate('rooms.roomId');
          if (booking && booking.rooms && booking.rooms[0]) {
            roomNumber = booking.rooms[0].roomId?.roomNumber || 'Unknown';
          }
        } catch (error) {
          console.log('Could not fetch room number for overdue service');
        }

        const now = new Date();
        const overdueMinutes = Math.floor((now - service.createdAt) / (1000 * 60));

        await NotificationAutomationService.triggerNotification(
          'guest_service_overdue',
          {
            roomNumber,
            serviceType: service.serviceType,
            serviceVariation: service.serviceVariation,
            requestId: service._id,
            assignedTo: service.assignedTo,
            overdueMinutes,
            priority: service.priority,
            createdAt: service.createdAt
          },
          'auto',
          service.priority === 'urgent' || service.priority === 'now' ? 'urgent' : 'high',
          service.hotelId
        );
      }

    } catch (error) {
      console.error('❌ Error checking overdue guest service requests:', error);
    }
  }

  /**
   * Check inventory levels and send low stock alerts
   */
  static async checkInventoryLevels() {
    try {
      console.log('🔍 Checking inventory levels...');

      const InventoryItem = mongoose.model('InventoryItem');

      // Find items with low stock (less than reorder point)
      const lowStockItems = await InventoryItem.find({
        $expr: { $lte: ['$currentStock', '$reorderPoint'] },
        isActive: true
      });

      // Find items that are out of stock
      const outOfStockItems = await InventoryItem.find({
        currentStock: { $lte: 0 },
        isActive: true
      });

      console.log(`📦 Found ${lowStockItems.length} low stock items, ${outOfStockItems.length} out of stock`);

      // Send low stock notifications
      for (const item of lowStockItems) {
        await NotificationAutomationService.triggerNotification(
          'inventory_low_stock',
          {
            itemName: item.name,
            currentStock: item.currentStock,
            reorderPoint: item.reorderPoint,
            category: item.category,
            itemId: item._id
          },
          'auto',
          'medium',
          item.hotelId
        );
      }

      // Send out of stock notifications
      for (const item of outOfStockItems) {
        await NotificationAutomationService.triggerNotification(
          'inventory_out_of_stock',
          {
            itemName: item.name,
            category: item.category,
            itemId: item._id,
            lastRestocked: item.lastRestocked
          },
          'auto',
          'high',
          item.hotelId
        );
      }

    } catch (error) {
      console.error('❌ Error checking inventory levels:', error);
    }
  }

  /**
   * Send daily operations summary
   */
  static async sendDailyOperationsSummary() {
    try {
      console.log('📊 Generating daily operations summary...');

      // Get all active hotels
      const Hotel = mongoose.model('Hotel');
      const hotels = await Hotel.find({ isActive: true }).select('_id name');

      for (const hotel of hotels) {
        const summary = await this.generateDailyOperationsSummary(hotel._id);

        await NotificationAutomationService.triggerNotification(
          'daily_operations_summary',
          {
            hotelName: hotel.name,
            completedTasks: summary.completedTasks,
            pendingTasks: summary.pendingTasks,
            overdueItems: summary.overdueItems,
            maintenanceRequests: summary.maintenanceRequests,
            guestServices: summary.guestServices,
            roomsOutOfOrder: summary.roomsOutOfOrder,
            inventoryAlerts: summary.inventoryAlerts
          },
          'auto',
          'low',
          hotel._id
        );
      }

    } catch (error) {
      console.error('❌ Error sending daily operations summary:', error);
    }
  }

  /**
   * Generate daily operations summary data
   */
  static async generateDailyOperationsSummary(hotelId) {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    try {
      // Daily routine checks
      const DailyRoutineCheck = mongoose.model('DailyRoutineCheck');
      const completedChecks = await DailyRoutineCheck.countDocuments({
        hotelId,
        status: 'completed',
        checkDate: { $gte: startOfDay, $lte: endOfDay }
      });
      const pendingChecks = await DailyRoutineCheck.countDocuments({
        hotelId,
        status: { $in: ['pending', 'in_progress'] },
        checkDate: { $gte: startOfDay, $lte: endOfDay }
      });

      // Maintenance requests
      const MaintenanceRequest = mongoose.model('MaintenanceRequest');
      const completedMaintenance = await MaintenanceRequest.countDocuments({
        hotelId,
        status: 'completed',
        completedDate: { $gte: startOfDay, $lte: endOfDay }
      });
      const pendingMaintenance = await MaintenanceRequest.countDocuments({
        hotelId,
        status: { $in: ['pending', 'in_progress'] }
      });

      // Guest services
      const GuestService = mongoose.model('GuestService');
      const completedServices = await GuestService.countDocuments({
        hotelId,
        status: 'completed',
        completedTime: { $gte: startOfDay, $lte: endOfDay }
      });
      const pendingServices = await GuestService.countDocuments({
        hotelId,
        status: { $in: ['pending', 'assigned', 'in_progress'] }
      });

      // Room status
      const Room = mongoose.model('Room');
      const roomsOutOfOrder = await Room.countDocuments({
        hotelId,
        status: 'out_of_order'
      });

      // Inventory alerts (items below reorder point)
      const InventoryItem = mongoose.model('InventoryItem');
      const inventoryAlerts = await InventoryItem.countDocuments({
        hotelId,
        $expr: { $lte: ['$currentStock', '$reorderPoint'] }
      });

      return {
        completedTasks: completedChecks + completedMaintenance + completedServices,
        pendingTasks: pendingChecks + pendingServices,
        overdueItems: 0, // This would need specific overdue logic
        maintenanceRequests: {
          completed: completedMaintenance,
          pending: pendingMaintenance
        },
        guestServices: {
          completed: completedServices,
          pending: pendingServices
        },
        roomsOutOfOrder,
        inventoryAlerts
      };

    } catch (error) {
      console.error('Error generating daily summary:', error);
      return {
        completedTasks: 0,
        pendingTasks: 0,
        overdueItems: 0,
        maintenanceRequests: { completed: 0, pending: 0 },
        guestServices: { completed: 0, pending: 0 },
        roomsOutOfOrder: 0,
        inventoryAlerts: 0
      };
    }
  }

  /**
   * Send end-of-day summary
   */
  static async sendEndOfDaySummary() {
    try {
      console.log('🌅 Sending end-of-day summary...');

      const Hotel = mongoose.model('Hotel');
      const hotels = await Hotel.find({ isActive: true }).select('_id name');

      for (const hotel of hotels) {
        const summary = await this.generateEndOfDaySummary(hotel._id);

        // Only send if there are notable items to report
        if (summary.totalIssues > 0) {
          await NotificationAutomationService.triggerNotification(
            'daily_operations_summary',
            {
              hotelName: hotel.name,
              type: 'end-of-day',
              pendingMaintenance: summary.pendingMaintenance,
              pendingServices: summary.pendingServices,
              roomsNeedingAttention: summary.roomsNeedingAttention,
              totalIssues: summary.totalIssues
            },
            'auto',
            'low',
            hotel._id
          );
        }
      }

    } catch (error) {
      console.error('❌ Error sending end-of-day summary:', error);
    }
  }

  /**
   * Generate end-of-day summary data
   */
  static async generateEndOfDaySummary(hotelId) {
    try {
      const MaintenanceRequest = mongoose.model('MaintenanceRequest');
      const GuestService = mongoose.model('GuestService');
      const Room = mongoose.model('Room');

      const pendingMaintenance = await MaintenanceRequest.countDocuments({
        hotelId,
        status: { $in: ['pending', 'in_progress'] }
      });

      const pendingServices = await GuestService.countDocuments({
        hotelId,
        status: { $in: ['pending', 'assigned', 'in_progress'] }
      });

      const roomsNeedingAttention = await Room.countDocuments({
        hotelId,
        status: { $in: ['dirty', 'maintenance', 'out_of_order'] }
      });

      return {
        pendingMaintenance,
        pendingServices,
        roomsNeedingAttention,
        totalIssues: pendingMaintenance + pendingServices + roomsNeedingAttention
      };

    } catch (error) {
      console.error('Error generating end-of-day summary:', error);
      return {
        pendingMaintenance: 0,
        pendingServices: 0,
        roomsNeedingAttention: 0,
        totalIssues: 0
      };
    }
  }

  /**
   * Process scheduled notifications that are due
   */
  static async processScheduledNotifications() {
    try {
      const Notification = mongoose.model('Notification');

      // Find notifications scheduled for now or in the past
      const dueNotifications = await Notification.find({
        status: 'pending',
        scheduledFor: { $lte: new Date() }
      });

      console.log(`📬 Processing ${dueNotifications.length} scheduled notifications`);

      for (const notification of dueNotifications) {
        try {
          // Mark as sent and update timestamp
          notification.status = 'sent';
          notification.sentAt = new Date();
          await notification.save();

          // Here you would integrate with your real-time notification system
          console.log(`📤 Sent scheduled notification: ${notification.title}`);

        } catch (error) {
          console.error('Error processing scheduled notification:', error);
        }
      }

    } catch (error) {
      console.error('❌ Error processing scheduled notifications:', error);
    }
  }

  /**
   * Stop all scheduled jobs (useful for testing)
   */
  static stopScheduledJobs() {
    cron.getTasks().forEach((task, name) => {
      task.stop();
      console.log(`🛑 Stopped scheduled job: ${name}`);
    });

    this.isInitialized = false;
    console.log('🛑 All notification scheduler jobs stopped');
  }

  /**
   * Get status of all scheduled jobs
   */
  static getSchedulerStatus() {
    const tasks = cron.getTasks();
    const status = {
      isInitialized: this.isInitialized,
      activeJobs: tasks.size,
      jobs: []
    };

    tasks.forEach((task, name) => {
      status.jobs.push({
        name,
        running: task.running,
        scheduled: !!task.scheduled
      });
    });

    return status;
  }
}

export default NotificationScheduler;