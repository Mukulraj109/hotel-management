# 🔔 Comprehensive Notification & Settings Implementation Plan

## 📊 Project Overview

**Objective**: Implement a unified notification system and comprehensive settings management across Admin, Staff, and Guest dashboards for THE PENTOUZ Hotel Management System.

**Duration**: 3-4 weeks
**Priority**: High
**Impact**: System-wide enhancement affecting all user roles

## 🎯 Current State Analysis

### Existing Infrastructure
✅ **Backend**:
- Notification model and schema exists
- NotificationPreference model for user preferences
- Basic notification routes (`/api/v1/notifications`)
- WebSocket infrastructure (currently disabled but available)
- Email notification service exists

✅ **Frontend**:
- NotificationCenter component (unused)
- InventoryNotifications component (active)
- Placeholder icons in all headers (non-functional)

❌ **Missing**:
- Real-time notification delivery
- Settings pages for all roles
- Cross-role notification integration
- Notification sound/browser notifications
- Settings persistence and management

## 📋 Implementation Phases

---

## 🚀 PHASE 1: Core Notification System (Week 1)

### 1.1 Backend Infrastructure Enhancement

#### API Endpoints to Create/Enhance:
```javascript
// Notification Management
GET    /api/v1/notifications                 // Get paginated notifications (EXISTS - enhance)
POST   /api/v1/notifications/mark-read       // Mark as read (bulk support)
POST   /api/v1/notifications/mark-all-read   // Mark all as read
DELETE /api/v1/notifications/:id             // Delete single notification
DELETE /api/v1/notifications/bulk            // Delete multiple notifications
GET    /api/v1/notifications/summary         // Get notification summary by category

// Real-time Updates
GET    /api/v1/notifications/stream          // Server-sent events for real-time
POST   /api/v1/notifications/subscribe       // Subscribe to notification types

// Preferences
GET    /api/v1/notifications/preferences     // Get user preferences (EXISTS - enhance)
PUT    /api/v1/notifications/preferences     // Update preferences
POST   /api/v1/notifications/test            // Send test notification
```

#### Notification Categories by Role:

**Admin Notifications**:
```javascript
const adminNotificationTypes = {
  // Bookings & Revenue
  'new_booking': { priority: 'high', channels: ['in_app', 'email'] },
  'booking_cancelled': { priority: 'high', channels: ['in_app', 'email'] },
  'large_booking': { priority: 'urgent', channels: ['in_app', 'email', 'sms'] },
  'payment_received': { priority: 'medium', channels: ['in_app'] },
  'payment_failed': { priority: 'high', channels: ['in_app', 'email'] },

  // Operations
  'low_occupancy_alert': { priority: 'high', channels: ['in_app', 'email'] },
  'overbooking_risk': { priority: 'urgent', channels: ['in_app', 'email', 'sms'] },
  'maintenance_required': { priority: 'high', channels: ['in_app'] },
  'inventory_low': { priority: 'medium', channels: ['in_app'] },

  // Staff & Security
  'staff_emergency': { priority: 'urgent', channels: ['in_app', 'sms'] },
  'security_alert': { priority: 'urgent', channels: ['in_app', 'email', 'sms'] },
  'system_error': { priority: 'high', channels: ['in_app', 'email'] },

  // Analytics
  'daily_report_ready': { priority: 'low', channels: ['in_app', 'email'] },
  'revenue_milestone': { priority: 'medium', channels: ['in_app'] }
};
```

**Staff Notifications**:
```javascript
const staffNotificationTypes = {
  // Work Assignments
  'room_assigned': { priority: 'high', channels: ['in_app', 'push'] },
  'task_assigned': { priority: 'high', channels: ['in_app', 'push'] },
  'shift_reminder': { priority: 'medium', channels: ['in_app', 'push'] },

  // Guest Services
  'guest_request': { priority: 'high', channels: ['in_app', 'push'] },
  'vip_guest_arrival': { priority: 'urgent', channels: ['in_app', 'push'] },
  'complaint_received': { priority: 'high', channels: ['in_app'] },

  // Operations
  'inventory_request_approved': { priority: 'medium', channels: ['in_app'] },
  'schedule_change': { priority: 'high', channels: ['in_app', 'email'] },
  'emergency_alert': { priority: 'urgent', channels: ['in_app', 'push', 'sms'] }
};
```

**Guest Notifications**:
```javascript
const guestNotificationTypes = {
  // Booking
  'booking_confirmed': { priority: 'high', channels: ['in_app', 'email'] },
  'check_in_reminder': { priority: 'medium', channels: ['in_app', 'email', 'sms'] },
  'check_out_reminder': { priority: 'medium', channels: ['in_app', 'push'] },
  'room_ready': { priority: 'high', channels: ['in_app', 'push', 'sms'] },

  // Services
  'service_confirmed': { priority: 'medium', channels: ['in_app', 'email'] },
  'service_ready': { priority: 'high', channels: ['in_app', 'push'] },
  'dining_reservation': { priority: 'medium', channels: ['in_app', 'email'] },

  // Loyalty & Offers
  'loyalty_points_earned': { priority: 'low', channels: ['in_app'] },
  'special_offer': { priority: 'low', channels: ['in_app', 'email'] },
  'upgrade_available': { priority: 'medium', channels: ['in_app', 'push'] }
};
```

### 1.2 Frontend Components Implementation

#### New Components to Create:

```typescript
// 1. Universal Notification Dropdown (for all headers)
frontend/src/components/notifications/NotificationDropdown.tsx
- Real-time badge with unread count
- Categorized notification list
- Quick actions (mark read, delete)
- Load more pagination
- Sound toggle

// 2. Notification Toast System
frontend/src/components/notifications/NotificationToast.tsx
- Auto-dismiss urgent notifications
- Action buttons
- Progress bar for auto-dismiss
- Stack multiple toasts

// 3. Notification Preferences Modal
frontend/src/components/notifications/NotificationPreferences.tsx
- Channel selection (in-app, email, SMS, push)
- Category toggles
- Quiet hours setting
- Sound preferences

// 4. Browser Notification Handler
frontend/src/hooks/useBrowserNotifications.ts
- Request permission
- Show browser notifications
- Handle click actions
- Fallback for unsupported browsers
```

### 1.3 Real-time Implementation

#### Server-Sent Events (SSE) Setup:
```javascript
// Backend: SSE endpoint
app.get('/api/v1/notifications/stream', authenticate, (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no' // Disable Nginx buffering
  });

  // Send heartbeat every 30 seconds
  const heartbeat = setInterval(() => {
    res.write(':heartbeat\n\n');
  }, 30000);

  // Listen for notifications for this user
  notificationEmitter.on(`user:${req.user._id}`, (notification) => {
    res.write(`data: ${JSON.stringify(notification)}\n\n`);
  });

  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    notificationEmitter.removeAllListeners(`user:${req.user._id}`);
  });
});

// Frontend: SSE connection
const useNotificationStream = () => {
  useEffect(() => {
    const eventSource = new EventSource('/api/v1/notifications/stream', {
      withCredentials: true
    });

    eventSource.onmessage = (event) => {
      const notification = JSON.parse(event.data);
      handleNewNotification(notification);
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      // Implement exponential backoff reconnection
    };

    return () => eventSource.close();
  }, []);
};
```

---

## ⚙️ PHASE 2: Settings System Implementation (Week 2)

### 2.1 Settings Categories by Role

#### Admin Settings Structure:
```typescript
interface AdminSettings {
  profile: {
    name: string;
    email: string;
    phone: string;
    avatar: string;
    timezone: string;
    language: string;
  };

  hotel: {
    name: string;
    address: string;
    contact: {
      phone: string;
      email: string;
      website: string;
    };
    policies: {
      checkInTime: string;
      checkOutTime: string;
      cancellationPolicy: string;
      childPolicy: string;
      petPolicy: string;
    };
    taxes: {
      gst: number;
      serviceCharge: number;
      localTax: number;
    };
  };

  notifications: {
    channels: {
      inApp: boolean;
      email: boolean;
      sms: boolean;
      push: boolean;
    };
    categories: Record<string, boolean>;
    quietHours: {
      enabled: boolean;
      start: string;
      end: string;
    };
    sound: boolean;
    desktop: boolean;
  };

  display: {
    theme: 'light' | 'dark' | 'auto';
    sidebarCollapsed: boolean;
    language: string;
    dateFormat: string;
    timeFormat: '12h' | '24h';
    currency: string;
    numberFormat: string;
  };

  system: {
    twoFactorAuth: boolean;
    sessionTimeout: number;
    apiKeys: Array<{
      name: string;
      key: string;
      permissions: string[];
      createdAt: Date;
    }>;
    backupSchedule: string;
    dataRetention: number;
  };

  integrations: {
    payment: {
      stripe: { enabled: boolean; publicKey: string; };
      razorpay: { enabled: boolean; keyId: string; };
    };
    ota: {
      booking: { enabled: boolean; apiKey: string; };
      expedia: { enabled: boolean; apiKey: string; };
    };
    analytics: {
      googleAnalytics: { enabled: boolean; trackingId: string; };
      mixpanel: { enabled: boolean; token: string; };
    };
  };
}
```

#### Staff Settings Structure:
```typescript
interface StaffSettings {
  profile: {
    name: string;
    email: string;
    phone: string;
    avatar: string;
    department: string;
    employeeId: string;
  };

  notifications: {
    workAssignments: boolean;
    guestRequests: boolean;
    scheduleChanges: boolean;
    emergencyAlerts: boolean;
    sound: boolean;
    vibration: boolean;
  };

  display: {
    theme: 'light' | 'dark';
    compactView: boolean;
    language: string;
    quickActions: string[]; // Customizable quick action buttons
  };

  availability: {
    status: 'available' | 'busy' | 'break' | 'offline';
    autoStatusChange: boolean;
    breakReminder: boolean;
  };
}
```

#### Guest Settings Structure:
```typescript
interface GuestSettings {
  profile: {
    name: string;
    email: string;
    phone: string;
    avatar: string;
    dateOfBirth: Date;
    nationality: string;
    preferences: {
      roomType: string;
      floor: string;
      bedType: string;
      smoking: boolean;
      dietaryRestrictions: string[];
    };
  };

  notifications: {
    bookingUpdates: boolean;
    serviceAlerts: boolean;
    promotions: boolean;
    loyaltyUpdates: boolean;
    reviewRequests: boolean;
  };

  communication: {
    language: string;
    preferredChannel: 'email' | 'sms' | 'whatsapp' | 'in_app';
    marketingConsent: boolean;
  };

  privacy: {
    dataSharing: boolean;
    locationTracking: boolean;
    analyticsTracking: boolean;
  };
}
```

### 2.2 Settings Pages Implementation

#### New Pages to Create:
```typescript
// Admin Settings
frontend/src/pages/admin/AdminSettings.tsx
frontend/src/pages/admin/settings/ProfileSettings.tsx
frontend/src/pages/admin/settings/HotelSettings.tsx
frontend/src/pages/admin/settings/NotificationSettings.tsx
frontend/src/pages/admin/settings/DisplaySettings.tsx
frontend/src/pages/admin/settings/SystemSettings.tsx
frontend/src/pages/admin/settings/IntegrationSettings.tsx

// Staff Settings
frontend/src/pages/staff/StaffSettings.tsx
frontend/src/pages/staff/settings/ProfileSettings.tsx
frontend/src/pages/staff/settings/NotificationSettings.tsx
frontend/src/pages/staff/settings/AvailabilitySettings.tsx

// Guest Settings
frontend/src/pages/guest/GuestSettings.tsx
frontend/src/pages/guest/settings/ProfileSettings.tsx
frontend/src/pages/guest/settings/PreferencesSettings.tsx
frontend/src/pages/guest/settings/PrivacySettings.tsx
```

### 2.3 Backend Settings API

#### New Endpoints:
```javascript
// Settings Management
GET    /api/v1/settings                    // Get all settings
GET    /api/v1/settings/:category          // Get specific category
PUT    /api/v1/settings/:category          // Update category settings
POST   /api/v1/settings/reset/:category    // Reset to defaults
GET    /api/v1/settings/export             // Export all settings
POST   /api/v1/settings/import             // Import settings

// Hotel-specific (Admin only)
GET    /api/v1/hotel/settings              // Get hotel settings
PUT    /api/v1/hotel/settings              // Update hotel settings
GET    /api/v1/hotel/policies              // Get hotel policies
PUT    /api/v1/hotel/policies              // Update policies
```

#### Settings Model:
```javascript
// backend/src/models/UserSettings.js
const userSettingsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  role: {
    type: String,
    enum: ['admin', 'staff', 'guest', 'travel_agent'],
    required: true
  },
  settings: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  lastModified: Date,
  version: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

// Add versioning for settings migration
userSettingsSchema.methods.migrate = function() {
  // Handle settings structure changes between versions
};
```

---

## 🔗 PHASE 3: Integration & Enhancement (Week 3)

### 3.1 Header Integration

#### Update All Headers:
```typescript
// AdminHeader.tsx enhancement
<div className="flex items-center space-x-4">
  <NotificationDropdown
    role="admin"
    position="bottom-right"
    showCategories={true}
    playSound={settings.notifications.sound}
  />

  <SettingsDropdown>
    <SettingsDropdown.Item
      icon={User}
      label="Profile"
      onClick={() => navigate('/admin/settings/profile')}
    />
    <SettingsDropdown.Item
      icon={Bell}
      label="Notifications"
      onClick={() => navigate('/admin/settings/notifications')}
    />
    <SettingsDropdown.Item
      icon={Settings}
      label="Settings"
      onClick={() => navigate('/admin/settings')}
    />
  </SettingsDropdown>

  <UserMenu />
</div>
```

### 3.2 Dashboard Integration

#### Admin Dashboard Enhancements:
```typescript
// Add notification widgets
<NotificationSummaryWidget>
  <NotificationSummaryWidget.Item
    type="bookings"
    count={unreadBookingNotifications}
    icon={Calendar}
    color="blue"
  />
  <NotificationSummaryWidget.Item
    type="alerts"
    count={unreadAlerts}
    icon={AlertTriangle}
    color="red"
  />
  <NotificationSummaryWidget.Item
    type="system"
    count={unreadSystemNotifications}
    icon={Info}
    color="gray"
  />
</NotificationSummaryWidget>

// Add quick settings panel
<QuickSettingsPanel>
  <QuickSettingsPanel.Toggle
    label="Email Notifications"
    checked={settings.notifications.email}
    onChange={updateSetting}
  />
  <QuickSettingsPanel.Toggle
    label="Dark Mode"
    checked={settings.display.theme === 'dark'}
    onChange={updateSetting}
  />
</QuickSettingsPanel>
```

### 3.3 Cross-Role Communication

#### Notification Flow:
```javascript
// Example: Guest makes a service request
1. Guest creates service request
2. System generates notifications:
   - Staff: "New service request from Room 301"
   - Admin: "Service request pending assignment"
3. Staff accepts request
4. System updates notifications:
   - Guest: "Your request has been accepted"
   - Admin: "Service request assigned to John"
5. Staff completes request
6. System sends completion notifications:
   - Guest: "Your service has been completed"
   - Admin: "Service request completed"
```

### 3.4 Analytics & Monitoring

#### Notification Analytics:
```typescript
interface NotificationAnalytics {
  sent: number;
  delivered: number;
  read: number;
  clicked: number;
  failed: number;
  averageReadTime: number;
  mostActiveHours: Array<{ hour: number; count: number }>;
  channelPerformance: {
    inApp: { sent: number; read: number };
    email: { sent: number; opened: number };
    sms: { sent: number; delivered: number };
  };
}
```

---

## 📁 File Structure

### New Files to Create:

```
frontend/
├── src/
│   ├── components/
│   │   ├── notifications/
│   │   │   ├── NotificationDropdown.tsx
│   │   │   ├── NotificationToast.tsx
│   │   │   ├── NotificationPreferences.tsx
│   │   │   ├── NotificationList.tsx
│   │   │   ├── NotificationItem.tsx
│   │   │   └── NotificationBadge.tsx
│   │   └── settings/
│   │       ├── SettingsDropdown.tsx
│   │       ├── SettingsForm.tsx
│   │       ├── SettingsTabs.tsx
│   │       └── QuickSettings.tsx
│   ├── hooks/
│   │   ├── useNotifications.ts
│   │   ├── useNotificationStream.ts
│   │   ├── useBrowserNotifications.ts
│   │   └── useSettings.ts
│   ├── services/
│   │   ├── notificationService.ts
│   │   └── settingsService.ts
│   └── pages/
│       ├── admin/
│       │   ├── AdminSettings.tsx
│       │   └── AdminNotifications.tsx
│       ├── staff/
│       │   ├── StaffSettings.tsx
│       │   └── StaffNotifications.tsx
│       └── guest/
│           ├── GuestSettings.tsx
│           └── GuestNotifications.tsx

backend/
├── src/
│   ├── routes/
│   │   └── settings.js
│   ├── controllers/
│   │   ├── notificationController.js (enhance)
│   │   └── settingsController.js
│   ├── services/
│   │   ├── notificationService.js (enhance)
│   │   ├── settingsService.js
│   │   └── sseService.js
│   └── models/
│       └── UserSettings.js
```

---

## 🚀 Implementation Priority

### Week 1: Core Notifications
1. ✅ Day 1-2: Backend API enhancements
2. ✅ Day 3-4: NotificationDropdown component
3. ✅ Day 5: Real-time SSE implementation
4. ✅ Day 6-7: Integration with all dashboards

### Week 2: Settings System
1. ✅ Day 8-9: Settings backend API
2. ✅ Day 10-11: Admin settings pages
3. ✅ Day 12: Staff settings pages
4. ✅ Day 13-14: Guest settings pages

### Week 3: Polish & Enhancement
1. ✅ Day 15-16: Browser notifications
2. ✅ Day 17: Analytics dashboard
3. ✅ Day 18: Cross-role testing
4. ✅ Day 19-20: Bug fixes and optimization
5. ✅ Day 21: Documentation and deployment

---

## 📊 Success Metrics

### Notification System:
- ✅ 100% notification delivery rate
- ✅ < 2 second real-time notification delay
- ✅ 80%+ notification read rate
- ✅ Zero duplicate notifications

### Settings System:
- ✅ All settings persist correctly
- ✅ Settings sync across sessions
- ✅ < 500ms settings load time
- ✅ Zero data loss on updates

### User Experience:
- ✅ 90%+ user satisfaction
- ✅ 50%+ reduction in missed notifications
- ✅ 30%+ increase in user engagement
- ✅ Zero critical bugs in production

---

## 🔧 Technical Considerations

### Performance:
- Implement notification batching for bulk operations
- Use Redis for caching user preferences
- Implement pagination for notification lists
- Optimize SSE connections with heartbeat

### Security:
- Validate all notification content
- Implement rate limiting on notification APIs
- Encrypt sensitive settings data
- Audit trail for settings changes

### Scalability:
- Design for 10,000+ concurrent users
- Implement notification queue system
- Use CDN for notification assets
- Database indexing on notification queries

### Accessibility:
- ARIA labels for notification elements
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode support

---

## 🎯 Next Steps

1. **Immediate Actions**:
   - Set up notification database indexes
   - Create base notification components
   - Implement SSE infrastructure

2. **Testing Strategy**:
   - Unit tests for all components
   - Integration tests for notification flow
   - E2E tests for critical paths
   - Load testing for real-time features

3. **Documentation**:
   - API documentation
   - Component storybook
   - User guides for settings
   - Administrator manual

This comprehensive plan ensures a robust, scalable, and user-friendly notification and settings system that enhances the overall hotel management experience across all user roles.