# TIER 4 Multi-Property - QUICK REFERENCE

**Status:** ✅ 8/8 COMPLETED
**Last Updated:** 2025-10-22

---

## ALL 8 FILES UPDATED

### Integration Pages (5)

| # | File | Breadcrumb | Status |
|---|------|------------|--------|
| 1 | AdminAPIManagement.tsx | Integration → API Management | ✅ |
| 2 | AdminAdvancedFeatures.tsx | Integration → Advanced Features | ✅ |
| 3 | AdminAutomation.tsx | Integration → Automation | ✅ |
| 4 | AdminNotifications.tsx | Integration → Notifications | ✅ |
| 5 | AdminMobileApps.tsx | Integration → Mobile Apps | ✅ |

### Analytics Pages (3)

| # | File | Breadcrumb | Status |
|---|------|------------|--------|
| 6 | AdminLoginActivity.tsx | Analytics → Login Activity | ✅ |
| 7 | AdminUserAnalytics.tsx | Analytics → User Analytics | ✅ |
| 8 | AdminFinancialAnalytics.tsx | Analytics → Financial Analytics | ✅ |

---

## KEY FEATURES ADDED TO ALL PAGES

### ✅ Standard Pattern Applied
```typescript
// 1. Imports
import { useProperty } from '../../context/PropertyContext';
import { PropertyBreadcrumb } from '../../components/common/PropertyBreadcrumb';

// 2. Hook
const { selectedPropertyId, selectedProperty, viewMode } = useProperty();

// 3. Early Return
if (!selectedPropertyId && viewMode === 'single') {
  return <SelectPropertyPrompt />;
}

// 4. Breadcrumb
<PropertyBreadcrumb items={['Category', 'Page']} />

// 5. API Calls
propertyId: selectedPropertyId || undefined
```

---

## PAGES WITH API UPDATES

### AdminNotifications.tsx
- Query keys include `selectedPropertyId`
- Notification queries filtered by `propertyId`
- Unread count respects property context

### AdminLoginActivity.tsx
- All 4 endpoints include `propertyId` param
- Sessions filtered by property-assigned users

### AdminUserAnalytics.tsx
- All 4 analytics endpoints include `propertyId` param
- Data aggregated per property

---

## FILES WITH SPECIAL HANDLING

| File | Special Note |
|------|--------------|
| AdminAPIManagement | API keys may be global or property-specific |
| AdminAdvancedFeatures | Discounts, pricing, segments are property-scoped |
| AdminNotifications | Real-time WebSocket + property filtering |
| AdminLoginActivity | Login logs filter by property access |

---

## TESTING QUICK CHECKLIST

For each page:
- [ ] Property selector works
- [ ] Breadcrumb shows
- [ ] "Select property" prompt displays (single mode)
- [ ] Data loads for selected property
- [ ] Property name in header
- [ ] Switching properties updates data

---

## BACKEND ENDPOINTS NEEDING propertyId SUPPORT

⚠️ **Verify these endpoints accept propertyId parameter:**

### Login Activity (4 endpoints)
- `/api/v1/login-activity/analytics`
- `/api/v1/login-activity/sessions/active`
- `/api/v1/login-activity/sessions/suspicious`
- `/api/v1/login-activity/alerts`

### User Analytics (4 endpoints)
- `/api/v1/user-analytics/engagement`
- `/api/v1/user-analytics/behavior`
- `/api/v1/user-analytics/performance`
- `/api/v1/user-analytics/lifecycle`

---

## COMPLETION

**TIER 4: 8/8 (100%)**

All integration & advanced admin pages now support multi-property.
