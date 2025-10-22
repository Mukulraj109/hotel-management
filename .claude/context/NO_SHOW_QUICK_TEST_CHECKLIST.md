# No-Show Functionality - Quick Test Checklist

**Quick Reference for Testing the No-Show Feature**

---

## Pre-Testing Setup

### 1. Ensure Backend is Running
```bash
cd backend
npm run dev
# Should be running on http://localhost:5000
```

### 2. Ensure Frontend is Running
```bash
cd frontend
npm run dev
# Should be running on http://localhost:5173
```

### 3. Login as Admin or Staff
- Admin email: admin@example.com
- Staff email: staff@example.com
- Password: (your test password)

### 4. Have Test Bookings Ready
- At least 1 booking with status: **confirmed**
- At least 1 booking with status: **pending**
- At least 1 booking with status: **checked_out** (for error testing)

---

## Quick Test Scenarios

### ✅ Test 1: Basic No-Show (No Charge)

**Steps:**
1. Navigate to Admin Bookings page
2. Find a **confirmed** booking
3. Click the **AlertTriangle icon** (orange color)
4. Modal opens with booking details
5. Enter reason: "Guest did not arrive"
6. Leave charge amount as 0
7. Click "Continue to Review"
8. Verify summary shows:
   - Booking number
   - Guest name
   - Reason
   - Charge: ₹0.00 "No Charge"
9. Click "Confirm No-Show"

**Expected:**
- ✅ Success toast appears
- ✅ Modal closes
- ✅ Booking list refreshes
- ✅ Booking status changes to "No-Show"
- ✅ Stats counter updates

**Time:** ~30 seconds

---

### ✅ Test 2: No-Show with 50% Charge

**Steps:**
1. Find a **confirmed** booking with totalAmount = ₹5,000
2. Click **AlertTriangle icon**
3. Enter reason: "Guest did not respond to confirmation calls"
4. Click the **50%** quick charge button
5. Verify display shows:
   - Charge amount: ₹2,500
   - Badge shows: "50%"
6. Click "Continue to Review"
7. Verify summary shows:
   - Charge: ₹2,500.00
   - Badge: "50% of total"
8. Click "Confirm No-Show"

**Expected:**
- ✅ Success toast: "Booking marked as no-show successfully with a charge of ₹2500"
- ✅ Booking marked as no-show
- ✅ Payment history updated with charge entry

**Time:** ~45 seconds

---

### ✅ Test 3: Validation - Missing Reason

**Steps:**
1. Open NoShowModal for any booking
2. **Leave reason field empty**
3. Enter charge amount: 1000
4. Click "Continue to Review"

**Expected:**
- ✅ Red border appears on reason field
- ✅ Error message: "Reason is required"
- ✅ Form does NOT proceed to Step 2
- ✅ No API call made

**Time:** ~15 seconds

---

### ✅ Test 4: Validation - Reason Too Long

**Steps:**
1. Open NoShowModal
2. Paste a very long text (600+ characters) into reason field
3. Observe character counter
4. Try to submit

**Expected:**
- ✅ Character counter turns red at 450+ chars
- ✅ Error appears at 500+ chars
- ✅ Error: "Reason must be less than 500 characters"
- ✅ Form does not submit

**Time:** ~20 seconds

---

### ✅ Test 5: Validation - Charge Exceeds Total

**Steps:**
1. Open NoShowModal for booking with total = ₹5,000
2. Enter reason: "Test"
3. Enter charge: 10,000 (more than total)
4. Try to submit

**Expected:**
- ✅ Error: "Charge amount cannot exceed booking total"
- ✅ Form does not submit
- ✅ If bypassed (shouldn't happen), backend returns 400 error

**Time:** ~20 seconds

---

### ✅ Test 6: Error - Wrong Status

**Steps:**
1. Find a booking with status: **checked_out**, **cancelled**, or **no_show**
2. Try to mark it as no-show

**Expected:**
- ✅ Backend returns 400 error
- ✅ Error message: "Cannot mark booking as no-show. Current status: {status}. Only confirmed or pending bookings can be marked as no-show."
- ✅ Error toast appears
- ✅ No database changes

**Time:** ~30 seconds

---

### ✅ Test 7: Auto-Save Draft

**Steps:**
1. Open NoShowModal
2. Enter reason: "Test draft save"
3. Enter charge: 1000
4. Close modal (click X or Cancel)
5. Re-open the same booking's modal

**Expected:**
- ✅ Previous data restored from localStorage
- ✅ Reason field shows: "Test draft save"
- ✅ Charge field shows: 1000

**Cleanup:**
- Submit or close modal to clear draft

**Time:** ~30 seconds

---

### ✅ Test 8: 2-Step Confirmation Flow

**Steps:**
1. Open NoShowModal
2. Fill reason and charge
3. Click "Continue to Review"
4. Verify Step 2 screen shows:
   - Orange gradient header
   - "Step 2 of 2: Review & Confirm"
   - Summary card with all details
   - Warning alert
5. Click "Go Back"
6. Verify returns to Step 1 with data preserved
7. Click "Continue to Review" again
8. Click "Confirm No-Show"

**Expected:**
- ✅ Smooth transition between steps
- ✅ Data preserved when going back
- ✅ Final confirmation triggers API call

**Time:** ~45 seconds

---

### ✅ Test 9: Quick Charge Buttons

**Steps:**
1. Open NoShowModal for booking with total = ₹10,000
2. Click each quick charge button:
   - 0% → Charge: ₹0
   - 25% → Charge: ₹2,500
   - 50% → Charge: ₹5,000
   - 75% → Charge: ₹7,500
   - 100% → Charge: ₹10,000

**Expected:**
- ✅ Each button updates charge amount correctly
- ✅ Percentage badge updates
- ✅ Active button has green background
- ✅ Amounts are rounded to 2 decimals

**Time:** ~30 seconds

---

### ✅ Test 10: Recent Reasons Quick Select

**Steps:**
1. Open NoShowModal
2. Click each quick-select reason chip:
   - "Guest did not arrive"
   - "No communication from guest"
   - "Unable to contact guest"
   - "Booking not honored"

**Expected:**
- ✅ Each click populates reason field
- ✅ Selected chip has blue background
- ✅ Can select different reasons
- ✅ Can edit selected reason

**Time:** ~20 seconds

---

## Network & API Verification

### Check API Call (Browser DevTools)

1. Open Browser DevTools (F12)
2. Go to **Network** tab
3. Mark a booking as no-show
4. Find the API call: `POST /api/v1/bookings/{id}/no-show`

**Verify:**
- ✅ Request Headers include: `Authorization: Bearer {token}`
- ✅ Request Headers include: `Content-Type: application/json`
- ✅ Request Body contains: `{ reason, chargeAmount }`
- ✅ Response status: 200
- ✅ Response body has: `{ status: 'success', data: { booking, message, noShowDetails } }`

---

## Backend Verification (Optional)

### Check Console Logs

In your backend terminal, look for:

```
⚠️ NO-SHOW MARKED: {
  bookingNumber: 'BK12345',
  guestName: 'John Doe',
  reason: 'Guest did not arrive',
  chargeAmount: 2500,
  markedBy: 'Admin User',
  timestamp: '2025-10-18T10:30:00.000Z'
}
```

### Check Database (MongoDB)

```javascript
// In MongoDB Compass or shell
db.bookings.findOne({ bookingNumber: 'BK12345' })

// Verify fields:
{
  status: 'no_show',
  noShowRecorded: ISODate("2025-10-18T10:30:00.000Z"),
  noShowReason: "Guest did not arrive",
  noShowMarkedBy: {
    userId: ObjectId("..."),
    userName: "Admin User",
    userRole: "admin"
  },
  noShowChargeAmount: 2500,
  noShowChargeApplied: true,
  paymentDetails: {
    paymentMethods: [
      {
        method: "cash",
        amount: 2500,
        reference: "NO-SHOW-BK12345-1729246200000",
        notes: "No-show cancellation charge: Guest did not arrive",
        processedBy: ObjectId("..."),
        processedAt: ISODate("2025-10-18T10:30:00.000Z")
      }
    ]
  }
}
```

---

## Permission Testing

### ✅ Test as Admin
- ✅ Can see "Mark as No-Show" button
- ✅ Can mark bookings as no-show
- ✅ API call succeeds (200)

### ✅ Test as Staff
- ✅ Can see "Mark as No-Show" button
- ✅ Can mark bookings as no-show
- ✅ API call succeeds (200)

### ✅ Test as Guest (Should Fail)
- Guest users shouldn't have access to admin pages
- If direct API call attempted: 403 Forbidden

---

## Multi-Property Testing (If Applicable)

### ✅ Test Property Isolation

**Steps:**
1. Login as multi-property admin
2. Select Property A from dropdown
3. View bookings for Property A
4. Mark one as no-show
5. Switch to Property B
6. Try to view/modify the same booking

**Expected:**
- ✅ Can only see bookings for selected property
- ✅ API automatically includes correct property ID
- ✅ Cannot access bookings from other properties

---

## Regression Testing

### ✅ Verify Other Features Still Work

After testing no-show functionality:

1. **Create New Booking** - Should work normally
2. **Edit Booking** - Should work normally
3. **Check-In** - Should work normally
4. **Check-Out** - Should work normally
5. **Cancel Booking** - Should work normally
6. **View Reports** - Should include no-show stats

---

## Performance Checks

### ✅ Response Time

- NoShowModal should open: < 100ms
- API call should complete: < 500ms
- Booking list refresh: < 1000ms

### ✅ UI Responsiveness

- No lag when typing reason
- No lag when adjusting charge amount
- Smooth transitions between steps
- No UI freezing during API call

---

## Bug Checklist

### ❌ Known Issues to Watch For

- [ ] Modal doesn't close after success
- [ ] Booking list doesn't refresh
- [ ] Stats don't update
- [ ] Error toast doesn't appear
- [ ] Draft doesn't clear after submit
- [ ] Charge percentage incorrect
- [ ] Wrong error messages

**Note:** As of this testing, all known issues have been fixed.

---

## Quick Automation Test (Optional)

### Using the Test File

```bash
cd test

# Edit no-show-endpoint-test.js
# Update AUTH_TOKEN and booking IDs

# Run tests
node no-show-endpoint-test.js
```

**What it tests:**
- ✅ Success cases (with/without charge)
- ✅ Missing reason error
- ✅ Reason too long error
- ✅ Negative charge error
- ✅ Charge exceeds total error
- ✅ Wrong status error

---

## Sign-Off Checklist

Once all tests pass, mark as complete:

- [ ] Basic no-show works (no charge)
- [ ] No-show with charge works
- [ ] Validation prevents missing reason
- [ ] Validation prevents reason too long
- [ ] Validation prevents charge exceeds total
- [ ] Error handling for wrong status
- [ ] Auto-save draft works
- [ ] 2-step confirmation works
- [ ] Quick charge buttons work
- [ ] Recent reasons work
- [ ] API integration correct (uses api service)
- [ ] Permissions enforced (admin/staff only)
- [ ] Multi-property isolation (if applicable)
- [ ] No regression in other features
- [ ] Performance acceptable

**Signed Off By:** _________________
**Date:** _________________
**Status:** APPROVED FOR PRODUCTION ✅

---

**Estimated Total Testing Time:** 15-20 minutes for basic tests
**Estimated Total Testing Time (Full):** 30-40 minutes including all scenarios
