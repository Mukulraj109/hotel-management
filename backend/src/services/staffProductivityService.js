const Housekeeping = require('../models/Housekeeping');
const User = require('../models/User');
const Booking = require('../models/Booking');
const DailyRoutineCheck = require('../models/DailyRoutineCheck');
const MaintenanceRequest = require('../models/MaintenanceRequest');
const GuestService = require('../models/GuestService');
const LaundryTransaction = require('../models/LaundryTransaction');
const { startOfDay, endOfDay, subDays, format } = require('date-fns');

class StaffProductivityService {
  /**
   * Calculate housekeeping efficiency metrics
   */
  async calculateHousekeepingEfficiency(hotelId, startDate, endDate) {
    try {
      const start = startOfDay(new Date(startDate));
      const end = endOfDay(new Date(endDate));

      // Get all housekeeping tasks in the date range
      const tasks = await Housekeeping.find({
        hotelId,
        createdAt: { $gte: start, $lte: end }
      }).populate('assignedTo roomId');

      // Group by staff member
      const staffMetrics = {};
      
      for (const task of tasks) {
        if (!task.assignedTo) continue;
        
        const staffId = task.assignedTo._id.toString();
        if (!staffMetrics[staffId]) {
          staffMetrics[staffId] = {
            staffId,
            staffName: `${task.assignedTo.firstName} ${task.assignedTo.lastName}`,
            totalTasks: 0,
            completedTasks: 0,
            pendingTasks: 0,
            averageCompletionTime: 0,
            totalCompletionTime: 0,
            onTimeCompletions: 0,
            lateCompletions: 0,
            tasksByType: {},
            tasksByPriority: {},
            roomsCleaned: new Set(),
            inspectionsPassed: 0,
            inspectionsFailed: 0,
            productivityScore: 0
          };
        }

        const metrics = staffMetrics[staffId];
        metrics.totalTasks++;
        
        // Task status
        if (task.status === 'completed') {
          metrics.completedTasks++;
          
          // Calculate completion time
          if (task.completedAt) {
            const completionTime = (new Date(task.completedAt) - new Date(task.createdAt)) / (1000 * 60); // in minutes
            metrics.totalCompletionTime += completionTime;
            
            // Check if completed on time
            if (task.scheduledFor && new Date(task.completedAt) <= new Date(task.scheduledFor)) {
              metrics.onTimeCompletions++;
            } else {
              metrics.lateCompletions++;
            }
          }
        } else if (task.status === 'pending' || task.status === 'in_progress') {
          metrics.pendingTasks++;
        }
        
        // Task types
        metrics.tasksByType[task.taskType] = (metrics.tasksByType[task.taskType] || 0) + 1;
        
        // Task priority
        metrics.tasksByPriority[task.priority] = (metrics.tasksByPriority[task.priority] || 0) + 1;
        
        // Rooms cleaned
        if (task.roomId && task.taskType === 'cleaning' && task.status === 'completed') {
          metrics.roomsCleaned.add(task.roomId._id.toString());
        }
        
        // Inspection results
        if (task.inspectionNotes) {
          if (task.inspectionResult === 'passed') {
            metrics.inspectionsPassed++;
          } else if (task.inspectionResult === 'failed') {
            metrics.inspectionsFailed++;
          }
        }
      }
      
      // Calculate averages and scores
      Object.values(staffMetrics).forEach(metrics => {
        // Average completion time
        if (metrics.completedTasks > 0) {
          metrics.averageCompletionTime = Math.round(metrics.totalCompletionTime / metrics.completedTasks);
        }
        
        // Convert Set to count
        metrics.uniqueRoomsCleaned = metrics.roomsCleaned.size;
        delete metrics.roomsCleaned;
        
        // Calculate productivity score (0-100)
        const completionRate = metrics.totalTasks > 0 ? (metrics.completedTasks / metrics.totalTasks) : 0;
        const onTimeRate = metrics.completedTasks > 0 ? (metrics.onTimeCompletions / metrics.completedTasks) : 0;
        const inspectionRate = (metrics.inspectionsPassed + metrics.inspectionsFailed) > 0
          ? metrics.inspectionsPassed / (metrics.inspectionsPassed + metrics.inspectionsFailed)
          : 1;
        
        metrics.productivityScore = Math.round(
          (completionRate * 40) + // 40% weight for completion rate
          (onTimeRate * 30) +      // 30% weight for on-time completion
          (inspectionRate * 30)     // 30% weight for inspection pass rate
        );
        
        metrics.completionRate = Math.round(completionRate * 100);
        metrics.onTimeRate = Math.round(onTimeRate * 100);
        metrics.inspectionPassRate = Math.round(inspectionRate * 100);
      });
      
      return Object.values(staffMetrics);
    } catch (error) {
      console.error('Error calculating housekeeping efficiency:', error);
      throw error;
    }
  }

  /**
   * Get staff performance metrics across all departments
   */
  async getStaffPerformanceMetrics(hotelId, startDate, endDate) {
    try {
      const start = startOfDay(new Date(startDate));
      const end = endOfDay(new Date(endDate));
      
      // Get all staff members
      const staff = await User.find({
        hotelId,
        role: { $in: ['staff', 'housekeeping', 'maintenance', 'front_desk'] }
      });
      
      const performanceData = [];
      
      for (const member of staff) {
        const metrics = {
          staffId: member._id,
          staffName: `${member.firstName} ${member.lastName}`,
          department: member.role,
          email: member.email,
          metrics: {}
        };
        
        // Housekeeping metrics
        if (member.role === 'housekeeping' || member.role === 'staff') {
          const housekeepingTasks = await Housekeeping.countDocuments({
            assignedTo: member._id,
            createdAt: { $gte: start, $lte: end }
          });
          
          const completedTasks = await Housekeeping.countDocuments({
            assignedTo: member._id,
            status: 'completed',
            createdAt: { $gte: start, $lte: end }
          });
          
          metrics.metrics.housekeeping = {
            totalTasks: housekeepingTasks,
            completedTasks,
            completionRate: housekeepingTasks > 0 ? Math.round((completedTasks / housekeepingTasks) * 100) : 0
          };
        }
        
        // Maintenance metrics
        if (member.role === 'maintenance' || member.role === 'staff') {
          const maintenanceTasks = await MaintenanceRequest.countDocuments({
            assignedTo: member._id,
            createdAt: { $gte: start, $lte: end }
          });
          
          const resolvedTasks = await MaintenanceRequest.countDocuments({
            assignedTo: member._id,
            status: 'resolved',
            createdAt: { $gte: start, $lte: end }
          });
          
          metrics.metrics.maintenance = {
            totalRequests: maintenanceTasks,
            resolvedRequests: resolvedTasks,
            resolutionRate: maintenanceTasks > 0 ? Math.round((resolvedTasks / maintenanceTasks) * 100) : 0
          };
        }
        
        // Guest service metrics
        const guestServiceRequests = await GuestService.countDocuments({
          assignedTo: member._id,
          createdAt: { $gte: start, $lte: end }
        });
        
        const fulfilledRequests = await GuestService.countDocuments({
          assignedTo: member._id,
          status: 'fulfilled',
          createdAt: { $gte: start, $lte: end }
        });
        
        metrics.metrics.guestServices = {
          totalRequests: guestServiceRequests,
          fulfilledRequests,
          fulfillmentRate: guestServiceRequests > 0 ? Math.round((fulfilledRequests / guestServiceRequests) * 100) : 0
        };
        
        // Daily routine checks
        const routineChecks = await DailyRoutineCheck.countDocuments({
          checkedBy: member._id,
          date: { $gte: start, $lte: end }
        });
        
        metrics.metrics.routineChecks = routineChecks;
        
        // Calculate overall performance score
        let totalScore = 0;
        let scoreCount = 0;
        
        if (metrics.metrics.housekeeping) {
          totalScore += metrics.metrics.housekeeping.completionRate;
          scoreCount++;
        }
        if (metrics.metrics.maintenance) {
          totalScore += metrics.metrics.maintenance.resolutionRate;
          scoreCount++;
        }
        if (metrics.metrics.guestServices) {
          totalScore += metrics.metrics.guestServices.fulfillmentRate;
          scoreCount++;
        }
        
        metrics.overallPerformance = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;
        
        performanceData.push(metrics);
      }
      
      return performanceData;
    } catch (error) {
      console.error('Error getting staff performance metrics:', error);
      throw error;
    }
  }

  /**
   * Get task completion rates by department
   */
  async getTaskCompletionRates(hotelId, startDate, endDate) {
    try {
      const start = startOfDay(new Date(startDate));
      const end = endOfDay(new Date(endDate));
      
      const departments = ['housekeeping', 'maintenance', 'guest_services', 'laundry', 'front_desk'];
      const completionRates = [];
      
      for (const dept of departments) {
        let totalTasks = 0;
        let completedTasks = 0;
        let pendingTasks = 0;
        let overdueTasks = 0;
        let avgCompletionTime = 0;
        
        switch (dept) {
          case 'housekeeping':
            const hkTasks = await Housekeeping.find({
              hotelId,
              createdAt: { $gte: start, $lte: end }
            });
            
            totalTasks = hkTasks.length;
            completedTasks = hkTasks.filter(t => t.status === 'completed').length;
            pendingTasks = hkTasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length;
            overdueTasks = hkTasks.filter(t => 
              t.scheduledFor && 
              new Date(t.scheduledFor) < new Date() && 
              t.status !== 'completed'
            ).length;
            
            // Calculate average completion time
            const completedHkTasks = hkTasks.filter(t => t.status === 'completed' && t.completedAt);
            if (completedHkTasks.length > 0) {
              const totalTime = completedHkTasks.reduce((sum, task) => {
                return sum + (new Date(task.completedAt) - new Date(task.createdAt));
              }, 0);
              avgCompletionTime = Math.round(totalTime / completedHkTasks.length / (1000 * 60)); // in minutes
            }
            break;
            
          case 'maintenance':
            const maintTasks = await MaintenanceRequest.find({
              hotelId,
              createdAt: { $gte: start, $lte: end }
            });
            
            totalTasks = maintTasks.length;
            completedTasks = maintTasks.filter(t => t.status === 'resolved').length;
            pendingTasks = maintTasks.filter(t => 
              t.status === 'pending' || t.status === 'in_progress'
            ).length;
            overdueTasks = maintTasks.filter(t => 
              t.priority === 'urgent' && 
              t.status !== 'resolved' &&
              new Date(t.createdAt) < subDays(new Date(), 1) // Urgent tasks older than 1 day
            ).length;
            break;
            
          case 'guest_services':
            const gsTasks = await GuestService.find({
              hotelId,
              createdAt: { $gte: start, $lte: end }
            });
            
            totalTasks = gsTasks.length;
            completedTasks = gsTasks.filter(t => t.status === 'fulfilled').length;
            pendingTasks = gsTasks.filter(t => 
              t.status === 'pending' || t.status === 'in_progress'
            ).length;
            break;
            
          case 'laundry':
            const laundryTasks = await LaundryTransaction.find({
              hotelId,
              sentDate: { $gte: start, $lte: end }
            });
            
            totalTasks = laundryTasks.length;
            completedTasks = laundryTasks.filter(t => t.status === 'returned').length;
            pendingTasks = laundryTasks.filter(t => 
              ['pending', 'in_laundry', 'cleaning', 'ready'].includes(t.status)
            ).length;
            overdueTasks = laundryTasks.filter(t => 
              t.expectedReturnDate && 
              new Date(t.expectedReturnDate) < new Date() && 
              t.status !== 'returned'
            ).length;
            break;
        }
        
        completionRates.push({
          department: dept,
          totalTasks,
          completedTasks,
          pendingTasks,
          overdueTasks,
          completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
          overdueRate: totalTasks > 0 ? Math.round((overdueTasks / totalTasks) * 100) : 0,
          avgCompletionTime,
          efficiency: totalTasks > 0 ? Math.round(((completedTasks - overdueTasks) / totalTasks) * 100) : 0
        });
      }
      
      return completionRates;
    } catch (error) {
      console.error('Error getting task completion rates:', error);
      throw error;
    }
  }

  /**
   * Get productivity trends over time
   */
  async getProductivityTrends(hotelId, days = 30) {
    try {
      const trends = [];
      const today = new Date();
      
      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(today, i);
        const start = startOfDay(date);
        const end = endOfDay(date);
        
        // Get metrics for this day
        const housekeepingTasks = await Housekeeping.countDocuments({
          hotelId,
          createdAt: { $gte: start, $lte: end }
        });
        
        const completedHousekeeping = await Housekeeping.countDocuments({
          hotelId,
          status: 'completed',
          createdAt: { $gte: start, $lte: end }
        });
        
        const maintenanceRequests = await MaintenanceRequest.countDocuments({
          hotelId,
          createdAt: { $gte: start, $lte: end }
        });
        
        const resolvedMaintenance = await MaintenanceRequest.countDocuments({
          hotelId,
          status: 'resolved',
          createdAt: { $gte: start, $lte: end }
        });
        
        const guestServices = await GuestService.countDocuments({
          hotelId,
          createdAt: { $gte: start, $lte: end }
        });
        
        const fulfilledServices = await GuestService.countDocuments({
          hotelId,
          status: 'fulfilled',
          createdAt: { $gte: start, $lte: end }
        });
        
        const totalTasks = housekeepingTasks + maintenanceRequests + guestServices;
        const completedTasks = completedHousekeeping + resolvedMaintenance + fulfilledServices;
        
        trends.push({
          date: format(date, 'yyyy-MM-dd'),
          dayOfWeek: format(date, 'EEEE'),
          totalTasks,
          completedTasks,
          housekeepingTasks,
          completedHousekeeping,
          maintenanceRequests,
          resolvedMaintenance,
          guestServices,
          fulfilledServices,
          overallCompletionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
          housekeepingRate: housekeepingTasks > 0 ? Math.round((completedHousekeeping / housekeepingTasks) * 100) : 0,
          maintenanceRate: maintenanceRequests > 0 ? Math.round((resolvedMaintenance / maintenanceRequests) * 100) : 0,
          servicesRate: guestServices > 0 ? Math.round((fulfilledServices / guestServices) * 100) : 0
        });
      }
      
      // Calculate averages and identify patterns
      const avgProductivity = Math.round(
        trends.reduce((sum, t) => sum + t.overallCompletionRate, 0) / trends.length
      );
      
      const weekdayAvg = Math.round(
        trends.filter(t => !['Saturday', 'Sunday'].includes(t.dayOfWeek))
          .reduce((sum, t, _, arr) => sum + t.overallCompletionRate / arr.length, 0)
      );
      
      const weekendAvg = Math.round(
        trends.filter(t => ['Saturday', 'Sunday'].includes(t.dayOfWeek))
          .reduce((sum, t, _, arr) => sum + t.overallCompletionRate / arr.length, 0)
      );
      
      return {
        trends,
        summary: {
          averageProductivity: avgProductivity,
          weekdayProductivity: weekdayAvg,
          weekendProductivity: weekendAvg,
          bestDay: trends.reduce((best, t) => 
            t.overallCompletionRate > best.overallCompletionRate ? t : best
          ),
          worstDay: trends.reduce((worst, t) => 
            t.overallCompletionRate < worst.overallCompletionRate ? t : worst
          ),
          totalTasksCompleted: trends.reduce((sum, t) => sum + t.completedTasks, 0),
          totalTasksCreated: trends.reduce((sum, t) => sum + t.totalTasks, 0)
        }
      };
    } catch (error) {
      console.error('Error getting productivity trends:', error);
      throw error;
    }
  }

  /**
   * Get department performance comparison
   */
  async getDepartmentComparison(hotelId, startDate, endDate) {
    try {
      const start = startOfDay(new Date(startDate));
      const end = endOfDay(new Date(endDate));
      
      // Housekeeping department
      const housekeepingStaff = await User.countDocuments({
        hotelId,
        role: { $in: ['housekeeping', 'staff'] }
      });
      
      const housekeepingTasks = await Housekeeping.find({
        hotelId,
        createdAt: { $gte: start, $lte: end }
      });
      
      const housekeepingMetrics = {
        department: 'Housekeeping',
        staffCount: housekeepingStaff,
        totalTasks: housekeepingTasks.length,
        completedTasks: housekeepingTasks.filter(t => t.status === 'completed').length,
        avgTasksPerStaff: housekeepingStaff > 0 ? Math.round(housekeepingTasks.length / housekeepingStaff) : 0,
        completionRate: housekeepingTasks.length > 0 
          ? Math.round((housekeepingTasks.filter(t => t.status === 'completed').length / housekeepingTasks.length) * 100)
          : 0,
        highPriorityTasks: housekeepingTasks.filter(t => t.priority === 'high').length,
        avgResponseTime: 0 // Calculate based on task creation to assignment time
      };
      
      // Maintenance department
      const maintenanceStaff = await User.countDocuments({
        hotelId,
        role: { $in: ['maintenance', 'staff'] }
      });
      
      const maintenanceRequests = await MaintenanceRequest.find({
        hotelId,
        createdAt: { $gte: start, $lte: end }
      });
      
      const maintenanceMetrics = {
        department: 'Maintenance',
        staffCount: maintenanceStaff,
        totalTasks: maintenanceRequests.length,
        completedTasks: maintenanceRequests.filter(t => t.status === 'resolved').length,
        avgTasksPerStaff: maintenanceStaff > 0 ? Math.round(maintenanceRequests.length / maintenanceStaff) : 0,
        completionRate: maintenanceRequests.length > 0 
          ? Math.round((maintenanceRequests.filter(t => t.status === 'resolved').length / maintenanceRequests.length) * 100)
          : 0,
        urgentRequests: maintenanceRequests.filter(t => t.priority === 'urgent').length,
        avgResolutionTime: 0 // Calculate based on request to resolution time
      };
      
      // Front Desk (based on check-ins/check-outs)
      const frontDeskStaff = await User.countDocuments({
        hotelId,
        role: { $in: ['front_desk', 'staff', 'admin'] }
      });
      
      const checkIns = await Booking.countDocuments({
        hotelId,
        checkIn: { $gte: start, $lte: end }
      });
      
      const checkOuts = await Booking.countDocuments({
        hotelId,
        checkOut: { $gte: start, $lte: end }
      });
      
      const frontDeskMetrics = {
        department: 'Front Desk',
        staffCount: frontDeskStaff,
        totalTransactions: checkIns + checkOuts,
        checkIns,
        checkOuts,
        avgTransactionsPerStaff: frontDeskStaff > 0 ? Math.round((checkIns + checkOuts) / frontDeskStaff) : 0,
        efficiency: 100 // Placeholder - would need more specific metrics
      };
      
      return [housekeepingMetrics, maintenanceMetrics, frontDeskMetrics];
    } catch (error) {
      console.error('Error getting department comparison:', error);
      throw error;
    }
  }

  /**
   * Get staff workload distribution
   */
  async getWorkloadDistribution(hotelId, date = new Date()) {
    try {
      const start = startOfDay(date);
      const end = endOfDay(date);
      
      // Get all active staff
      const staff = await User.find({
        hotelId,
        role: { $in: ['staff', 'housekeeping', 'maintenance', 'front_desk'] },
        isActive: true
      });
      
      const workloadData = [];
      
      for (const member of staff) {
        const workload = {
          staffId: member._id,
          staffName: `${member.firstName} ${member.lastName}`,
          department: member.role,
          currentTasks: 0,
          pendingTasks: 0,
          completedToday: 0,
          assignedRooms: [],
          urgentTasks: 0,
          estimatedWorkload: 0 // in hours
        };
        
        // Get current tasks
        const housekeepingTasks = await Housekeeping.find({
          assignedTo: member._id,
          createdAt: { $gte: start, $lte: end }
        }).populate('roomId');
        
        const maintenanceTasks = await MaintenanceRequest.find({
          assignedTo: member._id,
          createdAt: { $gte: start, $lte: end }
        });
        
        const serviceTasks = await GuestService.find({
          assignedTo: member._id,
          createdAt: { $gte: start, $lte: end }
        });
        
        // Count tasks by status
        workload.currentTasks = [
          ...housekeepingTasks.filter(t => t.status === 'in_progress'),
          ...maintenanceTasks.filter(t => t.status === 'in_progress'),
          ...serviceTasks.filter(t => t.status === 'in_progress')
        ].length;
        
        workload.pendingTasks = [
          ...housekeepingTasks.filter(t => t.status === 'pending'),
          ...maintenanceTasks.filter(t => t.status === 'pending'),
          ...serviceTasks.filter(t => t.status === 'pending')
        ].length;
        
        workload.completedToday = [
          ...housekeepingTasks.filter(t => t.status === 'completed'),
          ...maintenanceTasks.filter(t => t.status === 'resolved'),
          ...serviceTasks.filter(t => t.status === 'fulfilled')
        ].length;
        
        // Get assigned rooms
        workload.assignedRooms = [...new Set(
          housekeepingTasks
            .filter(t => t.roomId)
            .map(t => t.roomId.roomNumber)
        )];
        
        // Count urgent tasks
        workload.urgentTasks = [
          ...housekeepingTasks.filter(t => t.priority === 'high'),
          ...maintenanceTasks.filter(t => t.priority === 'urgent'),
          ...serviceTasks.filter(t => t.priority === 'high')
        ].length;
        
        // Estimate workload in hours
        const housekeepingHours = housekeepingTasks.filter(t => t.status !== 'completed').length * 0.5; // 30 min per room
        const maintenanceHours = maintenanceTasks.filter(t => t.status !== 'resolved').length * 1; // 1 hour per request
        const serviceHours = serviceTasks.filter(t => t.status !== 'fulfilled').length * 0.25; // 15 min per service
        
        workload.estimatedWorkload = Math.round((housekeepingHours + maintenanceHours + serviceHours) * 10) / 10;
        
        // Calculate workload status
        if (workload.estimatedWorkload > 8) {
          workload.status = 'overloaded';
        } else if (workload.estimatedWorkload > 6) {
          workload.status = 'busy';
        } else if (workload.estimatedWorkload > 3) {
          workload.status = 'normal';
        } else {
          workload.status = 'light';
        }
        
        workloadData.push(workload);
      }
      
      return workloadData;
    } catch (error) {
      console.error('Error getting workload distribution:', error);
      throw error;
    }
  }
}

module.exports = new StaffProductivityService();