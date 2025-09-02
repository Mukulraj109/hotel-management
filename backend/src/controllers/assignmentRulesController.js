import TapeChartModels from '../models/TapeChart.js';
import User from '../models/User.js';
import { validationResult } from 'express-validator';

const { RoomAssignmentRules } = TapeChartModels;

class AssignmentRulesController {
  // Create a new assignment rule
  async createAssignmentRule(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const {
        ruleName,
        priority,
        conditions,
        actions,
        restrictions
      } = req.body;

      // Create assignment rule
      const assignmentRule = new RoomAssignmentRules({
        ruleName,
        priority: priority || 1,
        conditions: conditions || {},
        actions: actions || {},
        restrictions: restrictions || {},
        isActive: true,
        createdBy: req.user._id
      });

      await assignmentRule.save();

      // Populate the created rule
      const populatedRule = await RoomAssignmentRules.findById(assignmentRule._id)
        .populate('createdBy', 'name email')
        .populate('lastModifiedBy', 'name email');

      res.status(201).json({
        success: true,
        message: 'Assignment rule created successfully',
        data: populatedRule
      });

    } catch (error) {
      console.error('Create assignment rule error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create assignment rule',
        error: error.message
      });
    }
  }

  // Get all assignment rules
  async getAssignmentRules(req, res) {
    try {
      const {
        isActive,
        priority,
        page = 1,
        limit = 20,
        sortBy = 'priority',
        sortOrder = 'asc'
      } = req.query;

      const query = {};
      
      if (isActive !== undefined) query.isActive = isActive === 'true';
      if (priority) query.priority = parseInt(priority);

      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [assignmentRules, total] = await Promise.all([
        RoomAssignmentRules.find(query)
          .populate('createdBy', 'name email')
          .populate('lastModifiedBy', 'name email')
          .sort(sortOptions)
          .skip(skip)
          .limit(parseInt(limit)),
        RoomAssignmentRules.countDocuments(query)
      ]);

      res.json({
        success: true,
        data: assignmentRules,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total
        }
      });

    } catch (error) {
      console.error('Get assignment rules error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch assignment rules',
        error: error.message
      });
    }
  }

  // Get assignment rule by ID
  async getAssignmentRule(req, res) {
    try {
      const { id } = req.params;

      const assignmentRule = await RoomAssignmentRules.findById(id)
        .populate('createdBy', 'name email')
        .populate('lastModifiedBy', 'name email');

      if (!assignmentRule) {
        return res.status(404).json({
          success: false,
          message: 'Assignment rule not found'
        });
      }

      res.json({
        success: true,
        data: assignmentRule
      });

    } catch (error) {
      console.error('Get assignment rule error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch assignment rule',
        error: error.message
      });
    }
  }

  // Update assignment rule
  async updateAssignmentRule(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const assignmentRule = await RoomAssignmentRules.findById(id);
      if (!assignmentRule) {
        return res.status(404).json({
          success: false,
          message: 'Assignment rule not found'
        });
      }

      // Update allowed fields
      const allowedUpdates = [
        'ruleName', 'priority', 'isActive', 'conditions', 
        'actions', 'restrictions'
      ];

      allowedUpdates.forEach(field => {
        if (updates[field] !== undefined) {
          assignmentRule[field] = updates[field];
        }
      });

      assignmentRule.lastModifiedBy = req.user._id;
      await assignmentRule.save();

      const updatedRule = await RoomAssignmentRules.findById(id)
        .populate('createdBy', 'name email')
        .populate('lastModifiedBy', 'name email');

      res.json({
        success: true,
        message: 'Assignment rule updated successfully',
        data: updatedRule
      });

    } catch (error) {
      console.error('Update assignment rule error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update assignment rule',
        error: error.message
      });
    }
  }

  // Delete assignment rule
  async deleteAssignmentRule(req, res) {
    try {
      const { id } = req.params;

      const assignmentRule = await RoomAssignmentRules.findByIdAndDelete(id);
      if (!assignmentRule) {
        return res.status(404).json({
          success: false,
          message: 'Assignment rule not found'
        });
      }

      res.json({
        success: true,
        message: 'Assignment rule deleted successfully'
      });

    } catch (error) {
      console.error('Delete assignment rule error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete assignment rule',
        error: error.message
      });
    }
  }

  // Get assignment rules statistics
  async getAssignmentRulesStats(req, res) {
    try {
      const stats = await RoomAssignmentRules.aggregate([
        {
          $group: {
            _id: '$isActive',
            count: { $sum: 1 },
            avgPriority: { $avg: '$priority' }
          }
        }
      ]);

      const priorityStats = await RoomAssignmentRules.aggregate([
        {
          $group: {
            _id: '$priority',
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      const recentRules = await RoomAssignmentRules.find()
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 })
        .limit(5);

      res.json({
        success: true,
        data: {
          statusStats: stats,
          priorityStats,
          recentRules
        }
      });

    } catch (error) {
      console.error('Get assignment rules stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch assignment rules statistics',
        error: error.message
      });
    }
  }

  // Test assignment rule against booking criteria
  async testAssignmentRule(req, res) {
    try {
      const { id } = req.params;
      const { testCriteria } = req.body;

      const assignmentRule = await RoomAssignmentRules.findById(id);
      if (!assignmentRule) {
        return res.status(404).json({
          success: false,
          message: 'Assignment rule not found'
        });
      }

      // Simple rule matching logic (in real system this would be more complex)
      const matches = this.evaluateRuleConditions(assignmentRule.conditions, testCriteria);

      res.json({
        success: true,
        data: {
          ruleId: id,
          ruleName: assignmentRule.ruleName,
          matches,
          applicableActions: matches ? assignmentRule.actions : null,
          testCriteria
        }
      });

    } catch (error) {
      console.error('Test assignment rule error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to test assignment rule',
        error: error.message
      });
    }
  }

  // Helper method to evaluate rule conditions
  evaluateRuleConditions(conditions, criteria) {
    // Simple evaluation logic - in a real system this would be more sophisticated
    if (!conditions || !criteria) return false;

    // Check guest type match
    if (conditions.guestType && conditions.guestType.length > 0) {
      if (!conditions.guestType.includes(criteria.guestType)) return false;
    }

    // Check room types match
    if (conditions.roomTypes && conditions.roomTypes.length > 0) {
      if (!conditions.roomTypes.includes(criteria.roomType)) return false;
    }

    // Check length of stay
    if (conditions.lengthOfStay) {
      const { min, max } = conditions.lengthOfStay;
      if (min && criteria.lengthOfStay < min) return false;
      if (max && criteria.lengthOfStay > max) return false;
    }

    return true;
  }
}

export default new AssignmentRulesController();