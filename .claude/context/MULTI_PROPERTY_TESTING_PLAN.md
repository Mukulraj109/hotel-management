# Multi-Property System - Comprehensive Testing Plan

**Generated**: January 17, 2025
**Purpose**: Validate all multi-property features before production deployment
**Estimated Time**: 1-2 hours

---

## 🎯 TESTING OBJECTIVES

1. **Property Switching**: Verify seamless property switching across all pages
2. **Portfolio View**: Test aggregated "All Properties" dashboard
3. **Data Isolation**: Ensure users only see their own property data
4. **Access Restrictions**: Verify property access middleware works
5. **Settings Inheritance**: Test bulk settings application
6. **Performance**: Ensure acceptable load times

---

## 📋 PRE-TEST CHECKLIST

### Backend Status
- [ ] Backend server running on port 4000
- [ ] MongoDB connected successfully
- [ ] Migration completed (admin user has 2 properties)
- [ ] All route files have `ensurePropertyAccess` middleware

### Frontend Status
- [ ] Frontend server running on port 5173 (or configured port)
- [ ] PropertyContext provider wrapped around app
- [ ] PropertySelector visible in header
- [ ] No console errors on page load

### Test User Setup
- [ ] Admin user: `admin@hotel.com` (has 2 properties)
  - Property 1: THE PENTOUZ Hotel1
  - Property 2: THE PENTOUZ Mumbai Branch
- [ ] Staff user: `staff@hotel.com` (has 1 property)
- [ ] Test data exists in both properties

### Browser Setup
- [ ] Use Chrome/Edge with DevTools open
- [ ] Network tab open to monitor API calls
- [ ] Console tab open to catch errors
- [ ] Application tab to check localStorage

---

## 🧪 TEST SUITE 1: PROPERTY SWITCHING

### Test 1.1: Initial Property Selection
**Steps**:
1. Login as admin@hotel.com
2. Observe header - PropertySelector should appear
3. Check localStorage: `selectedPropertyId` should be set
4. Verify default property is selected (THE PENTOUZ Hotel1)

**Expected Results**:
- ✅ PropertySelector dropdown visible in header
- ✅ First property auto-selected on login
- ✅ Property name displayed in selector
- ✅ localStorage contains `selectedPropertyId`

**Validation**:
```javascript
// Check in browser console:
localStorage.getItem('selectedPropertyId') // Should return property ID
localStorage.getItem('propertyViewMode')   // Should return 'single'
```

---

### Test 1.2: Switch Between Properties
**Steps**:
1. Click PropertySelector dropdown in header
2. Verify both properties are listed:
   - THE PENTOUZ Hotel1
   - THE PENTOUZ Mumbai Branch
3. Click on Property 2 (Mumbai Branch)
4. Observe page refresh/data reload

**Expected Results**:
- ✅ Dropdown shows all 2 properties
- ✅ Clicking property switches context
- ✅ Page data refreshes automatically
- ✅ PropertyBreadcrumb updates to show new property
- ✅ localStorage updates with new `selectedPropertyId`

**Validation**:
```javascript
// Check in browser console after switching:
localStorage.getItem('selectedPropertyId') // Should be new property ID
```

---

### Test 1.3: Property Switching Across Multiple Pages
**Steps**:
1. Start on AdminDashboard with Property 1 selected
2. Navigate to AdminBookings page
3. Switch to Property 2 using dropdown
4. Navigate to AdminRooms page
5. Switch back to Property 1
6. Navigate to AdminHousekeeping page

**Expected Results**:
- ✅ Property selection persists across navigation
- ✅ Each page shows data for selected property
- ✅ Switching property refreshes current page data
- ✅ No errors in console during switches
- ✅ API calls include correct `hotelId` parameter

**Validation** (check Network tab):
```
GET /api/v1/bookings?hotelId=<selected-property-id>
GET /api/v1/rooms?hotelId=<selected-property-id>
GET /api/v1/housekeeping/tasks?hotelId=<selected-property-id>
```

---

### Test 1.4: Property Persistence After Refresh
**Steps**:
1. Select Property 2 (Mumbai Branch)
2. Navigate to AdminRooms page
3. Hard refresh browser (Ctrl+F5)
4. Observe selected property after reload

**Expected Results**:
- ✅ Property 2 still selected after refresh
- ✅ Rooms page shows Property 2 data
- ✅ PropertySelector displays Property 2 name
- ✅ No flash of wrong property during load

---

## 🧪 TEST SUITE 2: PORTFOLIO "ALL PROPERTIES" VIEW

### Test 2.1: Switch to Portfolio View
**Steps**:
1. Click PropertySelector dropdown
2. Select "All Properties" option
3. Observe AdminDashboard transformation

**Expected Results**:
- ✅ PropertySelector shows "All Properties"
- ✅ AdminDashboard renders PortfolioDashboard component
- ✅ Aggregated KPIs visible (total revenue, occupancy, etc.)
- ✅ Property comparison table shows both properties
- ✅ localStorage: `propertyViewMode` = 'all'

---

### Test 2.2: Portfolio Metrics Accuracy
**Steps**:
1. In "All Properties" view, note aggregated metrics:
   - Total Revenue
   - Average Occupancy
   - Total Bookings
   - Total Rooms
2. Switch to Property 1, note individual metrics
3. Switch to Property 2, note individual metrics
4. Verify: Portfolio total = Property 1 + Property 2

**Expected Results**:
- ✅ Portfolio metrics are sum/average of individual properties
- ✅ Property breakdown table shows each property's data
- ✅ Charts display multi-property trends
- ✅ No data leakage between properties

**Validation**:
```
Portfolio Total Revenue = Property 1 Revenue + Property 2 Revenue
Portfolio Avg Occupancy = (P1 Occupancy + P2 Occupancy) / 2
```

---

### Test 2.3: Navigate Away from Portfolio View
**Steps**:
1. In "All Properties" view on AdminDashboard
2. Click on AdminBookings in sidebar
3. Observe behavior

**Expected Results**:
- ✅ Automatically switches to single-property mode
- ✅ First property auto-selected
- ✅ AdminBookings shows single property data
- ✅ User can manually switch to another property

---

### Test 2.4: Return to Portfolio View
**Steps**:
1. From single-property view on AdminBookings
2. Click PropertySelector → "All Properties"
3. Navigate back to AdminDashboard

**Expected Results**:
- ✅ Portfolio view restored
- ✅ Aggregated data displayed correctly
- ✅ No errors or data inconsistencies

---

## 🧪 TEST SUITE 3: DATA ISOLATION

### Test 3.1: Verify Bookings Isolation
**Steps**:
1. Login as admin@hotel.com
2. Select Property 1, go to AdminBookings
3. Count number of bookings, note booking IDs
4. Switch to Property 2, stay on AdminBookings
5. Count bookings, note booking IDs

**Expected Results**:
- ✅ Property 1 bookings ≠ Property 2 bookings (different data)
- ✅ No shared bookings between properties
- ✅ Booking IDs are unique to each property
- ✅ No Property 2 data visible when Property 1 selected

**Validation** (check API responses):
```json
// Property 1 response
{ "bookings": [{ "_id": "...", "hotelId": "property-1-id", ... }] }

// Property 2 response
{ "bookings": [{ "_id": "...", "hotelId": "property-2-id", ... }] }
```

---

### Test 3.2: Verify Rooms Isolation
**Steps**:
1. Property 1 selected → AdminRooms
2. Note room numbers and room IDs
3. Switch to Property 2 → AdminRooms
4. Note room numbers and room IDs

**Expected Results**:
- ✅ Completely different room lists
- ✅ No overlap in room numbers
- ✅ Room counts differ between properties
- ✅ Room types are property-specific

---

### Test 3.3: Verify Inventory Isolation
**Steps**:
1. Property 1 selected → AdminInventory
2. Note inventory items
3. Switch to Property 2 → AdminInventory
4. Note inventory items

**Expected Results**:
- ✅ Different inventory items per property
- ✅ Stock levels are independent
- ✅ No shared inventory between properties

---

### Test 3.4: Cross-Property Data Leakage Test
**Steps**:
1. Open DevTools Network tab
2. Select Property 1
3. Navigate to multiple pages (Bookings, Rooms, Staff, Housekeeping)
4. Check all API request URLs

**Expected Results**:
- ✅ ALL API calls include `?hotelId=<property-1-id>`
- ✅ No API calls fetch data without hotelId filter
- ✅ No API responses contain data from other properties

**Validation** (check Network tab):
```
✅ /api/v1/bookings?hotelId=673d6c51fdebff13f8e4a1e0
✅ /api/v1/rooms?hotelId=673d6c51fdebff13f8e4a1e0
❌ /api/v1/bookings (missing hotelId - FAIL)
❌ /api/v1/rooms (missing hotelId - FAIL)
```

---

## 🧪 TEST SUITE 4: ACCESS RESTRICTIONS

### Test 4.1: Property Ownership Validation
**Steps**:
1. Login as admin@hotel.com (owns 2 properties)
2. Open DevTools Console
3. Try to access a property you don't own:
   ```javascript
   fetch('/api/v1/rooms?hotelId=non-owned-property-id', {
     headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
   }).then(r => r.json()).then(console.log)
   ```

**Expected Results**:
- ✅ API returns 403 Forbidden error
- ✅ Error message: "Access denied. You do not have permission..."
- ✅ No data returned from unauthorized property

---

### Test 4.2: Staff User Restrictions
**Steps**:
1. Logout admin user
2. Login as staff@hotel.com (has only 1 property)
3. Observe PropertySelector dropdown

**Expected Results**:
- ✅ PropertySelector shows only 1 property (no dropdown needed)
- ✅ "All Properties" option not available (only 1 property)
- ✅ Staff can only access their assigned property's data
- ✅ Cannot switch to other properties

---

### Test 4.3: Middleware Protection Test
**Steps**:
1. Login as admin@hotel.com
2. Open DevTools Console
3. Try to bypass middleware by directly calling API:
   ```javascript
   // Attempt to get bookings without hotelId
   fetch('/api/v1/bookings', {
     headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
   }).then(r => r.json()).then(console.log)
   ```

**Expected Results**:
- ✅ API should either:
  - Return 403 (if ensurePropertyAccess enforces hotelId)
  - OR return only user's properties data (filtered by middleware)
- ✅ Never returns data from properties user doesn't own

---

### Test 4.4: Guest User Restrictions
**Steps**:
1. Logout admin
2. Login as guest user (guest1@example.com)
3. Try to access admin pages

**Expected Results**:
- ✅ Guest cannot access /admin/* routes
- ✅ Redirected to guest dashboard
- ✅ No PropertySelector visible (guests don't have properties)

---

## 🧪 TEST SUITE 5: SETTINGS INHERITANCE

### Test 5.1: Single Property Settings Update
**Steps**:
1. Login as admin@hotel.com
2. Go to AdminRoomTaxes page
3. Ensure "Apply to: Single Property" selected
4. Add a new tax (e.g., "Service Tax 5%")
5. Save changes

**Expected Results**:
- ✅ ApplyToSelector shows "Single Property" by default
- ✅ Tax saved successfully
- ✅ Success message shows "Applied to 1 property"
- ✅ Switch to Property 2 → new tax NOT present
- ✅ Switch back to Property 1 → new tax IS present

---

### Test 5.2: Group-Wide Settings Update (If Groups Configured)
**Steps**:
1. On AdminRoomTaxes page
2. Select "Apply to: Property Group" in ApplyToSelector
3. Add a new tax (e.g., "Group Tax 10%")
4. Click Save

**Expected Results**:
- ✅ Confirmation dialog appears
- ✅ Dialog shows affected property count
- ✅ Clicking "Confirm" applies to all properties in group
- ✅ Success message shows "Applied to X properties"
- ✅ Switch to other property in group → tax is present

**Note**: If no groups configured, this option should be disabled.

---

### Test 5.3: Portfolio-Wide Settings Update
**Steps**:
1. On AdminHotelAreas page
2. Select "Apply to: All Properties" in ApplyToSelector
3. Add a new hotel area (e.g., "Rooftop Garden")
4. Click Save
5. Observe confirmation dialog

**Expected Results**:
- ✅ Confirmation dialog appears
- ✅ Dialog shows: "This will affect 2 properties"
- ✅ Warning: "This action will update all properties in your portfolio"
- ✅ Clicking "Confirm" applies to both properties
- ✅ Success message: "Applied to 2 properties"
- ✅ Switch properties → new area visible in both

---

### Test 5.4: Bulk Update Cancellation
**Steps**:
1. On AdminReasons page
2. Select "Apply to: All Properties"
3. Add a new reason code
4. Click Save
5. In confirmation dialog, click "Cancel"

**Expected Results**:
- ✅ Confirmation dialog closes
- ✅ Changes are NOT saved
- ✅ Form remains open with entered data
- ✅ User can modify and try again

---

### Test 5.5: ApplyToSelector on All Settings Pages
**Pages to Test** (20 total):
1. HotelSettings
2. IntegrationSettings
3. SystemSettings
4. AdminRoomTaxes
5. AdminWebSettings
6. AdminPOSTaxes
7. DisplaySettings
8. RoomTypeManagement
9. BookingRulesSettings
10. MessageTemplateEditor
11. GlobalSettingsForm (Allotments)
12. AdminSeasonalPricing
13. OTAChannelManager
14. AdminPaymentMethods
15. EmailCampaignManager
16. TemplateEditor (Notifications)
17. AdminHousekeeping
18. AdminCustomFields
19. AdminDepartments
20. AdminHotelAreas

**For Each Page**:
- [ ] ApplyToSelector component visible
- [ ] Three options available (if multi-property): Single, Group, All
- [ ] Confirmation dialog triggers for Group/All
- [ ] Success message shows affected count
- [ ] Settings actually applied to selected properties

---

## 🧪 TEST SUITE 6: PERFORMANCE & STABILITY

### Test 6.1: Property Switch Performance
**Steps**:
1. Open DevTools Performance tab
2. Start recording
3. Switch from Property 1 to Property 2
4. Stop recording when data loads

**Expected Results**:
- ✅ Property switch completes < 1 second
- ✅ No unnecessary re-renders
- ✅ API calls execute in parallel
- ✅ No memory leaks detected

---

### Test 6.2: Portfolio View Performance
**Steps**:
1. Switch to "All Properties" view
2. Monitor DevTools Performance tab
3. Observe API calls and render time

**Expected Results**:
- ✅ Portfolio metrics load < 2 seconds
- ✅ Multiple API calls execute in parallel
- ✅ Charts render smoothly
- ✅ No frozen UI or lag

---

### Test 6.3: Rapid Property Switching
**Steps**:
1. Rapidly switch between Property 1 and Property 2 (10 times)
2. Monitor console for errors
3. Check Network tab for failed requests

**Expected Results**:
- ✅ No errors in console
- ✅ No failed API requests
- ✅ Data always matches selected property
- ✅ No race conditions or stale data

---

### Test 6.4: Page Load with Multiple Properties
**Steps**:
1. Clear browser cache and localStorage
2. Login as admin@hotel.com
3. Measure time to first interactive

**Expected Results**:
- ✅ Login successful
- ✅ Properties load from /auth/me
- ✅ First property auto-selected
- ✅ Dashboard displays within 3 seconds

---

## 🧪 TEST SUITE 7: ERROR HANDLING

### Test 7.1: No Property Selected State
**Steps**:
1. Manually clear `selectedPropertyId` from localStorage:
   ```javascript
   localStorage.removeItem('selectedPropertyId')
   ```
2. Refresh page
3. Navigate to AdminBookings

**Expected Results**:
- ✅ "No Property Selected" message appears
- ✅ Prompt to select a property
- ✅ PropertySelector highlighted/pulsing
- ✅ No data fetching attempts

---

### Test 7.2: API Failure Handling
**Steps**:
1. Open DevTools Network tab
2. Enable "Offline" mode
3. Try to switch properties
4. Disable offline mode

**Expected Results**:
- ✅ Error message displayed to user
- ✅ "Failed to fetch data" notification
- ✅ Retry button available
- ✅ Recovery when network restored

---

### Test 7.3: Invalid Property ID
**Steps**:
1. Manually set invalid property ID:
   ```javascript
   localStorage.setItem('selectedPropertyId', 'invalid-id-12345')
   ```
2. Refresh page

**Expected Results**:
- ✅ Error detected
- ✅ Fallback to first valid property
- ✅ OR show "Invalid property" message
- ✅ User can select valid property

---

## 📊 TEST EXECUTION CHECKLIST

### Pre-Test
- [ ] Backend server running
- [ ] Frontend server running
- [ ] Test users created
- [ ] Test data populated

### Execution
- [ ] Test Suite 1: Property Switching (4 tests)
- [ ] Test Suite 2: Portfolio View (4 tests)
- [ ] Test Suite 3: Data Isolation (4 tests)
- [ ] Test Suite 4: Access Restrictions (4 tests)
- [ ] Test Suite 5: Settings Inheritance (5 tests)
- [ ] Test Suite 6: Performance (4 tests)
- [ ] Test Suite 7: Error Handling (3 tests)

### Post-Test
- [ ] Document any failures
- [ ] Create bug tickets for issues
- [ ] Verify fixes work
- [ ] Sign-off ready for staging

---

## 🐛 BUG REPORTING TEMPLATE

If you find issues, document them using this template:

```markdown
## Bug Report

**Test**: [Test Suite X.Y - Test Name]
**Severity**: [Critical / High / Medium / Low]
**Environment**: [Browser, OS]

**Steps to Reproduce**:
1. Step 1
2. Step 2
3. Step 3

**Expected Behavior**:
[What should happen]

**Actual Behavior**:
[What actually happened]

**Screenshots**:
[Attach screenshots if applicable]

**Console Errors**:
```
[Paste any console errors]
```

**Network Errors**:
```
[Paste any failed API calls]
```

**Additional Context**:
[Any other relevant information]
```

---

## ✅ SUCCESS CRITERIA

The multi-property system passes testing if:
- ✅ **All 28 tests pass** (100% success rate)
- ✅ **No critical bugs** found
- ✅ **Performance acceptable** (< 2s load times)
- ✅ **Data isolation verified** (no leakage)
- ✅ **Access control working** (403 for unauthorized)
- ✅ **Settings inheritance functional** (bulk updates work)
- ✅ **Error handling graceful** (no crashes)

---

## 🎯 NEXT STEPS AFTER TESTING

1. **If All Tests Pass**:
   - Mark testing phase complete ✅
   - Prepare for staging deployment
   - Schedule user acceptance testing
   - Plan production rollout

2. **If Issues Found**:
   - Document bugs using template above
   - Prioritize fixes (Critical → High → Medium → Low)
   - Re-test after fixes
   - Repeat until all tests pass

---

**Testing Plan Created**: January 17, 2025
**Total Tests**: 28 tests across 7 suites
**Estimated Duration**: 1-2 hours
**Status**: Ready to Execute
