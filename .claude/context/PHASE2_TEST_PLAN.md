# Phase 2 Testing Plan: Multi-Property Management

## Overview
This document provides a comprehensive testing plan for Phase 2 implementation of the multi-property management system. All code changes have been completed and this guide will help verify the functionality.

---

## ✅ Completed Implementation

### Backend Security
- **propertyAccess.js middleware** - Created with 6 security functions
- **rooms.js** - All routes secured
- **bookings.js** - 23+ routes secured
- **guests.js** - All routes secured
- **housekeeping.js** - All routes secured

### Frontend Integration
- **PropertyContext** - Global property selection state
- **PropertyProvider** - Integrated into App.tsx
- **PropertyBreadcrumb** - Reusable breadcrumb component
- **Admin Pages Updated**:
  - AdminDashboard.tsx
  - AdminBookings.tsx
  - AdminRooms.tsx
  - AdminUpcomingBookings.tsx

---

## 🧪 Test Scenarios

### Test 1: PropertyProvider Integration
**Objective**: Verify PropertyProvider is properly wrapping the application

**Steps**:
1. Start the frontend development server: `cd frontend && npm run dev`
2. Open browser developer tools (F12)
3. Navigate to any admin page
4. Check Console for errors related to PropertyContext

**Expected Result**:
- No errors like "useProperty must be used within a PropertyProvider"
- Application loads successfully

**Status**: ⏳ Pending

---

### Test 2: Property Breadcrumb Display
**Objective**: Verify breadcrumbs display correctly on admin pages

**Steps**:
1. Login as admin user
2. Navigate to `/admin` (Dashboard)
3. Check for breadcrumb at top of page showing: `[Property Name] > Dashboard`
4. Navigate to `/admin/bookings`
5. Check for breadcrumb showing: `[Property Name] > Bookings`
6. Navigate to `/admin/rooms`
7. Check for breadcrumb showing: `[Property Name] > Rooms`
8. Navigate to `/admin/upcoming-bookings`
9. Check for breadcrumb showing: `[Property Name] > Upcoming Bookings`

**Expected Result**:
- Breadcrumb displays on all pages
- Shows building icon + property name
- Shows correct page name after separator

**Status**: ⏳ Pending

---

### Test 3: Property Filtering (Frontend)
**Objective**: Verify selectedPropertyId is used instead of hardcoded values

**Steps**:
1. Login as admin with multiple properties
2. Open browser DevTools Network tab
3. Navigate to `/admin/bookings`
4. Check API requests for query parameters
5. Verify `hotelId` parameter matches selected property

**Expected Result**:
- API calls include correct `hotelId` parameter
- Data displayed matches selected property
- No hardcoded hotel IDs in requests

**Status**: ⏳ Pending

---

### Test 4: Backend Property Access Security
**Objective**: Verify ensurePropertyAccess middleware blocks unauthorized access

**Prerequisites**:
- User must have access to multiple properties OR
- Create test scenario with different users for different properties

**Test 4.1 - Authorized Access**:
1. Login as admin for Property A
2. Navigate to `/admin/rooms`
3. Verify rooms from Property A are displayed

**Expected Result**:
- ✅ Rooms displayed successfully
- ✅ Data belongs to Property A

**Test 4.2 - Unauthorized Access (Manual API Test)**:
1. Get auth token for admin of Property A
2. Use Postman/curl to make request to:
   ```
   GET http://localhost:4000/api/v1/rooms?hotelId=PROPERTY_B_ID
   Authorization: Bearer <PROPERTY_A_TOKEN>
   ```

**Expected Result**:
- ❌ 403 Forbidden error
- ❌ Error message: "Access denied to this property"

**Status**: ⏳ Pending

---

### Test 5: Property Switching (If Implemented)
**Objective**: Verify users can switch between properties

**Steps**:
1. Login as admin with access to multiple properties
2. Verify current property shown in UI (header/breadcrumb)
3. Click property switcher (if UI component exists)
4. Select different property
5. Verify page data updates to show new property's data

**Expected Result**:
- Property name updates in breadcrumb
- Dashboard shows metrics for selected property
- Rooms/Bookings filtered by selected property

**Status**: ⏳ Pending
**Note**: Property switcher UI may need to be added in future phase

---

### Test 6: Data Isolation Between Properties
**Objective**: Verify strict data isolation between properties

**Steps**:
1. Create booking for Property A
2. Switch to Property B (or login as Property B admin)
3. Navigate to `/admin/bookings`
4. Verify Property A's booking is NOT visible
5. Create room for Property B
6. Switch to Property A
7. Verify Property B's room is NOT visible

**Expected Result**:
- No data leakage between properties
- Each property sees only their own data
- API responses filtered correctly

**Status**: ⏳ Pending

---

### Test 7: Endpoint Security Coverage
**Objective**: Verify all critical endpoints have property access security

**High-Priority Endpoints to Test**:

#### Bookings Endpoints
```bash
# Test with Property A token, request Property B data

GET /api/v1/bookings
GET /api/v1/bookings/:id
POST /api/v1/bookings
PATCH /api/v1/bookings/:id
GET /api/v1/bookings/upcoming
```

**Expected Result**: 403 Forbidden when accessing other property's data

#### Rooms Endpoints
```bash
GET /api/v1/rooms
GET /api/v1/rooms/:id
POST /api/v1/rooms
PATCH /api/v1/rooms/:id
DELETE /api/v1/rooms/:id
```

**Expected Result**: 403 Forbidden when accessing other property's data

#### Guests Endpoints
```bash
GET /api/v1/guests
GET /api/v1/guests/:id
POST /api/v1/guests
```

**Expected Result**: 403 Forbidden when accessing other property's data

#### Housekeeping Endpoints
```bash
GET /api/v1/housekeeping
POST /api/v1/housekeeping
PATCH /api/v1/housekeeping/:id
GET /api/v1/housekeeping/stats
```

**Expected Result**: 403 Forbidden when accessing other property's data

**Status**: ⏳ Pending

---

### Test 8: Performance and Error Handling
**Objective**: Verify system handles property operations efficiently

**Steps**:
1. Navigate to Dashboard with 100+ bookings
2. Measure page load time
3. Switch property (if available)
4. Measure switch time
5. Test with network throttling (Chrome DevTools)

**Expected Result**:
- Page loads in < 2 seconds
- Property switch in < 1 second
- Smooth experience on slow networks
- Proper loading states displayed

**Status**: ⏳ Pending

---

### Test 9: Edge Cases

#### Test 9.1 - No Property Selected
**Steps**:
1. Clear localStorage
2. Refresh application
3. Verify fallback behavior

**Expected Result**:
- Falls back to primary property
- Or shows property selection screen
- No crashes or blank pages

#### Test 9.2 - Invalid Property ID
**Steps**:
1. Manually set invalid property ID in localStorage
2. Refresh application
3. Verify error handling

**Expected Result**:
- Clears invalid selection
- Falls back to valid property
- Shows appropriate error message

#### Test 9.3 - Single Property User
**Steps**:
1. Login as user with only one property
2. Verify UI adjusts appropriately
3. No property switcher shown (if applicable)

**Expected Result**:
- Breadcrumb shows single property
- No unnecessary property selection UI
- System works normally

**Status**: ⏳ Pending

---

## 🐛 Known Issues & Limitations

### Current Limitations
1. **Property Switcher UI**: No UI component for switching properties
   - Users with multiple properties need manual implementation
   - Consider adding property dropdown in header

2. **~60 Remaining Endpoints**: Not yet secured
   - Low priority endpoints still need middleware
   - See PHASE2_BACKEND_ENDPOINTS_TODO.md for full list

3. **Guest Role**: Property access may need adjustment
   - Guests should only see their own bookings regardless of property
   - Current implementation may be too restrictive

### Potential Issues
1. **localStorage Persistence**: Property selection persists across sessions
   - May need reset mechanism if user's property access changes

2. **WebSocket Updates**: Real-time updates may not filter by property
   - Review websocket broadcasts in future phase

---

## 🔍 Debugging Guide

### Common Issues

#### Issue 1: "useProperty must be used within a PropertyProvider"
**Cause**: Component using `useProperty()` is outside PropertyProvider
**Solution**: Verify App.tsx has PropertyProvider wrapping routes

#### Issue 2: Breadcrumb not showing
**Cause**: PropertyBreadcrumb component not imported
**Solution**: Check import statement in page component

#### Issue 3: Wrong property data displayed
**Cause**: selectedPropertyId not being used
**Solution**:
- Check component uses `const { selectedPropertyId } = useProperty()`
- Verify API calls include selectedPropertyId
- Check browser DevTools Network tab

#### Issue 4: 403 Forbidden on legitimate requests
**Cause**: Middleware incorrectly blocking access
**Solution**:
- Verify user has access to property
- Check `user.properties` array includes the property
- Review propertyAccess.js middleware logic

---

## ✅ Test Results Template

Copy this template for documenting test results:

```
## Test Results - [Date]
Tester: [Name]
Environment: [Development/Staging/Production]

### Test 1: PropertyProvider Integration
- Status: ✅ Pass / ❌ Fail
- Notes:

### Test 2: Property Breadcrumb Display
- Status: ✅ Pass / ❌ Fail
- Notes:

### Test 3: Property Filtering (Frontend)
- Status: ✅ Pass / ❌ Fail
- Notes:

### Test 4: Backend Property Access Security
- Status: ✅ Pass / ❌ Fail
- Notes:

### Test 5: Property Switching
- Status: ✅ Pass / ❌ Fail / ⏭️ Skipped
- Notes:

### Test 6: Data Isolation Between Properties
- Status: ✅ Pass / ❌ Fail
- Notes:

### Test 7: Endpoint Security Coverage
- Status: ✅ Pass / ❌ Fail
- Notes:

### Test 8: Performance and Error Handling
- Status: ✅ Pass / ❌ Fail
- Notes:

### Test 9: Edge Cases
- Status: ✅ Pass / ❌ Fail
- Notes:

### Issues Found:
1.
2.
3.

### Overall Status: ✅ Pass / ⚠️ Pass with Issues / ❌ Fail
```

---

## 📋 Pre-Testing Checklist

Before running tests, ensure:

- [ ] Frontend and backend servers are running
- [ ] Database has test data for multiple properties
- [ ] Test user accounts exist with multi-property access
- [ ] Browser DevTools is open (Network + Console tabs)
- [ ] Postman or curl ready for API testing
- [ ] Test environment isolated from production

---

## 🚀 Next Steps After Testing

1. **If All Tests Pass**:
   - Document any found issues
   - Create tickets for remaining 60 endpoints
   - Plan Phase 3: Property Switcher UI

2. **If Tests Fail**:
   - Document failures with screenshots
   - Check error logs (frontend Console + backend logs)
   - Review implementation against this test plan
   - Fix issues and re-test

3. **Additional Enhancements**:
   - Add property selector dropdown in header
   - Implement portfolio/all-properties view
   - Add property comparison dashboard
   - Create property-specific reports

---

## 📞 Support

For issues during testing:
1. Check browser Console for frontend errors
2. Check backend logs: `cd backend && tail -f logs/combined.log`
3. Review `.claude/context/CLAUDE.md` for project overview
4. Review implementation files in this directory

---

**Last Updated**: 2025-10-17
**Phase**: 2 - Multi-Property Foundation
**Status**: Implementation Complete, Testing Pending
