# Phase 4: Settings Pages & Group Inheritance - Implementation Guide

## Overview

Phase 4 adds multi-property settings management with three scopes:
1. **Single Property** - Apply settings to current property only
2. **Property Group** - Apply settings to all properties in a group
3. **All Properties** - Apply settings to all properties owned by user

## Components Created

### Backend

#### 1. Settings Inheritance Service
**File**: `backend/src/services/settingsInheritance.js`

**Purpose**: Core service for managing settings inheritance and bulk updates

**Key Methods**:
- `applyGroupSettings(propertyId, groupId)` - Apply PropertyGroup settings to a property
- `applySettingsToGroup(groupId, settings)` - Apply to all properties in a group
- `applySettingsToAllUserProperties(userId, settingUpdates, settingType)` - Apply to all user properties
- `canOverride(property, settingKey)` - Check if property can override group settings
- `validateSettings(settings, settingType)` - Validate settings before applying
- `getInheritanceStatus(propertyId)` - Get inheritance status for a property

**Settings Validated**:
- Check-in/out times (HH:MM format)
- Currency codes (ISO 4217)
- Timezones (IANA format)

#### 2. Settings Routes
**File**: `backend/src/routes/settings.js`

**Purpose**: API endpoints for settings management with group support

**Endpoints Created**:

```bash
# Update check-in/check-out times
PUT /api/v1/settings/check-in-out
Body: {
  "checkInTime": "14:00",
  "checkOutTime": "11:00",
  "applyToAll": false,
  "applyToGroup": false,
  "propertyId": "xxx"
}

# Update currency
PUT /api/v1/settings/currency
Body: { "currency": "USD", "applyToAll": false, "applyToGroup": false, "propertyId": "xxx" }

# Update timezone
PUT /api/v1/settings/timezone
Body: { "timezone": "America/New_York", "applyToAll": false, "applyToGroup": false, "propertyId": "xxx" }

# Update cancellation policy
PUT /api/v1/settings/cancellation-policy
Body: { "cancellationPolicy": {...}, "applyToAll": false, "applyToGroup": false, "propertyId": "xxx" }

# Generic settings update
PUT /api/v1/settings/general
Body: {
  "settingType": "roomTypes",
  "settingUpdates": {...},
  "applyToAll": false,
  "applyToGroup": false,
  "propertyId": "xxx"
}

# Get inheritance status
GET /api/v1/settings/inheritance-status/:propertyId

# Apply group settings to property
POST /api/v1/settings/apply-group-settings
Body: { "propertyId": "xxx", "groupId": "xxx" }

# Toggle inheritance
PUT /api/v1/settings/toggle-inheritance/:propertyId
Body: { "inheritSettings": true }

# Get property group settings
GET /api/v1/settings/group/:groupId
```

**Response Format**:
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Settings updated successfully",
    "propertiesUpdated": 3,
    "propertyIds": ["id1", "id2", "id3"],
    "appliedSettings": ["policies.checkInTime", "policies.checkOutTime"]
  }
}
```

### Frontend

#### 1. ApplyToSelector Component
**File**: `frontend/src/components/settings/ApplyToSelector.tsx`

**Purpose**: Radio button selector for choosing settings scope

**Features**:
- Three radio options with icons and descriptions
- Conditional display of "Property Group" option
- Information messages about affected properties
- Warning messages for bulk updates
- Responsive design with proper styling

**Props**:
```typescript
interface ApplyToSelectorProps {
  value: ApplyToScope; // 'single' | 'group' | 'all'
  onChange: (scope: ApplyToScope) => void;
  isInGroup?: boolean;
  groupName?: string;
  totalProperties?: number;
  showWarning?: boolean;
  warningMessage?: string;
  disabled?: boolean;
  className?: string;
}
```

**Usage Example**:
```tsx
<ApplyToSelector
  value={applyToScope}
  onChange={setApplyToScope}
  isInGroup={inheritanceStatus?.hasGroup || false}
  groupName={inheritanceStatus?.groupName}
  totalProperties={5}
  showWarning={true}
/>
```

#### 2. ApplyToConfirmation Dialog
**File**: `frontend/src/components/settings/ApplyToSelector.tsx` (exported component)

**Purpose**: Confirmation dialog for bulk updates

**Features**:
- Shows affected properties count
- Displays warning and information
- Confirm/Cancel buttons
- Modal overlay

**Props**:
```typescript
interface ApplyToConfirmationProps {
  scope: ApplyToScope;
  affectedCount: number;
  settingName: string;
  groupName?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isOpen: boolean;
}
```

#### 3. useSettingsInheritance Hook
**File**: `frontend/src/hooks/useSettingsInheritance.ts`

**Purpose**: Custom React hook for settings inheritance management

**Features**:
- Fetch inheritance status
- Apply settings with different scopes
- Automatic confirmation dialog management
- Loading and error states
- Helper methods for common settings

**API**:
```typescript
const {
  // Queries
  useInheritanceStatus,

  // Mutations
  applySettings,
  applyGroupSettings,
  toggleInheritance,

  // Confirmation dialog
  showConfirmation,
  pendingUpdate,
  confirmBulkUpdate,
  cancelBulkUpdate,

  // Helper methods
  updateCheckInOut,
  updateCurrency,
  updateTimezone,
  updateCancellationPolicy,

  // States
  isUpdating,
  updateError,
} = useSettingsInheritance();
```

**Usage Example**:
```tsx
// Basic usage
const { updateCheckInOut, isUpdating } = useSettingsInheritance();

const handleSubmit = async () => {
  await updateCheckInOut('14:00', '11:00', 'single');
};

// Advanced usage with custom settings
const { applySettings } = useSettingsInheritance();

const handleSubmit = async () => {
  await applySettings({
    scope: 'all',
    settingUpdates: { someKey: 'someValue' },
    settingType: 'customSetting',
  });
};
```

#### 4. Example Settings Page
**File**: `frontend/src/components/settings/CheckInOutSettings.example.tsx`

**Purpose**: Reference implementation showing the complete pattern

**Pattern Demonstrated**:
1. Load current property settings
2. Form for editing settings
3. ApplyToSelector integration
4. Confirmation dialog handling
5. Success/error messages
6. Inheritance status display

## Implementation Pattern for Settings Pages

### Step-by-Step Guide

Follow this pattern to update any settings page to support multi-property management:

#### Step 1: Import Required Components
```tsx
import { ApplyToSelector, ApplyToConfirmation, ApplyToScope } from '@/components/settings/ApplyToSelector';
import { useSettingsInheritance, useAffectedPropertiesCount } from '@/hooks/useSettingsInheritance';
import { useProperty } from '@/context/PropertyContext';
```

#### Step 2: Set Up State and Hooks
```tsx
export function YourSettingsPage() {
  const { selectedProperty, selectedPropertyId } = useProperty();

  const {
    useInheritanceStatus,
    applySettings,
    isUpdating,
    updateError,
    showConfirmation,
    confirmBulkUpdate,
    cancelBulkUpdate,
  } = useSettingsInheritance();

  const { data: inheritanceStatus } = useInheritanceStatus(selectedPropertyId);

  const [formData, setFormData] = useState({});
  const [applyToScope, setApplyToScope] = useState<ApplyToScope>('single');
  const [hasChanges, setHasChanges] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Load current settings
  useEffect(() => {
    if (selectedProperty) {
      setFormData(selectedProperty.settings);
      setHasChanges(false);
    }
  }, [selectedProperty]);
}
```

#### Step 3: Handle Form Submission
```tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  try {
    const result = await applySettings({
      scope: applyToScope,
      propertyId: selectedPropertyId,
      settingUpdates: formData,
      settingType: 'yourSettingType',
    });

    if (result) {
      setShowSuccess(true);
      setHasChanges(false);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  } catch (error) {
    console.error('Failed to update settings:', error);
  }
};
```

#### Step 4: Handle Confirmation
```tsx
const handleConfirm = async () => {
  try {
    await confirmBulkUpdate();
    setShowSuccess(true);
    setHasChanges(false);
  } catch (error) {
    console.error('Failed to update settings:', error);
  }
};
```

#### Step 5: Add ApplyToSelector to Form
```tsx
<form onSubmit={handleSubmit}>
  {/* Your form fields */}

  <ApplyToSelector
    value={applyToScope}
    onChange={setApplyToScope}
    isInGroup={inheritanceStatus?.hasGroup || false}
    groupName={inheritanceStatus?.groupName}
    totalProperties={5} // Get from API
    showWarning={true}
    warningMessage="Custom warning for this setting type"
  />

  <Button type="submit" disabled={!hasChanges || isUpdating}>
    {isUpdating ? 'Saving...' : 'Save Changes'}
  </Button>
</form>
```

#### Step 6: Add Confirmation Dialog
```tsx
<ApplyToConfirmation
  isOpen={showConfirmation}
  scope={applyToScope}
  affectedCount={affectedCount}
  settingName="your setting name"
  groupName={inheritanceStatus?.groupName}
  onConfirm={handleConfirm}
  onCancel={cancelBulkUpdate}
/>
```

## Settings Pages to Update (30 Pages)

Based on the roadmap, here are the settings pages that need to be updated:

### Property Settings (10 pages)
1. ✅ Check-in/Check-out Times (example created)
2. [ ] Currency Settings
3. [ ] Timezone Settings
4. [ ] Language Settings
5. [ ] Cancellation Policies
6. [ ] No-Show Policies
7. [ ] Payment Methods
8. [ ] Tax Configuration
9. [ ] Room Type Settings
10. [ ] Amenities Settings

### Operational Settings (10 pages)
11. [ ] Housekeeping Schedule
12. [ ] Maintenance Rules
13. [ ] Staff Roles & Permissions
14. [ ] Notification Templates
15. [ ] Email Templates
16. [ ] Booking Rules
17. [ ] Rate Management
18. [ ] Seasonal Pricing
19. [ ] Add-on Services
20. [ ] Inventory Thresholds

### Integration Settings (5 pages)
21. [ ] OTA Connections
22. [ ] Channel Manager
23. [ ] Payment Gateway
24. [ ] POS Integration
25. [ ] Email Service

### Advanced Settings (5 pages)
26. [ ] Security Settings
27. [ ] API Keys
28. [ ] Webhook Configuration
29. [ ] Data Privacy
30. [ ] Audit Settings

## Testing Checklist

For each updated settings page:

### Functional Tests
- [ ] Settings load correctly for current property
- [ ] Single property update works
- [ ] Property group update works (if applicable)
- [ ] All properties update works
- [ ] Validation errors display correctly
- [ ] Success messages display correctly
- [ ] Confirmation dialog shows for bulk updates
- [ ] Cancel button works in confirmation dialog
- [ ] Confirm button applies changes correctly

### Edge Cases
- [ ] Property not in a group (group option hidden)
- [ ] Property in a group but inheritance disabled
- [ ] Property with override restrictions
- [ ] User with only one property (ApplyToSelector hidden)
- [ ] Network errors handled gracefully
- [ ] Concurrent updates handled correctly

### UI/UX Tests
- [ ] Form fields are responsive
- [ ] Loading states are clear
- [ ] Error messages are helpful
- [ ] Success feedback is visible
- [ ] Warning messages are appropriate
- [ ] Mobile layout works correctly

## Backend Integration

### Hotel Model Updates Required
Ensure the Hotel model has these fields:
```javascript
{
  propertyGroupId: ObjectId,
  groupSettings: {
    inheritSettings: Boolean,
    lastSyncAt: Date,
    version: Date
  },
  policies: {
    checkInTime: String,
    checkOutTime: String,
    cancellationPolicy: Mixed
  },
  settings: {
    currency: String,
    timezone: String,
    defaultLanguage: String,
    // ... other settings
  }
}
```

### PropertyGroup Model Updates Required
```javascript
{
  settings: {
    baseCurrency: String,
    timezone: String,
    defaultLanguage: String,
    defaultCancellationPolicy: Mixed,
    checkInTime: String,
    checkOutTime: String,
    rateManagement: {
      centralizedRates: Boolean,
      allowPropertyOverrides: Boolean
    },
    restrictedSettings: [String]
  }
}
```

## API Request/Response Examples

### Single Property Update
```bash
PUT /api/v1/settings/check-in-out
{
  "checkInTime": "14:00",
  "checkOutTime": "11:00",
  "applyToAll": false,
  "applyToGroup": false,
  "propertyId": "674123..."
}

# Response:
{
  "success": true,
  "data": {
    "success": true,
    "message": "Check-in/out times updated successfully",
    "propertiesUpdated": 1,
    "property": { ... }
  }
}
```

### Property Group Update
```bash
PUT /api/v1/settings/check-in-out
{
  "checkInTime": "14:00",
  "checkOutTime": "11:00",
  "applyToAll": false,
  "applyToGroup": true,
  "propertyId": "674123..."
}

# Response:
{
  "success": true,
  "data": {
    "success": true,
    "message": "Settings applied to 5 properties",
    "propertiesUpdated": 5,
    "properties": [ ... ],
    "appliedSettings": ["policies.checkInTime", "policies.checkOutTime"]
  }
}
```

### All Properties Update
```bash
PUT /api/v1/settings/check-in-out
{
  "checkInTime": "14:00",
  "checkOutTime": "11:00",
  "applyToAll": true,
  "applyToGroup": false
}

# Response:
{
  "success": true,
  "data": {
    "success": true,
    "message": "Settings applied to 12 properties",
    "propertiesUpdated": 12,
    "propertyIds": ["id1", "id2", ...],
    "appliedSettings": ["policies.checkInTime", "policies.checkOutTime"]
  }
}
```

## Performance Considerations

1. **Batch Updates**: The backend uses `Hotel.updateMany()` for efficient bulk updates
2. **Validation**: Settings are validated before applying to prevent invalid data
3. **Transactions**: Consider using MongoDB transactions for critical settings
4. **Caching**: React Query caches inheritance status to reduce API calls
5. **Optimistic Updates**: Consider implementing optimistic updates for better UX

## Security Considerations

1. **Ownership Verification**: Backend verifies user owns all affected properties
2. **Override Restrictions**: Group settings can restrict what properties can override
3. **Audit Trail**: Consider logging all bulk settings updates
4. **Permission Checks**: Verify user has permission to update settings
5. **Rate Limiting**: Apply rate limits to prevent abuse of bulk update endpoints

## Next Steps

1. Complete the implementation of the remaining 29 settings pages following this pattern
2. Add comprehensive tests for settings inheritance
3. Create migration script if Hotel/PropertyGroup schemas need updates
4. Add analytics to track usage of bulk updates
5. Consider adding a "Settings History" feature to track changes

## Summary

Phase 4 infrastructure is complete with:
- ✅ Settings Inheritance Service (backend)
- ✅ Settings API endpoints (backend)
- ✅ ApplyToSelector component (frontend)
- ✅ useSettingsInheritance hook (frontend)
- ✅ Example settings page implementation
- ✅ Comprehensive documentation

The pattern is established and ready for implementation across all 30 settings pages.
