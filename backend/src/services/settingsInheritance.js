import Hotel from '../models/Hotel.js';
import PropertyGroup from '../models/PropertyGroup.js';
import SettingsInheritance from '../models/SettingsInheritance.js';
import { ApplicationError } from '../middleware/errorHandler.js';

/**
 * Settings Inheritance Service
 *
 * Handles settings inheritance from PropertyGroups to individual properties.
 * Allows applying settings to:
 * - Single property only
 * - All properties in a group
 * - All properties owned by a user
 */

export class SettingsInheritanceService {
  /**
   * Apply group settings to a specific property
   *
   * @param {string} propertyId - Property to update
   * @param {string} groupId - PropertyGroup ID
   * @returns {Promise<Object>} Updated property
   */
  static async applyGroupSettings(propertyId, groupId) {
    const [property, group] = await Promise.all([
      Hotel.findById(propertyId),
      PropertyGroup.findById(groupId)
    ]);

    if (!property) {
      throw new ApplicationError('Property not found', 404);
    }

    if (!group) {
      throw new ApplicationError('Property group not found', 404);
    }

    // Check if property should inherit settings
    if (!property.groupSettings?.inheritSettings) {
      return {
        success: false,
        message: 'Property has inheritance disabled',
        property
      };
    }

    // Apply settings based on group configuration
    const updates = {};

    // Currency settings
    if (group.settings?.baseCurrency) {
      updates['settings.currency'] = group.settings.baseCurrency;
    }

    // Timezone settings
    if (group.settings?.timezone) {
      updates['settings.timezone'] = group.settings.timezone;
    }

    // Language settings
    if (group.settings?.defaultLanguage) {
      updates['settings.defaultLanguage'] = group.settings.defaultLanguage;
    }

    // Cancellation policy
    if (group.settings?.defaultCancellationPolicy) {
      updates['policies.cancellationPolicy'] = group.settings.defaultCancellationPolicy;
    }

    // Check-in/Check-out times
    if (group.settings?.checkInTime) {
      updates['policies.checkInTime'] = group.settings.checkInTime;
    }
    if (group.settings?.checkOutTime) {
      updates['policies.checkOutTime'] = group.settings.checkOutTime;
    }

    // Rate management settings
    if (group.settings?.rateManagement) {
      if (group.settings.rateManagement.centralizedRates) {
        updates['rateManagement.centralizedRates'] = true;
        updates['rateManagement.allowPropertyOverrides'] =
          group.settings.rateManagement.allowPropertyOverrides || false;
      }
    }

    // Update sync metadata
    updates['groupSettings.lastSyncAt'] = new Date();
    updates['groupSettings.version'] = group.updatedAt;

    // Apply updates
    const updatedProperty = await Hotel.findByIdAndUpdate(
      propertyId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    return {
      success: true,
      message: 'Settings applied successfully',
      property: updatedProperty,
      appliedSettings: Object.keys(updates)
    };
  }

  /**
   * Apply settings to all properties in a group
   *
   * @param {string} groupId - PropertyGroup ID
   * @param {Object} settings - Settings to apply
   * @returns {Promise<Object>} Summary of updates
   */
  static async applySettingsToGroup(groupId, settings) {
    const group = await PropertyGroup.findById(groupId);

    if (!group) {
      throw new ApplicationError('Property group not found', 404);
    }

    // Get all properties in this group
    const properties = await Hotel.find({
      propertyGroupId: groupId,
      'groupSettings.inheritSettings': true
    });

    if (properties.length === 0) {
      return {
        success: true,
        message: 'No properties with inheritance enabled',
        propertiesUpdated: 0,
        properties: []
      };
    }

    // Apply settings to each property
    const results = await Promise.allSettled(
      properties.map(property =>
        this.applyGroupSettings(property._id.toString(), groupId)
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled');
    const failed = results.filter(r => r.status === 'rejected');

    return {
      success: true,
      message: `Settings applied to ${successful.length} properties`,
      propertiesUpdated: successful.length,
      propertiesFailed: failed.length,
      properties: successful.map(r => r.value.property),
      errors: failed.map(r => r.reason?.message || 'Unknown error')
    };
  }

  /**
   * Apply settings to all properties owned by a user
   *
   * @param {string} userId - User ID
   * @param {Object} settingUpdates - Settings to apply
   * @param {string} settingType - Type of setting (e.g., 'roomTypes', 'taxes', 'policies')
   * @returns {Promise<Object>} Summary of updates
   */
  static async applySettingsToAllUserProperties(userId, settingUpdates, settingType) {
    // Get all properties owned by user
    const properties = await Hotel.find({
      $or: [
        { ownerId: userId },
        { createdBy: userId }
      ],
      isActive: true
    });

    if (properties.length === 0) {
      return {
        success: false,
        message: 'No properties found for this user',
        propertiesUpdated: 0
      };
    }

    const propertyIds = properties.map(p => p._id);

    // Build update object based on setting type
    const updates = this._buildUpdateObject(settingType, settingUpdates);

    // Apply updates to all properties
    const result = await Hotel.updateMany(
      { _id: { $in: propertyIds } },
      { $set: updates },
      { runValidators: true }
    );

    return {
      success: true,
      message: `Settings applied to ${result.modifiedCount} properties`,
      propertiesUpdated: result.modifiedCount,
      propertyIds: propertyIds.map(id => id.toString()),
      appliedSettings: Object.keys(updates)
    };
  }

  /**
   * Check if property can override group settings
   *
   * @param {Object} property - Property document
   * @param {string} settingKey - Setting key to check
   * @returns {Promise<boolean>} Can override
   */
  static async canOverride(property, settingKey) {
    // If property has no group, can always override
    if (!property.propertyGroupId) {
      return true;
    }

    // Get group settings
    const group = await PropertyGroup.findById(property.propertyGroupId);

    if (!group) {
      return true; // Group not found, allow override
    }

    // Check if group allows overrides
    if (group.settings?.rateManagement?.allowPropertyOverrides === false) {
      // Check if this specific setting can be overridden
      const restrictedSettings = group.settings?.restrictedSettings || [];
      return !restrictedSettings.includes(settingKey);
    }

    return true;
  }

  /**
   * Validate settings before applying to multiple properties
   *
   * @param {Object} settings - Settings to validate
   * @param {string} settingType - Type of setting
   * @returns {Object} Validation result
   */
  static validateSettings(settings, settingType) {
    const errors = [];

    switch (settingType) {
      case 'checkInOut':
        if (settings.checkInTime && !this._isValidTime(settings.checkInTime)) {
          errors.push('Invalid check-in time format');
        }
        if (settings.checkOutTime && !this._isValidTime(settings.checkOutTime)) {
          errors.push('Invalid check-out time format');
        }
        break;

      case 'currency':
        if (settings.currency && !this._isValidCurrency(settings.currency)) {
          errors.push('Invalid currency code');
        }
        break;

      case 'timezone':
        if (settings.timezone && !this._isValidTimezone(settings.timezone)) {
          errors.push('Invalid timezone');
        }
        break;

      // Add more validation rules as needed
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get inheritance status for a property
   *
   * @param {string} propertyId - Property ID
   * @returns {Promise<Object>} Inheritance status
   */
  static async getInheritanceStatus(propertyId) {
    const property = await Hotel.findById(propertyId).populate('propertyGroupId');

    if (!property) {
      throw new ApplicationError('Property not found', 404);
    }

    // Get inheritance records summary
    const inheritanceSummary = await SettingsInheritance.getPropertySummary(propertyId);

    return {
      propertyId: property._id,
      propertyName: property.name,
      hasGroup: !!property.propertyGroupId,
      groupId: property.propertyGroupId?._id,
      groupName: property.propertyGroupId?.name,
      inheritanceEnabled: property.groupSettings?.inheritSettings || false,
      lastSyncAt: property.groupSettings?.lastSyncAt,
      canOverride: await this.canOverride(property, 'general'),
      summary: inheritanceSummary
    };
  }

  /**
   * Apply settings based on scope (single, group, or all properties)
   *
   * @param {Object} options - Apply settings options
   * @param {string} options.scope - 'single', 'group', or 'all'
   * @param {string} options.propertyId - Property ID
   * @param {string} options.settingType - Type of setting
   * @param {Object} options.settingUpdates - Settings to apply
   * @param {string} options.userId - User performing the action
   * @returns {Promise<Object>} Application result
   */
  static async applySettingsByScope({ scope, propertyId, settingType, settingUpdates, userId }) {
    try {
      const property = await Hotel.findById(propertyId).populate('propertyGroupId');

      if (!property) {
        throw new ApplicationError('Property not found', 404);
      }

      let propertiesToUpdate = [];
      let affectedProperties = [];

      // Determine scope
      switch (scope) {
        case 'single':
          propertiesToUpdate = [property._id];
          affectedProperties = [property];
          break;

        case 'group':
          if (!property.propertyGroupId) {
            throw new ApplicationError('Property is not part of a group', 400);
          }
          affectedProperties = await Hotel.find({
            propertyGroupId: property.propertyGroupId._id,
            isActive: true
          });
          propertiesToUpdate = affectedProperties.map(p => p._id);
          break;

        case 'all':
          affectedProperties = await Hotel.find({
            ownerId: property.ownerId,
            isActive: true
          });
          propertiesToUpdate = affectedProperties.map(p => p._id);
          break;

        default:
          throw new ApplicationError('Invalid scope', 400);
      }

      // Apply settings to each property
      const startTime = Date.now();
      const results = await Promise.allSettled(
        propertiesToUpdate.map(propId =>
          this.updatePropertySettings(propId, settingType, settingUpdates, userId)
        )
      );

      const syncDuration = Date.now() - startTime;
      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');

      // Create or update inheritance records
      if (scope === 'group' && property.propertyGroupId) {
        await this.updateInheritanceRecords({
          groupId: property.propertyGroupId._id,
          propertyIds: propertiesToUpdate,
          settingType,
          settingUpdates,
          userId,
          scope,
          syncDuration
        });
      }

      return {
        success: true,
        scope,
        propertiesUpdated: successful.length,
        propertiesFailed: failed.length,
        totalProperties: propertiesToUpdate.length,
        syncDuration,
        propertyIds: propertiesToUpdate.map(id => id.toString()),
        errors: failed.map(r => r.reason?.message || 'Unknown error')
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update inheritance records after applying settings
   *
   * @param {Object} options - Update options
   * @returns {Promise<void>}
   */
  static async updateInheritanceRecords({
    groupId,
    propertyIds,
    settingType,
    settingUpdates,
    userId,
    scope,
    syncDuration
  }) {
    const records = propertyIds.map(propertyId => ({
      propertyId,
      groupId,
      settingType,
      isInheriting: true,
      hasOverride: false,
      inheritedValues: settingUpdates,
      syncedAt: new Date(),
      syncedBy: userId,
      syncStatus: 'synced',
      metadata: {
        appliedScope: scope,
        affectedPropertiesCount: propertyIds.length,
        syncDuration,
        currentVersion: new Date()
      }
    }));

    await SettingsInheritance.bulkUpsert(records);
  }

  /**
   * Get affected properties count based on scope
   *
   * @param {Object} options - Options
   * @returns {Promise<number>} Count of affected properties
   */
  static async getAffectedPropertiesCount({ scope, propertyId }) {
    try {
      const property = await Hotel.findById(propertyId);

      if (!property) {
        return 0;
      }

      switch (scope) {
        case 'single':
          return 1;

        case 'group':
          if (!property.propertyGroupId) return 1;
          return await Hotel.countDocuments({
            propertyGroupId: property.propertyGroupId,
            isActive: true
          });

        case 'all':
          return await Hotel.countDocuments({
            ownerId: property.ownerId,
            isActive: true
          });

        default:
          return 0;
      }
    } catch (error) {
      console.error('Error getting affected properties count:', error);
      return 0;
    }
  }

  /**
   * Get inheritance summary for a group
   *
   * @param {string} groupId - Property Group ID
   * @returns {Promise<Object>} Inheritance summary
   */
  static async getGroupInheritanceSummary(groupId) {
    const group = await PropertyGroup.findById(groupId);

    if (!group) {
      throw new ApplicationError('Property group not found', 404);
    }

    const summary = await SettingsInheritance.getGroupSummary(groupId);

    return {
      groupId,
      groupName: group.name,
      ...summary
    };
  }

  /**
   * Toggle inheritance for a property setting
   *
   * @param {string} propertyId - Property ID
   * @param {string} settingType - Setting type
   * @param {boolean} enable - Enable or disable inheritance
   * @returns {Promise<Object>} Result
   */
  static async toggleInheritance(propertyId, settingType, enable) {
    const property = await Hotel.findById(propertyId);

    if (!property) {
      throw new ApplicationError('Property not found', 404);
    }

    if (!property.propertyGroupId) {
      throw new ApplicationError('Property is not part of a group', 400);
    }

    // Find or create inheritance record
    let inheritanceRecord = await SettingsInheritance.findOne({
      propertyId,
      settingType
    });

    if (!inheritanceRecord) {
      inheritanceRecord = await SettingsInheritance.create({
        propertyId,
        groupId: property.propertyGroupId,
        settingType,
        isInheriting: enable,
        syncStatus: enable ? 'pending' : 'manual_override'
      });
    } else {
      inheritanceRecord.isInheriting = enable;
      inheritanceRecord.syncStatus = enable ? 'pending' : 'manual_override';
      await inheritanceRecord.save();
    }

    return {
      success: true,
      message: `Inheritance ${enable ? 'enabled' : 'disabled'} for ${settingType}`,
      inheritance: inheritanceRecord
    };
  }

  /**
   * Set override for a property setting
   *
   * @param {string} propertyId - Property ID
   * @param {string} settingType - Setting type
   * @param {Object} overrideValues - Override values
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Result
   */
  static async setOverride(propertyId, settingType, overrideValues, userId) {
    const property = await Hotel.findById(propertyId);

    if (!property) {
      throw new ApplicationError('Property not found', 404);
    }

    // Find or create inheritance record
    let inheritanceRecord = await SettingsInheritance.findOne({
      propertyId,
      settingType
    });

    if (!inheritanceRecord) {
      inheritanceRecord = await SettingsInheritance.create({
        propertyId,
        groupId: property.propertyGroupId,
        settingType,
        isInheriting: false,
        hasOverride: true,
        overrideValues,
        syncedBy: userId,
        syncStatus: 'manual_override'
      });
    } else {
      await inheritanceRecord.setOverride(overrideValues, userId);
    }

    return {
      success: true,
      message: 'Override set successfully',
      inheritance: inheritanceRecord
    };
  }

  /**
   * Remove override and revert to inheritance
   *
   * @param {string} propertyId - Property ID
   * @param {string} settingType - Setting type
   * @returns {Promise<Object>} Result
   */
  static async removeOverride(propertyId, settingType) {
    const inheritanceRecord = await SettingsInheritance.findOne({
      propertyId,
      settingType
    });

    if (!inheritanceRecord) {
      throw new ApplicationError('Inheritance record not found', 404);
    }

    await inheritanceRecord.removeOverride();

    return {
      success: true,
      message: 'Override removed, inheritance restored',
      inheritance: inheritanceRecord
    };
  }

  /**
   * Preview changes before applying (Feature 2)
   * @param {Object} options - Preview options
   * @returns {Promise<Object>} Preview data
   */
  static async previewChanges({ scope, propertyId, settingType, settingUpdates }) {
    // Get affected properties
    const property = await Hotel.findById(propertyId);

    if (!property) {
      throw new ApplicationError('Property not found', 404);
    }

    let properties = [];

    switch (scope) {
      case 'single':
        properties = [property];
        break;

      case 'group':
        if (!property.propertyGroupId) {
          throw new ApplicationError('Property is not part of a group', 400);
        }
        properties = await Hotel.find({
          propertyGroupId: property.propertyGroupId,
          isActive: true
        });
        break;

      case 'all':
        properties = await Hotel.find({
          ownerId: property.ownerId,
          isActive: true
        });
        break;

      default:
        throw new ApplicationError('Invalid scope', 400);
    }

    if (!properties || properties.length === 0) {
      throw new ApplicationError('No properties found for preview', 404);
    }

    // For each property, get current settings and calculate diff
    const preview = await Promise.all(properties.map(async (prop) => {
      try {
        // Get current settings record
        const record = await SettingsInheritance.findOne({
          propertyId: prop._id,
          settingType
        });

        const currentValues = record
          ? (record.hasOverride ? record.overrideValues : record.inheritedValues)
          : {};

        // Calculate proposed values (merge updates with current)
        const proposedValues = { ...currentValues, ...settingUpdates };

        // Calculate diff
        const changes = this.calculateDetailedDiff(currentValues, proposedValues);

        return {
          propertyId: prop._id,
          propertyName: prop.name,
          propertyCode: prop.code,
          currentValues,
          proposedValues,
          changes, // Array of { field, oldValue, newValue, type: 'added|modified|deleted' }
          hasChanges: changes.length > 0,
          isInheriting: record ? record.isInheriting : false,
          hasOverride: record ? record.hasOverride : false
        };
      } catch (error) {
        return {
          propertyId: prop._id,
          propertyName: prop.name,
          error: error.message,
          hasChanges: false
        };
      }
    }));

    // Calculate summary statistics
    const propertiesWithChanges = preview.filter(p => p.hasChanges && !p.error);
    const totalChangedFields = propertiesWithChanges.reduce(
      (sum, p) => sum + p.changes.length,
      0
    );

    return {
      scope,
      settingType,
      totalPropertiesAffected: properties.length,
      propertiesWithChanges: propertiesWithChanges.length,
      propertiesWithNoChanges: preview.filter(p => !p.hasChanges && !p.error).length,
      propertiesWithErrors: preview.filter(p => p.error).length,
      totalChangedFields,
      preview: preview,
      timestamp: new Date()
    };
  }

  /**
   * Calculate detailed diff between old and new values
   * @param {Object} oldValues - Old values
   * @param {Object} newValues - New values
   * @returns {Array} Array of changes
   */
  static calculateDetailedDiff(oldValues, newValues) {
    const changes = [];
    const allKeys = new Set([...Object.keys(oldValues), ...Object.keys(newValues)]);

    for (const key of allKeys) {
      const oldValue = oldValues[key];
      const newValue = newValues[key];

      if (oldValue === undefined && newValue !== undefined) {
        // Field added
        changes.push({
          field: key,
          oldValue: null,
          newValue,
          type: 'added'
        });
      } else if (oldValue !== undefined && newValue === undefined) {
        // Field deleted
        changes.push({
          field: key,
          oldValue,
          newValue: null,
          type: 'deleted'
        });
      } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        // Field modified
        changes.push({
          field: key,
          oldValue,
          newValue,
          type: 'modified'
        });
      }
    }

    return changes;
  }

  /**
   * Get change history for a property/setting
   * @param {Object} options - Options
   * @returns {Promise<Array>} Change history
   */
  static async getChangeHistory({ propertyId, settingType, limit = 50, includeRolledBack = false }) {
    const record = await SettingsInheritance.findOne({ propertyId, settingType })
      .populate('changeHistory.changedBy', 'name email')
      .populate('changeHistory.rolledBackBy', 'name email');

    if (!record) return [];

    let history = record.changeHistory;

    if (!includeRolledBack) {
      history = history.filter(h => !h.rolledBackAt);
    }

    // Sort by most recent
    history.sort((a, b) => b.changedAt - a.changedAt);

    return history.slice(0, limit);
  }

  /**
   * Rollback specific change
   * @param {Object} options - Rollback options
   * @returns {Promise<Object>} Rollback result
   */
  static async rollbackChange({ propertyId, settingType, historyId, userId }) {
    const record = await SettingsInheritance.findOne({ propertyId, settingType });

    if (!record) {
      throw new ApplicationError('Settings record not found', 404);
    }

    const historyEntry = record.changeHistory.id(historyId);

    if (!historyEntry) {
      throw new ApplicationError('History entry not found', 404);
    }

    if (historyEntry.rolledBackAt) {
      throw new ApplicationError('This change has already been rolled back', 400);
    }

    // Check if rollback period has expired
    if (new Date() > historyEntry.rollbackExpiresAt) {
      throw new ApplicationError('Rollback period has expired (30 days)', 400);
    }

    // Store current values in history before rollback
    const currentValues = { ...record.overrideValues };

    // Restore previous values
    record.overrideValues = { ...historyEntry.previousValues };
    record.syncStatus = 'synced';

    // Mark history entry as rolled back
    historyEntry.rolledBackAt = new Date();
    historyEntry.rolledBackBy = userId;

    // Add rollback action to history
    await record.addToHistory(
      userId,
      currentValues, // What we're rolling back from
      historyEntry.previousValues, // What we're restoring
      'single',
      1
    );

    await record.save();

    // Log audit (will be handled by audit middleware)
    // await auditLogger.logRollback(userId, propertyId, settingType, historyEntry);

    return {
      success: true,
      restoredValues: historyEntry.previousValues,
      record
    };
  }

  /**
   * Bulk rollback (rollback same change across multiple properties)
   * @param {Object} options - Rollback options
   * @returns {Promise<Object>} Rollback result
   */
  static async bulkRollback({ propertyIds, settingType, historyId, userId }) {
    const results = await Promise.allSettled(
      propertyIds.map(propertyId =>
        this.rollbackChange({ propertyId, settingType, historyId, userId })
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return {
      total: propertyIds.length,
      successful,
      failed,
      results: results.map((r, i) => ({
        propertyId: propertyIds[i],
        status: r.status === 'fulfilled' ? 'success' : 'failed',
        error: r.status === 'rejected' ? r.reason.message : null
      }))
    };
  }

  /**
   * Update property settings based on type
   * @param {string} propertyId - Property ID
   * @param {string} settingType - Type of setting
   * @param {Object} settingUpdates - Update data
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Update result
   */
  static async updatePropertySettings(propertyId, settingType, settingUpdates, userId) {
    // Import models dynamically to avoid circular dependencies
    const RoomType = (await import('../models/RoomType.js')).default;
    const MessageTemplate = (await import('../models/MessageTemplate.js')).default;
    const Season = (await import('../models/Season.js')).default;
    const ChannelConfiguration = (await import('../models/ChannelConfiguration.js')).default;
    const PaymentMethod = (await import('../models/PaymentMethod.js')).default;
    const EmailCampaign = (await import('../models/EmailCampaign.js')).default;
    const HotelAllotmentSettings = (await import('../models/HotelAllotmentSettings.js')).default;
    const RoomTax = (await import('../models/RoomTax.js')).default;
    const WebSettings = (await import('../models/WebSettings.js')).default;
    const POSTax = (await import('../models/POSTax.js')).default;
    const HotelSettings = (await import('../models/HotelSettings.js')).default;

    switch (settingType) {
      case 'booking_rules':
        return await Hotel.findByIdAndUpdate(
          propertyId,
          {
            $set: {
              'policies.checkInTime': settingUpdates.checkInTime,
              'policies.checkOutTime': settingUpdates.checkOutTime,
              'policies.cancellationPolicy': settingUpdates.cancellationPolicy,
              updatedAt: new Date()
            }
          },
          { new: true, runValidators: true }
        );

      case 'room_types':
      case 'room_types_update':
        if (settingUpdates.operation === 'create') {
          return await RoomType.create({
            ...settingUpdates.roomTypeData,
            hotelId: propertyId,
            createdBy: userId
          });
        } else if (settingUpdates.operation === 'update') {
          return await RoomType.findOneAndUpdate(
            { hotelId: propertyId, code: settingUpdates.roomTypeCode },
            { $set: { ...settingUpdates.roomTypeData, updatedBy: userId } },
            { new: true, runValidators: true }
          );
        }
        break;

      case 'message_templates':
        if (settingUpdates.operation === 'create') {
          return await MessageTemplate.create({
            ...settingUpdates.templateData,
            hotelId: propertyId,
            createdBy: userId
          });
        } else if (settingUpdates.operation === 'update') {
          return await MessageTemplate.findOneAndUpdate(
            { hotelId: propertyId, name: settingUpdates.templateName },
            { $set: { ...settingUpdates.templateData, lastModifiedBy: userId } },
            { new: true, runValidators: true }
          );
        }
        break;

      case 'seasonal_pricing_season':
      case 'seasonal_pricing_period':
        if (settingUpdates.operation === 'create') {
          return await Season.create({
            ...settingUpdates.seasonData,
            hotelId: propertyId,
            createdBy: userId
          });
        } else if (settingUpdates.operation === 'update') {
          return await Season.findOneAndUpdate(
            { hotelId: propertyId, name: settingUpdates.seasonName },
            { $set: { ...settingUpdates.seasonData, updatedBy: userId } },
            { new: true, runValidators: true }
          );
        }
        break;

      case 'ota_channel_configuration':
        return await ChannelConfiguration.findOneAndUpdate(
          { hotelId: propertyId, channel: settingUpdates.channel },
          {
            $set: {
              ...settingUpdates.configData,
              updatedBy: userId,
              updatedAt: new Date()
            }
          },
          { upsert: true, new: true, runValidators: true }
        );

      case 'payment_method':
        if (settingUpdates.operation === 'create') {
          return await PaymentMethod.create({
            ...settingUpdates.methodData,
            hotelId: propertyId,
            createdBy: userId
          });
        } else if (settingUpdates.operation === 'update') {
          return await PaymentMethod.findOneAndUpdate(
            { hotelId: propertyId, methodCode: settingUpdates.methodCode },
            { $set: { ...settingUpdates.methodData, updatedBy: userId } },
            { new: true, runValidators: true }
          );
        }
        break;

      case 'email_campaign':
        if (settingUpdates.operation === 'create') {
          return await EmailCampaign.create({
            ...settingUpdates.campaignData,
            hotelId: propertyId,
            createdBy: userId
          });
        } else if (settingUpdates.operation === 'update') {
          return await EmailCampaign.findOneAndUpdate(
            { hotelId: propertyId, campaignName: settingUpdates.campaignName },
            { $set: { ...settingUpdates.campaignData, updatedBy: userId } },
            { new: true, runValidators: true }
          );
        }
        break;

      case 'allotment_global_settings':
        return await HotelAllotmentSettings.findOneAndUpdate(
          { hotelId: propertyId },
          {
            $set: {
              ...settingUpdates,
              updatedBy: userId,
              updatedAt: new Date()
            }
          },
          { upsert: true, new: true, runValidators: true }
        );

      case 'room_taxes':
        if (settingUpdates.operation === 'create') {
          return await RoomTax.create({
            ...settingUpdates.taxData,
            hotelId: propertyId,
            createdBy: userId
          });
        } else if (settingUpdates.operation === 'update') {
          return await RoomTax.findOneAndUpdate(
            { hotelId: propertyId, taxName: settingUpdates.taxName },
            { $set: { ...settingUpdates.taxData, updatedBy: userId } },
            { new: true, runValidators: true }
          );
        }
        break;

      case 'web_settings':
        return await WebSettings.findOneAndUpdate(
          { hotelId: propertyId },
          {
            $set: {
              ...settingUpdates,
              updatedBy: userId,
              updatedAt: new Date()
            }
          },
          { upsert: true, new: true, runValidators: true }
        );

      case 'pos_taxes':
        if (settingUpdates.operation === 'create') {
          return await POSTax.create({
            ...settingUpdates.taxData,
            hotelId: propertyId,
            createdBy: userId
          });
        } else if (settingUpdates.operation === 'update') {
          return await POSTax.findOneAndUpdate(
            { hotelId: propertyId, taxId: settingUpdates.taxId },
            { $set: { ...settingUpdates.taxData, updatedBy: userId } },
            { new: true, runValidators: true }
          );
        }
        break;

      case 'display_preferences':
        return await Hotel.findByIdAndUpdate(
          propertyId,
          {
            $set: {
              'settings.display': settingUpdates,
              updatedAt: new Date()
            }
          },
          { new: true, runValidators: true }
        );

      case 'hotel_settings':
        return await HotelSettings.findOneAndUpdate(
          { hotelId: propertyId },
          {
            $set: {
              ...settingUpdates,
              updatedBy: userId,
              updatedAt: new Date()
            }
          },
          { upsert: true, new: true, runValidators: true }
        );

      case 'integration_settings':
        return await Hotel.findByIdAndUpdate(
          propertyId,
          {
            $set: {
              'settings.integrations': settingUpdates,
              updatedAt: new Date()
            }
          },
          { new: true, runValidators: true }
        );

      case 'system_settings':
        return await Hotel.findByIdAndUpdate(
          propertyId,
          {
            $set: {
              'settings.system': settingUpdates,
              updatedAt: new Date()
            }
          },
          { new: true, runValidators: true }
        );

      default:
        throw new ApplicationError(`Unknown setting type: ${settingType}`, 400);
    }
  }

  // Private helper methods

  /**
   * Build update object based on setting type
   * @private
   */
  static _buildUpdateObject(settingType, settingUpdates) {
    const updates = {};

    switch (settingType) {
      case 'checkInOut':
        if (settingUpdates.checkInTime) {
          updates['policies.checkInTime'] = settingUpdates.checkInTime;
        }
        if (settingUpdates.checkOutTime) {
          updates['policies.checkOutTime'] = settingUpdates.checkOutTime;
        }
        break;

      case 'currency':
        if (settingUpdates.currency) {
          updates['settings.currency'] = settingUpdates.currency;
        }
        break;

      case 'timezone':
        if (settingUpdates.timezone) {
          updates['settings.timezone'] = settingUpdates.timezone;
        }
        break;

      case 'cancellationPolicy':
        if (settingUpdates.cancellationPolicy) {
          updates['policies.cancellationPolicy'] = settingUpdates.cancellationPolicy;
        }
        break;

      default:
        // Generic update
        Object.keys(settingUpdates).forEach(key => {
          updates[`settings.${key}`] = settingUpdates[key];
        });
    }

    return updates;
  }

  /**
   * Validate time format (HH:MM)
   * @private
   */
  static _isValidTime(time) {
    return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
  }

  /**
   * Validate currency code (ISO 4217)
   * @private
   */
  static _isValidCurrency(currency) {
    const validCurrencies = ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'SGD', 'AED'];
    return validCurrencies.includes(currency);
  }

  /**
   * Validate timezone
   * @private
   */
  static _isValidTimezone(timezone) {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch (e) {
      return false;
    }
  }
}

export default SettingsInheritanceService;
