# 🔧 EXTRA PERSON PRICING WORKFLOW - REDESIGN PLAN

**Date**: October 18, 2025
**Status**: 📋 **PLANNING**
**Priority**: 🔴 **HIGH**
**Requested By**: User (Mukul Raj)

---

## 📊 EXECUTIVE SUMMARY

### Current Behavior (Automatic)
When an extra person is added to a booking:
1. ❌ Price is **automatically calculated**
2. ❌ Price is **automatically applied** to the booking
3. ❌ Guest can immediately pay
4. ❌ No admin review/approval step
5. ❌ No ability to edit the calculated price

### Desired Behavior (Manual Approval)
When an extra person is added to a booking:
1. ✅ Price is **calculated and shown** (not applied)
2. ✅ Admin/staff can **view the suggested price**
3. ✅ Admin/staff can **edit/change the price**
4. ✅ Admin/staff must **manually approve/apply** the price
5. ✅ Only after approval, the charge is added to booking
6. ✅ Then guest can pay the approved amount

---

## 🎯 BUSINESS REQUIREMENTS

### User Story
**As an** admin/staff member
**I want to** review and approve extra person charges before they are applied
**So that** I can adjust prices based on special circumstances, discounts, or negotiations

### Acceptance Criteria
1. ✅ Extra person charges are **calculated but not automatically applied**
2. ✅ Admin/staff can see **suggested/calculated price**
3. ✅ Admin/staff can **edit the price** (increase or decrease)
4. ✅ Admin/staff must click **"Apply Charges"** or **"Approve"** button
5. ✅ After approval, charge status changes from `pending` to `applied`
6. ✅ Only **applied charges** appear in the payment section
7. ✅ Guest can only pay **applied charges**

---

## 🔍 CURRENT IMPLEMENTATION ANALYSIS

### Frontend Flow (`BookingEditModal.tsx`)

**Line 166-220: Adding Extra Person**
```typescript
const addExtraPerson = async () => {
  const personData: any = {
    name: newPersonName.trim(),
    type: newPersonType,
    autoCalculateCharges: true  // ← ISSUE: Always true
  };

  const response = await fetch(`/api/v1/bookings/${booking._id}/extra-persons`, {
    method: 'POST',
    body: JSON.stringify(personData)
  });

  if (response.ok) {
    const result = await response.json();
    setExtraPersons(result.data.booking.extraPersons || []);
    setCharges(result.data.booking.extraPersonCharges || []);  // ← Charges already applied!
  }
};
```

**Line 791-836: Display Extra Persons**
- Shows person with calculated charge immediately
- No approval step
- Shows "Paid ✓" or "Due" status directly

**Line 860-876: Payment Button**
- Payment button available immediately
- No "Apply Charges" or "Approve" step

---

### Backend Flow (`bookings.js`)

**Line 1737-1787: POST /extra-persons**
```javascript
router.post('/:id/extra-persons', async (req, res) => {
  const { name, type, age, autoCalculateCharges = true } = req.body;

  // Add extra person
  const extraPerson = await booking.addExtraPerson({ name, type, age }, userContext);

  // Auto-calculate charges if requested
  if (autoCalculateCharges) {  // ← ISSUE: Always runs
    await booking.calculateExtraPersonCharges();  // ← Immediately applied!
  }

  await booking.save();  // ← Charges saved to database

  res.json({ status: 'success', data: { booking } });
});
```

**Problem**:
- `autoCalculateCharges` defaults to `true`
- Charges are calculated AND applied immediately
- No pending/approval state

---

## ✨ NEW PROPOSED WORKFLOW

### Phase 1: Calculate (Show Price)
**Status**: `pending` or `calculated`

1. Admin/staff adds extra person (name, type, age)
2. Backend calculates suggested price based on:
   - Room rate
   - Person type (adult/child)
   - Number of nights
   - Hotel settings
3. Frontend displays:
   ```
   Extra Person: John Doe (Adult)
   Suggested Price: ₹1,200 per night
   Total (2 nights): ₹2,400
   Status: [Pending Approval]
   [Edit Price] [Apply Charges]
   ```

### Phase 2: Edit Price (Optional)
**Status**: Still `pending`

1. Admin/staff clicks [Edit Price]
2. Modal/inline editor appears:
   ```
   Edit Extra Person Charge
   Person: John Doe
   Calculated Price: ₹2,400
   Adjusted Price: [   2,000   ] (editable)
   Reason for adjustment: [Loyalty discount]
   [Cancel] [Save]
   ```
3. Admin can increase or decrease price
4. Price saved but NOT applied yet

### Phase 3: Apply Charges
**Status**: Changes to `applied`

1. Admin/staff clicks [Apply Charges] or [Approve]
2. Confirmation dialog:
   ```
   Apply Extra Person Charges?
   John Doe (Adult): ₹2,000

   This will add the charge to the booking.
   Guest will be able to pay this amount.

   [Cancel] [Apply]
   ```
3. After confirmation:
   - Charge status → `applied`
   - Charge added to booking total
   - Appears in payment section
   - Guest can now pay

### Phase 4: Payment
**Status**: `applied` → `paid`

1. Guest sees charge: "Extra Person: ₹2,000 Due"
2. Payment button enabled
3. After payment: Status → `paid`

---

## 🛠️ TECHNICAL IMPLEMENTATION PLAN

### 1. Backend Changes

#### A. Database Schema Updates

**File**: `backend/src/models/Booking.js`

```javascript
// Update ExtraPersonCharge schema
const extraPersonChargeSchema = new Schema({
  personId: String,
  baseCharge: Number,
  totalCharge: Number,
  currency: String,
  description: String,

  // NEW FIELDS
  status: {
    type: String,
    enum: ['pending', 'approved', 'applied', 'paid'],
    default: 'pending'
  },
  calculatedAmount: Number,  // Original calculated amount
  adjustedAmount: Number,    // Admin-adjusted amount (if different)
  adjustmentReason: String,  // Why the price was changed
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  appliedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  appliedAt: Date
});
```

#### B. New Backend Endpoints

**File**: `backend/src/routes/bookings.js`

```javascript
// 1. Calculate charge without applying (NEW)
router.post('/:id/extra-persons/:personId/calculate',
  authenticate,
  authorize(['admin', 'staff']),
  ensurePropertyAccess,
  async (req, res) => {
    // Calculate suggested price
    // Return price WITHOUT applying to booking
    // Status: 'pending'
  }
);

// 2. Update/Edit charge amount (NEW)
router.put('/:id/extra-persons/:personId/update-charge',
  authenticate,
  authorize(['admin', 'staff']),
  ensurePropertyAccess,
  async (req, res) => {
    const { adjustedAmount, adjustmentReason } = req.body;

    // Update charge with new amount
    // Save adjustment reason
    // Keep status as 'pending'
    // Save who made the adjustment
  }
);

// 3. Approve/Apply charges (NEW)
router.post('/:id/extra-persons/:personId/approve',
  authenticate,
  authorize(['admin', 'staff']),
  ensurePropertyAccess,
  async (req, res) => {
    // Change status from 'pending' to 'applied'
    // Add charge to booking total
    // Record who approved and when
    // Enable payment
  }
);

// 4. Approve ALL pending charges at once (NEW)
router.post('/:id/extra-persons/approve-all',
  authenticate,
  authorize(['admin', 'staff']),
  ensurePropertyAccess,
  async (req, res) => {
    // Find all pending charges
    // Apply all at once
    // Bulk approve for efficiency
  }
);
```

#### C. Modify Existing Endpoint

**File**: `backend/src/routes/bookings.js` (Line 1737)

```javascript
// BEFORE
router.post('/:id/extra-persons', async (req, res) => {
  const { autoCalculateCharges = true } = req.body;  // ← Remove this

  // Auto-calculate charges if requested
  if (autoCalculateCharges) {
    await booking.calculateExtraPersonCharges();  // ← Remove auto-apply
  }
});

// AFTER
router.post('/:id/extra-persons', async (req, res) => {
  // Add extra person
  const extraPerson = await booking.addExtraPerson({ name, type, age }, userContext);

  // Calculate suggested charge WITHOUT applying
  const suggestedCharge = await booking.calculateExtraPersonCharge(extraPerson.personId);

  // Save charge with status 'pending'
  booking.extraPersonCharges.push({
    personId: extraPerson.personId,
    totalCharge: suggestedCharge.amount,
    calculatedAmount: suggestedCharge.amount,
    status: 'pending',  // ← NEW: Not applied yet
    description: suggestedCharge.description,
    currency: 'INR'
  });

  await booking.save();

  res.json({
    status: 'success',
    data: {
      extraPerson,
      suggestedCharge,  // ← Return calculated amount
      booking
    }
  });
});
```

---

### 2. Frontend Changes

#### A. Update BookingEditModal Component

**File**: `frontend/src/components/booking/BookingEditModal.tsx`

**Changes Required**:

1. **Line 166-220: addExtraPerson function**
```typescript
// BEFORE
const addExtraPerson = async () => {
  const personData: any = {
    name: newPersonName.trim(),
    type: newPersonType,
    autoCalculateCharges: true  // ← REMOVE THIS
  };
};

// AFTER
const addExtraPerson = async () => {
  const personData: any = {
    name: newPersonName.trim(),
    type: newPersonType
    // No autoCalculateCharges - backend will return suggested price
  };

  const response = await fetch(...);
  if (response.ok) {
    const result = await response.json();
    // Show success message with SUGGESTED price
    setSuccess(`${personData.type} "${personData.name}" added. Suggested charge: ₹${result.data.suggestedCharge.amount}`);
  }
};
```

2. **Line 791-836: Display Extra Persons - ADD NEW UI**
```typescript
{extraPersons.map((person, index) => {
  const personCharge = charges.find(c => c.personId === person.personId);

  return (
    <div key={person.personId || index}>
      {/* Person details */}
      <div>
        <p>{person.name}</p>
        <p>{person.type}</p>
      </div>

      {/* Charge display - UPDATED */}
      {personCharge && (
        <div>
          {/* Show different UI based on status */}
          {personCharge.status === 'pending' && (
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">Calculated Price:</p>
                  <p className="font-bold text-lg">₹{personCharge.calculatedAmount?.toLocaleString()}</p>
                  {personCharge.adjustedAmount && personCharge.adjustedAmount !== personCharge.calculatedAmount && (
                    <>
                      <p className="text-sm text-gray-500 line-through">₹{personCharge.calculatedAmount?.toLocaleString()}</p>
                      <p className="font-bold text-blue-600">Adjusted: ₹{personCharge.adjustedAmount?.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">{personCharge.adjustmentReason}</p>
                    </>
                  )}
                </div>
                <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-medium">
                  Pending Approval
                </span>
              </div>

              {/* Action buttons */}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => openEditPriceModal(personCharge)}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                >
                  Edit Price
                </button>
                <button
                  onClick={() => approveCharge(personCharge.personId)}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                >
                  Apply Charges
                </button>
              </div>
            </div>
          )}

          {personCharge.status === 'applied' && (
            <div className="bg-blue-50 border border-blue-200 p-3 rounded">
              <p className="font-medium text-blue-900">₹{personCharge.totalCharge.toLocaleString()}</p>
              {personCharge.isPaid ? (
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                  Paid ✓
                </span>
              ) : (
                <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">
                  ₹{personCharge.totalCharge.toLocaleString()} Due
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
})}
```

3. **Add New Functions**
```typescript
// State for edit modal
const [editingCharge, setEditingCharge] = useState<ExtraPersonCharge | null>(null);
const [editedAmount, setEditedAmount] = useState('');
const [editReason, setEditReason] = useState('');

// Open edit price modal
const openEditPriceModal = (charge: ExtraPersonCharge) => {
  setEditingCharge(charge);
  setEditedAmount(charge.adjustedAmount?.toString() || charge.calculatedAmount?.toString() || '');
  setEditReason(charge.adjustmentReason || '');
};

// Save edited price
const saveEditedPrice = async () => {
  if (!editingCharge || !booking) return;

  try {
    const response = await fetch(
      `/api/v1/bookings/${booking._id}/extra-persons/${editingCharge.personId}/update-charge`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          adjustedAmount: parseFloat(editedAmount),
          adjustmentReason: editReason
        })
      }
    );

    if (response.ok) {
      const result = await response.json();
      setCharges(result.data.booking.extraPersonCharges);
      setSuccess('Price updated successfully');
      setEditingCharge(null);
    }
  } catch (error) {
    setError('Failed to update price');
  }
};

// Approve/Apply charge
const approveCharge = async (personId: string) => {
  if (!booking) return;

  if (!window.confirm('Apply this charge to the booking? Guest will be able to pay after this.')) {
    return;
  }

  try {
    const response = await fetch(
      `/api/v1/bookings/${booking._id}/extra-persons/${personId}/approve`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    );

    if (response.ok) {
      const result = await response.json();
      setCharges(result.data.booking.extraPersonCharges);
      setSuccess('Charge applied successfully. Guest can now pay.');
      fetchSettlementData();  // Refresh settlement data
    }
  } catch (error) {
    setError('Failed to apply charge');
  }
};
```

4. **Add Edit Price Modal**
```typescript
{/* Edit Price Modal */}
{editingCharge && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 max-w-md w-full">
      <h3 className="text-lg font-semibold mb-4">Edit Extra Person Charge</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Person
          </label>
          <p className="text-gray-900">
            {extraPersons.find(p => p.personId === editingCharge.personId)?.name}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Calculated Price
          </label>
          <p className="text-gray-500">₹{editingCharge.calculatedAmount?.toLocaleString()}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Adjusted Price *
          </label>
          <input
            type="number"
            value={editedAmount}
            onChange={(e) => setEditedAmount(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            placeholder="Enter adjusted price"
            step="0.01"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reason for Adjustment *
          </label>
          <textarea
            value={editReason}
            onChange={(e) => setEditReason(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            placeholder="e.g., Loyalty discount, Special arrangement"
            rows={3}
          />
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={() => setEditingCharge(null)}
          className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
        >
          Cancel
        </button>
        <button
          onClick={saveEditedPrice}
          disabled={!editedAmount || !editReason.trim()}
          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </div>
  </div>
)}
```

---

## 📋 IMPLEMENTATION CHECKLIST

### Backend Tasks
- [ ] 1. Update Booking model schema to add new fields
  - [ ] `status` field (pending/applied/paid)
  - [ ] `calculatedAmount` field
  - [ ] `adjustedAmount` field
  - [ ] `adjustmentReason` field
  - [ ] `approvedBy` and `approvedAt` fields
  - [ ] `appliedBy` and `appliedAt` fields

- [ ] 2. Modify existing POST /extra-persons endpoint
  - [ ] Remove auto-apply logic
  - [ ] Return suggested charge with `pending` status
  - [ ] Don't add to booking total yet

- [ ] 3. Create new endpoint: PUT /extra-persons/:personId/update-charge
  - [ ] Validate admin/staff permissions
  - [ ] Update adjusted amount and reason
  - [ ] Keep status as `pending`

- [ ] 4. Create new endpoint: POST /extra-persons/:personId/approve
  - [ ] Change status to `applied`
  - [ ] Add to booking total
  - [ ] Record who approved and when

- [ ] 5. Create new endpoint: POST /extra-persons/approve-all
  - [ ] Bulk approve all pending charges

- [ ] 6. Update payment endpoint
  - [ ] Only allow payment of `applied` charges
  - [ ] Block payment of `pending` charges

### Frontend Tasks
- [ ] 7. Update BookingEditModal component
  - [ ] Remove `autoCalculateCharges: true` from API call
  - [ ] Add state for editing charges
  - [ ] Add Edit Price modal UI

- [ ] 8. Update Extra Persons List Display
  - [ ] Show different UI for `pending` vs `applied` charges
  - [ ] Add "Edit Price" button for pending charges
  - [ ] Add "Apply Charges" button for pending charges
  - [ ] Show adjustment reason if price was changed

- [ ] 9. Add Edit Price functionality
  - [ ] Create edit price modal
  - [ ] Call UPDATE endpoint to save changes
  - [ ] Show success/error messages

- [ ] 10. Add Approve Charges functionality
  - [ ] Create approve confirmation dialog
  - [ ] Call APPROVE endpoint
  - [ ] Refresh booking data after approval

- [ ] 11. Update payment section
  - [ ] Only show `applied` charges in payment total
  - [ ] Hide `pending` charges from payment
  - [ ] Show "Pending Approval" message for pending charges

### Testing Tasks
- [ ] 12. Test adding extra person (should show pending)
- [ ] 13. Test editing price (should update amount)
- [ ] 14. Test approving charge (should make payable)
- [ ] 15. Test payment (only applied charges)
- [ ] 16. Test removing extra person (pending charge)
- [ ] 17. Test multiple extra persons workflow
- [ ] 18. Test security (only admin/staff can approve)

---

## 🎯 SUCCESS CRITERIA

### Definition of Done
1. ✅ Extra person charges are NOT automatically applied
2. ✅ Admin/staff see calculated price as "Pending"
3. ✅ Admin/staff can edit the price with a reason
4. ✅ Admin/staff can approve/apply the charge
5. ✅ Only applied charges appear in payment section
6. ✅ Payment only works for applied charges
7. ✅ All actions are logged (who approved, when)
8. ✅ Clear visual distinction between pending and applied charges

---

## 📊 ESTIMATED EFFORT

| Task Category | Estimated Time |
|---------------|----------------|
| Backend Development | 4-6 hours |
| Frontend Development | 6-8 hours |
| Testing | 2-3 hours |
| Documentation | 1 hour |
| **Total** | **13-18 hours** |

---

## 🚀 DEPLOYMENT PLAN

### Phase 1: Backend (Can deploy independently)
1. Deploy schema changes
2. Deploy new endpoints
3. Test with Postman/API testing tool

### Phase 2: Frontend (After backend is ready)
1. Update UI components
2. Test in development environment
3. User acceptance testing (UAT)

### Phase 3: Production
1. Database migration (add new fields)
2. Deploy backend changes
3. Deploy frontend changes
4. Monitor for issues

---

## 💡 ADDITIONAL ENHANCEMENTS (Optional)

### Future Improvements
1. 📊 **Bulk Actions**: Approve all pending charges at once
2. 🔔 **Notifications**: Notify admin when charges are pending approval
3. 📝 **Audit Trail**: Show history of price changes with reasons
4. 🎨 **Templates**: Pre-defined discount templates (e.g., "Loyalty 10%", "Group Discount 15%")
5. 🔒 **Permissions**: Different permissions for editing vs approving
6. 📧 **Guest Notification**: Email guest when charges are applied

---

## 📞 NEXT STEPS

1. ✅ Review this plan with stakeholders
2. ⏳ Get approval to proceed
3. ⏳ Start backend implementation
4. ⏳ Start frontend implementation after backend is ready
5. ⏳ Test thoroughly
6. ⏳ Deploy to production

---

**Created By**: Claude Code
**Date**: October 18, 2025
**Status**: ✅ **READY FOR IMPLEMENTATION**
**Approval Required**: Yes

Would you like me to proceed with the implementation?
