import User from '../models/User.js';
import UserPreference from '../models/UserPreference.js';

/**
 * Syncs profile data between User and UserPreference models.
 * Called after profile updates from any source.
 */
class ProfileSyncService {
  /**
   * Sync User preferences to UserPreference model
   */
  static async syncUserToPreferences(userId) {
    try {
      const user = await User.findById(userId).lean();
      if (!user || user.role !== 'guest') return;

      const update = {};
      if (user.preferences) {
        if (user.preferences.bedType) update['guest.stayPreferences.bedType'] = user.preferences.bedType;
        if (user.preferences.floor) update['guest.stayPreferences.floor'] = user.preferences.floor;
        if (user.preferences.smokingAllowed !== undefined) update['guest.stayPreferences.smoking'] = user.preferences.smokingAllowed;
      }

      if (Object.keys(update).length > 0) {
        await UserPreference.findOneAndUpdate(
          { userId },
          { $set: update },
          { upsert: true }
        );
      }
    } catch (err) {
      console.warn('ProfileSync: User->Preferences sync failed:', err.message);
    }
  }

  /**
   * Sync UserPreference stay preferences back to User model
   */
  static async syncPreferencesToUser(userId) {
    try {
      const prefs = await UserPreference.findOne({ userId }).lean();
      if (!prefs?.guest?.stayPreferences) return;

      const update = {};
      const sp = prefs.guest.stayPreferences;
      if (sp.bedType) update['preferences.bedType'] = sp.bedType;
      if (sp.floor) update['preferences.floor'] = sp.floor;
      if (sp.smoking !== undefined) update['preferences.smokingAllowed'] = sp.smoking;

      if (Object.keys(update).length > 0) {
        await User.findByIdAndUpdate(userId, { $set: update });
      }
    } catch (err) {
      console.warn('ProfileSync: Preferences->User sync failed:', err.message);
    }
  }
}

export default ProfileSyncService;
