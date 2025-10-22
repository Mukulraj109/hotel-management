# No-Show System - Production-Ready Documentation

## Table of Contents
1. [Overview](#1-overview)
2. [Features](#2-features)
3. [Technical Implementation](#3-technical-implementation)
4. [User Workflows](#4-user-workflows)
5. [No-Show Charge Integration](#5-no-show-charge-integration)
6. [UI/UX Guide](#6-uiux-guide)
7. [Testing Scenarios](#7-testing-scenarios)
8. [Staff Training Guide](#8-staff-training-guide)
9. [Business Rules](#9-business-rules)
10. [Integration Points](#10-integration-points)
11. [Audit Trail](#11-audit-trail)
12. [Troubleshooting](#12-troubleshooting)
13. [Production Checklist](#13-production-checklist)

---

## 1. Overview

### What is the No-Show System?

The No-Show System is a comprehensive booking management feature that allows hotel staff to mark bookings where guests failed to arrive without prior notice. This system helps hotels:

- **Track guest reliability** and no-show patterns
- **Apply penalty charges** to recover lost revenue
- **Maintain accurate occupancy records** for analytics
- **Generate compliance reports** for auditing purposes
- **Improve future booking policies** based on no-show data

### When to Use It

The no-show functionality should be used when:
- A guest has not arrived by the check-in time plus grace period (default: 6 hours)
- The guest has not contacted the hotel to cancel or modify their booking
- The hotel has made reasonable attempts to contact the guest
- The booking status is either "confirmed" or "pending"

### Business Benefits

1. **Revenue Recovery**: Apply penalty charges (0% to 100% of booking value) to offset lost revenue
2. **Operational Efficiency**: Clear inventory quickly for potential walk-in guests
3. **Guest Accountability**: Maintain records of guest reliability for future bookings
4. **Analytics & Forecasting**: Track no-show rates to improve overbooking strategies
5. **Compliance**: Maintain detailed audit trails for legal and financial reporting
6. **Staff Coordination**: Automated notifications keep housekeeping and front desk aligned

---

## 2. Features

### Core Features

#### 2.1 Mark Booking as No-Show
- **Who Can Use**: Admin, Staff, Manager
- **Grace Period**: 6 hours after check-in time
- **Required Information**: Reason (max 500 characters)
- **Optional Information**: Charge amount (0 to booking total)

#### 2.2 Apply No-Show Charges
- **Flexible Charging**: $0 to 100% of booking total
- **Automatic Payment Integration**: Charges recorded in payment system
- **Settlement Tracking**: Integrated with financial settlement processes
- **Currency Support**: Respects booking currency

#### 2.3 Audit Trail
- **Who Marked**: User ID, name, and role recorded
- **When Marked**: Timestamp with timezone
- **Why Marked**: Mandatory reason field
- **Charge Details**: Amount charged (if any)
- **Status History**: Complete transition log

#### 2.4 Integration with Payment System
- **Charge Recording**: Automatically creates payment record
- **Settlement Integration**: Included in daily settlement reports
- **Refund Handling**: Tracks if charges are later refunded
- **Multi-Currency**: Handles international bookings

#### 2.5 Staff Permissions
| Role | Mark No-Show | View Stats | Reverse No-Show |
|------|--------------|------------|-----------------|
| Admin | ✅ Yes | ✅ Yes | ✅ Yes |
| Manager | ✅ Yes | ✅ Yes | ✅ Yes |
| Staff | ✅ Yes | ❌ No | ❌ No |
| Guest | ❌ No | ❌ No | ❌ No |

#### 2.6 No-Show Statistics
- Total no-shows count
- Total charges collected
- Total potential revenue lost
- Average charge per no-show
- Recovery rate percentage
- Monthly trend analysis
- Recent no-shows list

#### 2.7 Reverse No-Show (Admin/Manager Only)
- Undo incorrect no-show marking
- Set new status: confirmed, checked_in, or cancelled
- Requires reversal reason
- Clears all no-show fields
- Maintains history of reversal

---

## 3. Technical Implementation

### 3.1 Backend Endpoint Details

#### API Base URL
```
/api/v1/bookings
```

#### Endpoints

##### Mark as No-Show
```http
POST /api/v1/bookings/:bookingId/no-show
```

**Authentication**: Required (Bearer Token)
**Authorization**: Admin, Staff, Manager
**Rate Limit**: 100 requests/hour per user

**Request Headers**:
```http
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "reason": "Guest did not arrive and did not contact hotel",
  "chargeAmount": 100.00
}
```

**Request Body Schema**:
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `reason` | string | Yes | Max 500 chars | Reason for marking as no-show |
| `chargeAmount` | number | No | Min: 0, Max: booking total | Penalty charge amount |

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Booking successfully marked as no-show",
  "data": {
    "booking": {
      "_id": "64abc123def456789",
      "bookingNumber": "BK-2025-001234",
      "status": "no_show",
      "noShowRecorded": "2025-10-18T10:30:00.000Z",
      "noShowReason": "Guest did not arrive and did not contact hotel",
      "noShowChargeAmount": 100.00,
      "noShowMarkedBy": {
        "userId": "64abc123def456789",
        "userName": "John Smith",
        "userRole": "manager"
      }
    }
  }
}
```

**Error Responses**:

```json
// 400 - Already marked as no-show
{
  "success": false,
  "message": "Booking is already marked as no-show",
  "statusCode": 400
}

// 400 - Invalid status
{
  "success": false,
  "message": "Cannot mark booking as no-show. Current status: checked_in",
  "statusCode": 400
}

// 400 - Grace period not ended
{
  "success": false,
  "message": "Cannot mark as no-show yet. Grace period ends at 10/18/2025, 9:00:00 PM",
  "statusCode": 400
}

// 403 - Insufficient permissions
{
  "success": false,
  "message": "You do not have permission to mark bookings as no-show",
  "statusCode": 403
}

// 404 - Booking not found
{
  "success": false,
  "message": "Booking not found",
  "statusCode": 404
}
```

##### Get No-Show Statistics
```http
GET /api/v1/bookings/no-show/stats
```

**Authentication**: Required
**Authorization**: Admin, Manager

**Query Parameters**:
| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `startDate` | string (ISO date) | No | Filter start date | 2025-01-01 |
| `endDate` | string (ISO date) | No | Filter end date | 2025-12-31 |
| `hotelId` | string | No | Filter by hotel | 64abc123def456789 |

**Example Request**:
```bash
curl -X GET \
  'https://api.yourhotel.com/api/v1/bookings/no-show/stats?startDate=2025-01-01&endDate=2025-12-31' \
  -H 'Authorization: Bearer your_token_here'
```

**Success Response (200)**:
```json
{
  "success": true,
  "message": "No-show statistics retrieved successfully",
  "data": {
    "summary": {
      "totalNoShows": 45,
      "totalChargesCollected": 12500.00,
      "totalPotentialRevenue": 28000.00,
      "averageChargePerNoShow": 277.78,
      "recoveryRate": "44.64"
    },
    "monthlyTrends": {
      "2025-01": {
        "count": 8,
        "chargesCollected": 2400.00,
        "potentialRevenue": 5200.00
      },
      "2025-02": {
        "count": 12,
        "chargesCollected": 3100.00,
        "potentialRevenue": 7500.00
      }
    },
    "recentNoShows": [
      {
        "_id": "64abc123def456789",
        "bookingNumber": "BK-2025-001234",
        "hotelId": {
          "_id": "64abc123def456789",
          "name": "Grand Plaza Hotel"
        },
        "userId": {
          "_id": "64abc123def456789",
          "name": "Jane Doe",
          "email": "jane.doe@example.com"
        },
        "noShowRecorded": "2025-10-18T10:30:00.000Z",
        "noShowReason": "Guest did not arrive",
        "noShowChargeAmount": 150.00,
        "totalAmount": 300.00,
        "checkIn": "2025-10-18T15:00:00.000Z",
        "checkOut": "2025-10-20T11:00:00.000Z"
      }
    ]
  }
}
```

##### Reverse No-Show
```http
PUT /api/v1/bookings/:bookingId/reverse-no-show
```

**Authentication**: Required
**Authorization**: Admin, Manager ONLY

**Request Body**:
```json
{
  "reason": "Guest arrived late and checked in",
  "newStatus": "checked_in"
}
```

**Request Body Schema**:
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `reason` | string | Yes | Max 500 chars | Reason for reversing |
| `newStatus` | string | No | enum: confirmed, checked_in, cancelled | New status (default: confirmed) |

**Success Response (200)**:
```json
{
  "success": true,
  "message": "No-show status successfully reversed to checked_in",
  "data": {
    "booking": {
      "_id": "64abc123def456789",
      "bookingNumber": "BK-2025-001234",
      "status": "checked_in",
      "lastStatusChange": {
        "from": "no_show",
        "to": "checked_in",
        "timestamp": "2025-10-18T14:00:00.000Z",
        "reason": "Guest arrived late and checked in"
      }
    }
  }
}
```

### 3.2 Frontend Component Details

**Component Location**: `frontend/src/components/admin/NoShowModal.tsx`

**Component Props**:
```typescript
interface NoShowModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: {
    _id: string;
    bookingNumber: string;
    userId?: { name: string };
    checkIn: string;
    checkOut: string;
    totalAmount: number;
    currency: string;
    status: string;
  };
  onSuccess?: () => void;
}
```

**State Management**:
```typescript
interface NoShowFormData {
  reason: string;           // Max 500 characters
  chargeAmount: number;     // 0 to booking.totalAmount
}
```

**Validation Rules**:
1. Reason field is required
2. Reason must be ≤ 500 characters
3. Charge amount cannot be negative
4. Charge amount cannot exceed booking total

**Component Features**:
- Real-time form validation
- Character counter for reason field
- Currency formatting based on booking currency
- Loading state during submission
- Toast notifications for success/error
- Automatic query invalidation on success

### 3.3 Data Models

#### Booking Schema (No-Show Fields)

```javascript
{
  // Status field
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'modified', 'checked_in', 'checked_out', 'cancelled', 'no_show'],
    default: 'pending'
  },

  // No-show specific fields
  noShowRecorded: {
    type: Date,
    default: null  // Set when booking marked as no-show
  },

  noShowReason: {
    type: String,
    maxlength: 500,
    default: null
  },

  noShowMarkedBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    userName: String,
    userRole: String
  },

  noShowChargeAmount: {
    type: Number,
    default: 0,
    min: 0
  },

  noShowChargeApplied: {
    type: Boolean,
    default: false
  },

  // Status history (includes no-show transitions)
  statusHistory: [{
    status: String,
    timestamp: Date,
    changedBy: {
      source: String,      // 'admin', 'system', 'guest'
      userId: String,
      userName: String,
      channel: String      // 'web', 'mobile', 'system'
    },
    reason: String,
    automaticTransition: Boolean,
    validatedTransition: Boolean
  }],

  // Last status change tracker
  lastStatusChange: {
    from: String,
    to: String,
    timestamp: Date,
    reason: String
  }
}
```

#### Status Transition Rules

```javascript
const allowedTransitions = {
  confirmed: ['checked_in', 'cancelled', 'no_show', 'modified'],
  modified: ['confirmed', 'cancelled', 'checked_in', 'no_show'],
  pending: ['confirmed', 'cancelled', 'no_show'],
  no_show: ['cancelled']  // Can cancel no-shows for cleanup
};
```

### 3.4 API Reference

#### Complete cURL Examples

**Mark as No-Show with Charge**:
```bash
curl -X POST \
  https://api.yourhotel.com/api/v1/bookings/64abc123def456789/no-show \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -d '{
    "reason": "Guest did not arrive and did not respond to contact attempts",
    "chargeAmount": 150.00
  }'
```

**Mark as No-Show without Charge**:
```bash
curl -X POST \
  https://api.yourhotel.com/api/v1/bookings/64abc123def456789/no-show \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -d '{
    "reason": "First-time guest, goodwill gesture - no charge applied"
  }'
```

**Get Statistics for Specific Hotel**:
```bash
curl -X GET \
  'https://api.yourhotel.com/api/v1/bookings/no-show/stats?hotelId=64abc123def456789&startDate=2025-01-01&endDate=2025-12-31' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

**Reverse No-Show**:
```bash
curl -X PUT \
  https://api.yourhotel.com/api/v1/bookings/64abc123def456789/reverse-no-show \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -d '{
    "reason": "Guest arrived 8 hours late, manager approval to check in",
    "newStatus": "checked_in"
  }'
```

---

## 4. User Workflows

### 4.1 Complete No-Show Workflow (Step-by-Step)

#### Scenario: Guest Did Not Arrive

**Prerequisites**:
- Booking status is "confirmed" or "pending"
- Check-in time + 6 hours grace period has passed
- Staff has attempted to contact guest
- User has Admin, Staff, or Manager role

**Steps**:

1. **Identify No-Show Booking**
   - Navigate to Admin Bookings page
   - Filter by check-in date
   - Identify bookings where check-in time + 6 hours has passed
   - Verify booking status is "confirmed" or "pending"

2. **Open No-Show Modal**
   - Locate the booking in the table
   - Click the three-dot menu (⋮) on the booking row
   - Select "Mark as No-Show" option
   - No-Show modal opens

3. **Review Booking Details**
   - Modal displays:
     - Guest name
     - Booking number
     - Check-in date
     - Check-out date
     - Total amount
     - Current status

4. **Enter No-Show Information**
   - **Reason Field** (Required):
     - Enter detailed reason (max 500 characters)
     - Examples:
       - "Guest did not arrive and did not respond to 3 phone calls and 2 emails"
       - "Reservation confirmed yesterday, no-call no-show today"
       - "Guest attempted to cancel after check-in time, policy enforced"

   - **Charge Amount Field** (Optional):
     - Enter amount: $0.00 to booking total
     - Common scenarios:
       - $0.00 = First-time guest, goodwill gesture
       - 50% = Partial charge per hotel policy
       - 100% = Full charge for repeat offender or peak season

5. **Review Warning Message**
   - Yellow warning box displays:
     - "Marking this booking as no-show will change its status permanently"
     - "This action can be reversed by an admin or manager if needed"

6. **Submit No-Show**
   - Click "Mark as No-Show" button
   - System validates:
     - Reason is not empty
     - Reason ≤ 500 characters
     - Charge amount is valid
   - If validation passes, request sent to backend

7. **Backend Processing**
   - Grace period validation (6 hours after check-in)
   - Permission check (admin/staff/manager)
   - Status validation (confirmed/pending only)
   - Booking update:
     - Status → "no_show"
     - noShowRecorded → current timestamp
     - noShowReason → entered reason
     - noShowChargeAmount → entered amount
     - noShowMarkedBy → current user details
   - Status history entry created
   - Notifications sent (guest + staff)

8. **Confirmation**
   - Success toast notification displays
   - Modal closes automatically
   - Booking table refreshes
   - Booking status updates to "No-Show" (red badge)

9. **Post-Action**
   - Guest receives email notification about no-show status
   - Hotel staff receive internal notification
   - Housekeeping notified (room available for cleaning)
   - Finance team notified (charge applied)
   - Booking appears in No-Show statistics

### 4.2 Reverse No-Show Workflow (Admin/Manager Only)

**Scenario**: Guest Arrived Late After Being Marked No-Show

**Steps**:

1. **Identify Incorrect No-Show**
   - Guest arrives late (e.g., 10 hours after check-in time)
   - Staff verifies guest identity
   - Manager decides to accommodate guest

2. **Open Booking Details**
   - Navigate to Admin Bookings
   - Find the no-show booking
   - Click to open booking details

3. **Reverse No-Show**
   - Click "Reverse No-Show" button (Admin/Manager only)
   - Modal opens requesting:
     - Reason for reversal (required)
     - New status (confirmed, checked_in, cancelled)

4. **Enter Reversal Details**
   - Reason: "Guest arrived 10 hours late due to flight delay. Manager approval to check in."
   - New Status: "checked_in"
   - Click "Reverse No-Show"

5. **Backend Processing**
   - Permission validation (admin/manager only)
   - Status update to new status
   - Clear all no-show fields:
     - noShowRecorded → null
     - noShowReason → null
     - noShowMarkedBy → null
     - noShowChargeAmount → 0
     - noShowChargeApplied → false
   - Status history entry created
   - Last status change updated

6. **Confirmation**
   - Success notification
   - Booking status updates to new status
   - Guest can proceed with check-in

### 4.3 View No-Show Statistics Workflow

**Who Can Access**: Admin, Manager

**Steps**:

1. **Navigate to Reports**
   - Go to Admin Dashboard
   - Click "Reports" or "Analytics"
   - Select "No-Show Statistics"

2. **Set Filters**
   - Date Range: Select start and end dates
   - Hotel: Select specific hotel or "All Hotels"
   - Click "Apply Filters"

3. **Review Statistics**
   - **Summary Metrics**:
     - Total No-Shows
     - Total Charges Collected
     - Total Potential Revenue Lost
     - Average Charge per No-Show
     - Recovery Rate %

   - **Monthly Trends**:
     - Chart showing no-show count by month
     - Chart showing charges collected by month

   - **Recent No-Shows Table**:
     - Latest 10 no-shows
     - Booking number, guest, date, charge

4. **Export Report** (if available)
   - Click "Export to CSV" or "Export to PDF"
   - Report downloads with all data

### 4.4 Decision Tree

```
Guest Booking Check-In Time Passed
│
├─ Has guest arrived?
│  ├─ Yes → Check in normally
│  └─ No → Continue
│
├─ Has guest contacted hotel?
│  ├─ Yes → Modify booking or cancel
│  └─ No → Continue
│
├─ Has 6-hour grace period passed?
│  ├─ No → Wait
│  └─ Yes → Continue
│
├─ Booking status?
│  ├─ Confirmed or Pending → Continue
│  └─ Other status → Cannot mark as no-show
│
├─ Your role?
│  ├─ Admin/Staff/Manager → Continue
│  └─ Other → No permission
│
├─ Apply charge?
│  ├─ First-time guest / Goodwill → $0 charge
│  ├─ Standard policy → 50% charge
│  ├─ Repeat offender / Peak season → 100% charge
│  └─ Custom amount → Enter specific amount
│
└─ Mark as No-Show
   │
   ├─ Guest notified via email
   ├─ Staff notified
   ├─ Housekeeping notified
   ├─ Finance notified (if charge applied)
   └─ Audit log created
```

---

## 5. No-Show Charge Integration

### 5.1 How Charges Are Recorded

When a no-show charge is applied:

1. **Booking Update**:
   ```javascript
   booking.noShowChargeAmount = chargeAmount;
   booking.noShowChargeApplied = true;
   ```

2. **Status History Entry**:
   ```javascript
   booking.statusHistory.push({
     status: 'no_show',
     timestamp: now,
     changedBy: {
       source: 'admin',
       userId: user._id.toString(),
       userName: user.name,
       channel: 'system'
     },
     reason: `No-show marked with charge of ${chargeAmount}. Reason: ${reason}`,
     automaticTransition: false,
     validatedTransition: true
   });
   ```

3. **Payment Record** (Future Enhancement):
   ```javascript
   // Create payment record
   await Payment.create({
     bookingId: booking._id,
     amount: chargeAmount,
     type: 'no_show_charge',
     status: 'pending',
     description: `No-show penalty charge for booking ${booking.bookingNumber}`,
     createdBy: user._id
   });
   ```

### 5.2 Payment Collection Process

**Current Implementation**:
- Charge amount is recorded in booking document
- Manual collection by staff if needed
- Included in settlement reports

**Future Enhancement - Automated Payment**:

```javascript
// Automatic charge to saved payment method
if (booking.stripePaymentId && chargeAmount > 0) {
  try {
    const charge = await stripe.charges.create({
      amount: chargeAmount * 100, // Convert to cents
      currency: booking.currency.toLowerCase(),
      customer: booking.stripeCustomerId,
      description: `No-show charge for ${booking.bookingNumber}`,
      metadata: {
        bookingId: booking._id.toString(),
        bookingNumber: booking.bookingNumber,
        type: 'no_show_penalty'
      }
    });

    booking.noShowChargeStripeId = charge.id;
    booking.noShowChargeCollected = true;
  } catch (error) {
    // Log error, notify staff for manual collection
    console.error('Failed to charge no-show fee:', error);
  }
}
```

### 5.3 Settlement Integration

**Daily Settlement Report Includes**:
- All no-show charges applied that day
- Total no-show revenue collected
- Breakdown by hotel (multi-property)
- Outstanding no-show charges (not yet collected)

**Example Settlement Entry**:
```json
{
  "date": "2025-10-18",
  "hotelId": "64abc123def456789",
  "revenue": {
    "roomRevenue": 12500.00,
    "noShowCharges": 450.00,
    "totalRevenue": 12950.00
  },
  "noShowDetails": [
    {
      "bookingNumber": "BK-2025-001234",
      "guestName": "Jane Doe",
      "chargeAmount": 150.00,
      "collected": true,
      "method": "credit_card"
    },
    {
      "bookingNumber": "BK-2025-001235",
      "guestName": "John Smith",
      "chargeAmount": 300.00,
      "collected": false,
      "method": "pending_collection"
    }
  ]
}
```

### 5.4 Refund Handling

**Scenario**: No-show charge needs to be refunded

**Process**:

1. **Manager Decision**:
   - Review no-show case
   - Determine if refund warranted
   - Document refund reason

2. **Reverse No-Show** (if appropriate):
   - Use reverse no-show endpoint
   - Clears charge amount
   - Updates status

3. **Manual Refund** (if keeping no-show status):
   ```javascript
   // Process refund through payment system
   if (booking.noShowChargeStripeId) {
     await stripe.refunds.create({
       charge: booking.noShowChargeStripeId,
       amount: refundAmount * 100,
       reason: 'requested_by_customer',
       metadata: {
         bookingId: booking._id.toString(),
         refundReason: 'Manager approved refund'
       }
     });

     // Update booking
     booking.noShowChargeRefunded = true;
     booking.noShowChargeRefundAmount = refundAmount;
     booking.noShowChargeRefundDate = new Date();
   }
   ```

4. **Accounting Update**:
   - Settlement report adjusted
   - Revenue reversed for refunded amount
   - Audit log entry created

---

## 6. UI/UX Guide

### 6.1 Design Principles

1. **Clarity**: Clear indication of what action will be taken
2. **Safety**: Warning messages before irreversible actions
3. **Feedback**: Immediate confirmation of actions
4. **Accessibility**: Keyboard navigation and screen reader support
5. **Consistency**: Follows hotel management system design patterns

### 6.2 Color Coding

**Status Badges**:
```
Pending      → Blue (#3B82F6)    bg-blue-100 text-blue-800
Confirmed    → Green (#10B981)   bg-green-100 text-green-800
Checked In   → Teal (#14B8A6)    bg-teal-100 text-teal-800
Checked Out  → Gray (#6B7280)    bg-gray-100 text-gray-800
No-Show      → Red (#EF4444)     bg-red-100 text-red-800
Cancelled    → Orange (#F97316)  bg-orange-100 text-orange-800
```

**Charge Amount Indicators**:
```
No Charge (0%)      → Gray
Partial (1-50%)     → Yellow
Moderate (51-99%)   → Orange
Full Charge (100%)  → Red
```

**Action Buttons**:
```
Mark as No-Show  → Red (variant="destructive")
Reverse No-Show  → Green (variant="success")
Cancel           → Gray (variant="outline")
```

### 6.3 Iconography

```javascript
import {
  AlertTriangle,  // Warning/No-show indicator
  DollarSign,     // Charge amount field
  FileText,       // Reason field
  Calendar,       // Date display
  X,              // Close modal
  Check,          // Confirm action
  Info            // Information tooltip
} from 'lucide-react';
```

**Icon Usage**:
- `AlertTriangle`: No-show status badge, warning messages
- `DollarSign`: Charge amount input, financial data
- `FileText`: Reason textarea, notes
- `Calendar`: Check-in/check-out dates
- `X`: Close buttons
- `Check`: Confirmation messages
- `Info`: Help tooltips

### 6.4 Accessibility Features

**Keyboard Navigation**:
- `Tab`: Navigate between form fields
- `Enter`: Submit form
- `Escape`: Close modal
- `Space`: Toggle checkboxes/buttons

**Screen Reader Support**:
```jsx
<Label htmlFor="reason" className="sr-only">
  Reason for marking as no-show
</Label>
<Textarea
  id="reason"
  aria-required="true"
  aria-invalid={!!errors.reason}
  aria-describedby="reason-error"
  ...
/>
{errors.reason && (
  <p id="reason-error" role="alert" className="text-red-500">
    {errors.reason}
  </p>
)}
```

**Color Contrast**:
- All text meets WCAG AA standards (4.5:1 for normal text)
- Status badges have sufficient contrast
- Focus indicators clearly visible

**Form Validation**:
- Real-time validation feedback
- Error messages announced to screen readers
- Clear indication of required fields

---

## 7. Testing Scenarios

### 7.1 Mark as No-Show Without Charge

**Test Case**: NS-001

**Objective**: Verify staff can mark booking as no-show without applying charges

**Prerequisites**:
- Test user with "staff" role
- Confirmed booking with check-in time 7+ hours ago
- Booking not already marked as no-show

**Test Steps**:
1. Login as staff user
2. Navigate to Admin Bookings
3. Find test booking (e.g., BK-TEST-001)
4. Click menu (⋮) → "Mark as No-Show"
5. Enter reason: "Guest did not arrive - test scenario"
6. Leave charge amount as 0
7. Click "Mark as No-Show"

**Expected Results**:
- ✅ Success toast displays
- ✅ Modal closes
- ✅ Booking status changes to "No-Show" (red badge)
- ✅ Booking detail shows:
  - noShowRecorded: current timestamp
  - noShowReason: entered reason
  - noShowChargeAmount: 0
  - noShowMarkedBy: staff user details
- ✅ Status history contains no-show entry
- ✅ Guest receives email notification
- ✅ Staff receives internal notification

**Cleanup**:
- Reverse no-show as admin

---

### 7.2 Mark as No-Show with 50% Charge

**Test Case**: NS-002

**Objective**: Verify manager can mark booking as no-show with partial charge

**Prerequisites**:
- Test user with "manager" role
- Confirmed booking worth $200, check-in time passed
- Booking status: "confirmed"

**Test Steps**:
1. Login as manager
2. Navigate to Admin Bookings
3. Find booking (total: $200)
4. Click menu → "Mark as No-Show"
5. Enter reason: "No-call no-show, hotel policy enforced"
6. Enter charge amount: 100 (50% of $200)
7. Click "Mark as No-Show"

**Expected Results**:
- ✅ Success toast displays
- ✅ Booking status: "No-Show"
- ✅ noShowChargeAmount: 100
- ✅ noShowChargeApplied: true
- ✅ Status history includes charge details
- ✅ Settlement report includes $100 no-show charge
- ✅ Finance team notified

**Verification**:
```bash
# Check database
db.bookings.findOne(
  { bookingNumber: "BK-TEST-002" },
  { status: 1, noShowChargeAmount: 1, noShowChargeApplied: 1 }
)

# Expected output:
{
  status: "no_show",
  noShowChargeAmount: 100,
  noShowChargeApplied: true
}
```

---

### 7.3 Mark as No-Show with Full Charge

**Test Case**: NS-003

**Objective**: Verify admin can apply 100% penalty charge

**Prerequisites**:
- Admin user
- Confirmed booking worth $500
- Peak season or repeat offender scenario

**Test Steps**:
1. Login as admin
2. Find booking (total: $500)
3. Mark as no-show
4. Reason: "Peak season no-show, full penalty applied"
5. Charge: 500 (100%)
6. Submit

**Expected Results**:
- ✅ Full charge applied: $500
- ✅ Status history shows 100% charge
- ✅ Guest notified of full charge
- ✅ Charge appears in settlement report

---

### 7.4 Reverse No-Show (Admin Only)

**Test Case**: NS-004

**Objective**: Verify admin can reverse incorrect no-show marking

**Prerequisites**:
- Admin user
- Booking already marked as no-show
- Guest arrives late

**Test Steps**:
1. Login as admin
2. Find no-show booking
3. Click "Reverse No-Show"
4. Reason: "Guest arrived late with valid excuse"
5. New status: "checked_in"
6. Submit

**Expected Results**:
- ✅ Status changes to "checked_in"
- ✅ All no-show fields cleared:
  - noShowRecorded: null
  - noShowReason: null
  - noShowChargeAmount: 0
  - noShowChargeApplied: false
- ✅ Status history shows reversal
- ✅ Reversal reason logged

**Negative Test** (Staff tries to reverse):
1. Login as staff user
2. Try to access reverse no-show function
3. Expected: 403 Forbidden error

---

### 7.5 Validation Tests

**Test Case**: NS-005

**Objective**: Verify form validation works correctly

**Sub-tests**:

**5A: Empty Reason**
- Leave reason field empty
- Try to submit
- Expected: Error "Reason is required"

**5B: Reason Too Long**
- Enter 501 characters in reason
- Expected: Error "Reason must be less than 500 characters"

**5C: Negative Charge**
- Enter -50 in charge amount
- Expected: Error "Charge amount cannot be negative"

**5D: Charge Exceeds Total**
- Booking total: $200
- Enter charge: 250
- Expected: Error "Charge amount cannot exceed booking total"

**5E: Grace Period Not Ended**
- Find booking with check-in time 2 hours ago
- Try to mark as no-show
- Expected: 400 error "Cannot mark as no-show yet. Grace period ends at..."

**5F: Invalid Status**
- Find "checked_out" booking
- Try to mark as no-show
- Expected: 400 error "Cannot mark booking as no-show. Current status: checked_out"

**5G: Already No-Show**
- Find booking already marked as no-show
- Try to mark again
- Expected: 400 error "Booking is already marked as no-show"

---

### 7.6 Multi-Property Scenarios

**Test Case**: NS-006

**Objective**: Verify no-show works correctly in multi-property setup

**Prerequisites**:
- Multi-property setup with 3 hotels
- Admin user with access to all properties
- Bookings in different hotels

**Test Steps**:
1. Mark booking as no-show in Hotel A
2. Mark booking as no-show in Hotel B
3. Mark booking as no-show in Hotel C
4. View no-show statistics for:
   - All hotels combined
   - Hotel A only
   - Hotel B only
   - Hotel C only

**Expected Results**:
- ✅ Each hotel's no-shows tracked separately
- ✅ Statistics accurately filter by hotelId
- ✅ Combined statistics show total across all hotels
- ✅ Settlement reports per hotel are correct

**Verification Query**:
```bash
# Get no-show stats for Hotel A
curl -X GET \
  'https://api.yourhotel.com/api/v1/bookings/no-show/stats?hotelId=64abc123def456789' \
  -H 'Authorization: Bearer token'
```

---

### 7.7 Permission Testing

**Test Case**: NS-007

**Objective**: Verify role-based permissions are enforced

**Test Matrix**:

| Action | Guest | Staff | Manager | Admin |
|--------|-------|-------|---------|-------|
| Mark as no-show | ❌ 403 | ✅ 200 | ✅ 200 | ✅ 200 |
| View no-show stats | ❌ 403 | ❌ 403 | ✅ 200 | ✅ 200 |
| Reverse no-show | ❌ 403 | ❌ 403 | ✅ 200 | ✅ 200 |

**Test Steps**:
1. Create test users for each role
2. Login as each user
3. Attempt each action
4. Verify correct HTTP status code

**Expected Error Response (403)**:
```json
{
  "success": false,
  "message": "You do not have permission to mark bookings as no-show",
  "statusCode": 403
}
```

---

### 7.8 Notification Testing

**Test Case**: NS-008

**Objective**: Verify notifications are sent correctly

**Test Steps**:
1. Mark booking as no-show
2. Check email inbox for guest notification
3. Check staff dashboard for internal notification
4. Verify housekeeping receives notification

**Expected Guest Email**:
```
Subject: Booking BK-2025-001234 - No-Show Status

Dear Jane Doe,

We noticed you did not arrive for your reservation at Grand Plaza Hotel.

Booking Details:
- Booking Number: BK-2025-001234
- Check-in Date: October 18, 2025
- Charge Applied: $100.00

Reason: Guest did not arrive and did not contact hotel

If you believe this is an error, please contact us immediately.

Best regards,
Grand Plaza Hotel
```

**Expected Staff Notification**:
```
Type: booking_no_show
Priority: medium
Message: Booking BK-2025-001234 has been marked as no-show
Details:
- Guest: Jane Doe
- Charge: $100.00
- Marked by: John Smith (Manager)
```

---

## 8. Staff Training Guide

### 8.1 When to Mark No-Show

**Mark a booking as no-show when**:
- ✅ Check-in time + 6 hours has passed
- ✅ Guest has not arrived
- ✅ Guest has not contacted hotel to cancel/modify
- ✅ Hotel has attempted to contact guest (recommended: 2-3 attempts)
- ✅ Booking status is "confirmed" or "pending"

**DO NOT mark as no-show when**:
- ❌ Grace period (6 hours) has not ended
- ❌ Guest has contacted hotel about running late
- ❌ Guest is currently checking in
- ❌ Booking is already checked-in, checked-out, or cancelled
- ❌ You're unsure about the situation (escalate to manager)

### 8.2 How to Determine Charge Amount

**Charge Decision Framework**:

```
┌─────────────────────────────────────────┐
│         NO-SHOW CHARGE MATRIX           │
├─────────────┬───────────────────────────┤
│ Scenario    │ Recommended Charge        │
├─────────────┼───────────────────────────┤
│ First-time  │ 0% (Warning only)         │
│ guest       │                           │
├─────────────┼───────────────────────────┤
│ Standard    │ 50% (Hotel policy)        │
│ no-show     │                           │
├─────────────┼───────────────────────────┤
│ Peak season │ 100% (Full penalty)       │
│ no-show     │                           │
├─────────────┼───────────────────────────┤
│ Repeat      │ 100% (Full penalty)       │
│ offender    │                           │
├─────────────┼───────────────────────────┤
│ Corporate   │ Per contract terms        │
│ booking     │                           │
├─────────────┼───────────────────────────┤
│ Special     │ Manager discretion        │
│ circumstance│                           │
└─────────────┴───────────────────────────┘
```

**Factors to Consider**:
1. **Guest History**: Check CRM for previous no-shows
2. **Booking Value**: Higher value = higher charge may apply
3. **Season**: Peak season warrants stricter penalties
4. **Cancellation Policy**: Follow stated policy
5. **Circumstances**: Weather emergencies, medical issues may warrant leniency
6. **Manager Guidance**: When in doubt, consult manager

### 8.3 Common Scenarios and Solutions

#### Scenario 1: Guest Running Late
**Situation**: Guest calls 4 hours after check-in time, says they'll arrive in 2 hours

**Solution**:
- ✅ DO: Keep booking as "confirmed"
- ✅ DO: Note the call in booking comments
- ✅ DO: Set a reminder to check again in 3 hours
- ❌ DON'T: Mark as no-show yet
- ❌ DON'T: Release the room

**Follow-up**: If guest doesn't arrive within promised time + 2 hours, mark as no-show

---

#### Scenario 2: Guest Forgot to Cancel
**Situation**: Guest marked as no-show, then calls saying they forgot to cancel days ago

**Solution**:
- If call is within 24 hours of no-show marking:
  - Manager can reverse no-show
  - Update status to "cancelled"
  - Waive no-show charge (goodwill)

- If call is days/weeks later:
  - Keep no-show status
  - Explain hotel policy
  - Manager may waive charge at discretion

---

#### Scenario 3: System Shows Guest Checked In, But They Didn't Arrive
**Situation**: Status shows "checked_in" but guest never arrived (system error)

**Solution**:
- ✅ DO: Escalate to manager immediately
- ✅ DO: Document the discrepancy
- ❌ DON'T: Try to mark as no-show (will fail - wrong status)
- Manager must first update status to "confirmed", then mark as no-show

---

#### Scenario 4: VIP Guest No-Show
**Situation**: High-value corporate client or VIP didn't arrive

**Solution**:
- ✅ DO: Notify manager immediately
- ✅ DO: Attempt contact via all available channels
- ✅ DO: Wait for manager's decision on charge
- ❌ DON'T: Apply charge without manager approval
- Note: VIP policies may override standard no-show policy

---

#### Scenario 5: Weather Emergency
**Situation**: Major storm caused flight cancellations, guest couldn't arrive

**Solution**:
- ✅ DO: Mark as no-show for inventory management
- ✅ DO: Apply 0% charge (force majeure)
- ✅ DO: Note reason: "Hurricane [name] - flight cancelled"
- ✅ DO: Offer rebooking assistance
- Follow hotel's force majeure policy

---

### 8.4 Best Practices

**Before Marking No-Show**:
1. ✅ Check booking notes for any special circumstances
2. ✅ Verify check-in time and grace period
3. ✅ Review guest's booking history in CRM
4. ✅ Confirm at least 2 contact attempts were made
5. ✅ Check with front desk if any messages left

**When Marking No-Show**:
1. ✅ Write clear, detailed reason (future reference)
2. ✅ Follow hotel policy for charge amounts
3. ✅ Double-check charge amount before submitting
4. ✅ Save booking confirmation screenshot (if needed)
5. ✅ Notify relevant departments (housekeeping, finance)

**After Marking No-Show**:
1. ✅ Verify email notification sent to guest
2. ✅ Add note to booking timeline
3. ✅ Update room availability in system
4. ✅ Notify housekeeping room is available
5. ✅ If charge applied, notify finance department

**Communication Tips**:
- Be factual, not judgmental in reason field
- Use professional language
- Include specific details (dates, times, contact attempts)
- Reference hotel policy when applicable

**Example Good Reasons**:
- ✅ "Guest did not arrive by 9 PM (6 hours after 3 PM check-in). Called guest's mobile twice (3 PM, 6 PM) - no answer. Sent email at 7 PM - no response."
- ✅ "No-call no-show. Standard hotel policy enforced. Guest has 2 previous no-shows in system (June 2024, Aug 2024)."
- ✅ "Peak season reservation. Guest confirmed by email yesterday. Failed to arrive or contact hotel. Full penalty per cancellation policy."

**Example Bad Reasons**:
- ❌ "Guest didn't show up" (too vague)
- ❌ "No show" (no details)
- ❌ "Idk why they didn't come" (unprofessional)

---

### 8.5 Dos and Don'ts

**DO**:
- ✅ Follow hotel policy consistently
- ✅ Document everything thoroughly
- ✅ Be empathetic in guest communications
- ✅ Escalate unclear situations to manager
- ✅ Keep records of contact attempts
- ✅ Apply charges fairly and consistently
- ✅ Use the grace period appropriately
- ✅ Verify booking details before marking
- ✅ Notify all relevant departments
- ✅ Review guest history before deciding charge amount

**DON'T**:
- ❌ Mark as no-show before grace period ends
- ❌ Apply arbitrary charge amounts
- ❌ Skip documenting the reason
- ❌ Make exceptions without manager approval
- ❌ Use no-show feature to punish guests
- ❌ Mark as no-show if guest is checking in
- ❌ Forget to attempt contact first
- ❌ Apply charges inconsistently
- ❌ Reverse no-shows without authorization
- ❌ Ignore hotel policies

**When in Doubt**:
- Ask your manager
- Review hotel policy document
- Check guest's booking history
- Consider impact on guest relationship
- Document your decision-making process

---

## 9. Business Rules

### 9.1 What Statuses Can Be Marked No-Show

**Allowed Statuses**:
```javascript
const allowedStatuses = ['confirmed', 'pending'];
```

| Status | Can Mark as No-Show? | Reason |
|--------|---------------------|---------|
| `pending` | ✅ Yes | Payment not completed, guest didn't arrive |
| `confirmed` | ✅ Yes | Payment completed, guest didn't arrive |
| `modified` | ❌ No | Use 'confirmed' status first |
| `checked_in` | ❌ No | Guest already checked in |
| `checked_out` | ❌ No | Guest already checked out |
| `cancelled` | ❌ No | Booking already cancelled |
| `no_show` | ❌ No | Already marked as no-show |

**System Validation**:
```javascript
if (!['confirmed', 'pending'].includes(booking.status)) {
  throw new ApiError(400, `Cannot mark booking as no-show. Current status: ${booking.status}`);
}
```

### 9.2 Charge Amount Limits

**Minimum Charge**: $0 (no charge)
```javascript
chargeAmount >= 0
```

**Maximum Charge**: Booking total amount
```javascript
chargeAmount <= booking.totalAmount
```

**Validation**:
```javascript
if (formData.chargeAmount < 0) {
  errors.chargeAmount = 'Charge amount cannot be negative';
}

if (formData.chargeAmount > booking.totalAmount) {
  errors.chargeAmount = 'Charge amount cannot exceed booking total';
}
```

**Examples**:
| Booking Total | Valid Charges | Invalid Charges |
|---------------|---------------|-----------------|
| $200.00 | $0, $50, $100, $200 | -$10, $250, $300 |
| $500.00 | $0, $250, $375, $500 | -$1, $600, $1000 |
| $1,000.00 | $0, $100, $500, $1000 | -$50, $1500, $2000 |

**Percentage Guidelines** (not enforced, but recommended):
- 0%: First-time guest, goodwill
- 25%: Minor circumstances
- 50%: Standard policy
- 75%: Peak season or repeat guest
- 100%: Severe circumstances or policy violation

### 9.3 Reason Requirements

**Mandatory Field**: Yes
```javascript
if (!formData.reason.trim()) {
  errors.reason = 'Reason is required';
}
```

**Character Limit**: 500 characters
```javascript
if (formData.reason.length > 500) {
  errors.reason = 'Reason must be less than 500 characters';
}
```

**Best Practices**:
- Minimum recommended length: 20 characters
- Include specific details (times, contact attempts)
- Reference hotel policy when applicable
- Use professional, factual language
- Avoid personal opinions or judgments

**Database Schema**:
```javascript
noShowReason: {
  type: String,
  maxlength: 500,
  default: null
}
```

### 9.4 Grace Period Policy

**Default Grace Period**: 6 hours after check-in time

**Business Logic**:
```javascript
const checkInDate = new Date(booking.checkIn);
const gracePeriodHours = 6;
const gracePeriodEnd = new Date(
  checkInDate.getTime() + (gracePeriodHours * 60 * 60 * 1000)
);

if (now < gracePeriodEnd) {
  throw new ApiError(400,
    `Cannot mark as no-show yet. Grace period ends at ${gracePeriodEnd.toLocaleString()}`
  );
}
```

**Example**:
| Check-in Time | Grace Period Ends | Can Mark No-Show? |
|---------------|-------------------|-------------------|
| 3:00 PM (15:00) | 9:00 PM (21:00) | After 9:00 PM |
| 2:00 PM (14:00) | 8:00 PM (20:00) | After 8:00 PM |
| 12:00 PM (12:00) | 6:00 PM (18:00) | After 6:00 PM |

**Configurable**: Grace period can be adjusted per hotel settings (future enhancement):
```javascript
// Future: Per-hotel configuration
const gracePeriodHours = hotelSettings.noShowGracePeriodHours || 6;
```

### 9.5 Reversal Policies

**Who Can Reverse**: Admin, Manager ONLY
```javascript
if (!['admin', 'manager'].includes(user.role)) {
  throw new ApiError(403, 'You do not have permission to reverse no-show status');
}
```

**Current Status Required**: `no_show`
```javascript
if (booking.status !== 'no_show') {
  throw new ApiError(400, 'Booking is not marked as no-show');
}
```

**Allowed New Statuses**:
```javascript
const allowedNewStatuses = ['confirmed', 'checked_in', 'cancelled'];
```

| New Status | When to Use | Effect |
|------------|-------------|--------|
| `confirmed` | Guest will arrive later | Restores original booking |
| `checked_in` | Guest has now arrived | Proceeds with check-in |
| `cancelled` | Guest won't arrive, cleanup | Marks as cancelled instead |

**Reversal Actions**:
1. Update status to new status
2. Clear all no-show fields:
   - noShowRecorded → null
   - noShowReason → null
   - noShowMarkedBy → null
   - noShowChargeAmount → 0
   - noShowChargeApplied → false
3. Add status history entry
4. Update lastStatusChange
5. (Future) Refund charge if already collected

**Reason Required**: Yes
```javascript
const { reason, newStatus = 'confirmed' } = req.body;

booking.statusHistory.push({
  status: newStatus,
  timestamp: now,
  changedBy: { ... },
  reason: `No-show status reversed to ${newStatus}. Reason: ${reason}`,
  automaticTransition: false,
  validatedTransition: true
});
```

### 9.6 Refund Policies

**Current Implementation**: Manual refund process

**Refund Scenarios**:

1. **No-Show Reversed**:
   - Reversal automatically clears charge amount
   - If charge was collected, manual refund required
   - Finance team handles refund processing

2. **Guest Disputes Charge**:
   - Manager reviews case
   - Decision documented
   - If approved, manual refund processed
   - Original no-show status may be kept for records

3. **System Error**:
   - Immediate reversal by admin
   - Full refund if charge collected
   - Incident logged for review

**Future Enhancement - Automated Refund**:
```javascript
// Automatic refund when reversing no-show
if (booking.noShowChargeStripeId && booking.noShowChargeCollected) {
  const refund = await stripe.refunds.create({
    charge: booking.noShowChargeStripeId,
    amount: booking.noShowChargeAmount * 100,
    reason: 'requested_by_customer',
    metadata: {
      bookingId: booking._id.toString(),
      reversalReason: reason
    }
  });

  booking.noShowChargeRefundId = refund.id;
  booking.noShowChargeRefunded = true;
  booking.noShowChargeRefundDate = new Date();
}
```

**Refund Timeline**:
- Same day reversal: Immediate refund
- Next day reversal: 1-2 business days
- Later reversal: 3-5 business days

**Documentation Required**:
- Original no-show reason
- Reversal reason
- Refund approval (manager signature)
- Refund confirmation (transaction ID)

---

## 10. Integration Points

### 10.1 Booking System Integration

**Data Flow**:
```
Booking System → No-Show Controller → Database Update
     ↓
Status Change Event
     ↓
Notification Service → Guest Email + Staff Alert
     ↓
Inventory Update → Room Availability
     ↓
Analytics Service → No-Show Statistics
```

**Key Integration**:
```javascript
// When booking marked as no-show
booking.status = 'no_show';
await booking.save();

// Triggers:
// 1. Pre-save hooks in Booking model
// 2. Notification automation
// 3. Room availability recalculation
// 4. Analytics aggregation
```

**Status Transition Validation**:
```javascript
bookingSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'no_show') {
    const allowedPreviousStatuses = ['confirmed', 'pending'];
    const previousStatus = this._original?.status;

    if (!allowedPreviousStatuses.includes(previousStatus)) {
      return next(new Error(
        `Invalid status transition from ${previousStatus} to no_show`
      ));
    }

    this.noShowRecorded = new Date();
  }
  next();
});
```

### 10.2 Payment System Integration

**Current**:
- Charge amount recorded in booking
- Manual collection by staff
- Included in financial reports

**Future - Stripe Integration**:
```javascript
// Automatic charge when marking no-show
if (booking.stripePaymentId && chargeAmount > 0) {
  const charge = await stripe.charges.create({
    amount: chargeAmount * 100,
    currency: booking.currency.toLowerCase(),
    customer: booking.stripeCustomerId,
    description: `No-show penalty for ${booking.bookingNumber}`,
    metadata: {
      bookingId: booking._id.toString(),
      type: 'no_show_penalty'
    }
  });

  booking.noShowChargeStripeId = charge.id;
  booking.noShowChargeCollected = true;
  booking.noShowChargeCollectedAt = new Date();
}
```

### 10.3 Checkout System Integration

**Impact on Checkout**:
```javascript
// No-show bookings excluded from checkout flow
if (booking.status === 'cancelled' || booking.status === 'no_show') {
  throw new Error('Cannot checkout cancelled or no-show booking');
}
```

**Settlement Integration**:
```javascript
// No-show charges included in daily settlement
const dailySettlement = {
  date: today,
  roomRevenue: totalRoomRevenue,
  noShowCharges: totalNoShowCharges, // ← Included here
  totalRevenue: totalRoomRevenue + totalNoShowCharges,
  breakdown: {
    noShows: [
      {
        bookingNumber: 'BK-2025-001234',
        chargeAmount: 100,
        collected: true
      }
    ]
  }
};
```

### 10.4 Reporting Integration

**No-Show Data in Reports**:

1. **Daily Operations Report**:
   - No-shows count
   - Charges collected
   - Room nights lost

2. **Financial Report**:
   - No-show revenue
   - Uncollected charges
   - Refunds processed

3. **Occupancy Report**:
   - Adjusted occupancy rate (excludes no-shows)
   - Potential occupancy (includes no-shows)

4. **Guest History Report**:
   - Guest's no-show history
   - Reliability score
   - Total charges paid/waived

**Report Query Example**:
```javascript
// Monthly no-show report
const monthlyReport = await Booking.aggregate([
  {
    $match: {
      status: 'no_show',
      noShowRecorded: {
        $gte: startOfMonth,
        $lte: endOfMonth
      }
    }
  },
  {
    $group: {
      _id: {
        hotel: '$hotelId',
        date: { $dateToString: { format: '%Y-%m-%d', date: '$noShowRecorded' } }
      },
      count: { $sum: 1 },
      totalCharges: { $sum: '$noShowChargeAmount' },
      totalPotentialRevenue: { $sum: '$totalAmount' }
    }
  },
  {
    $sort: { '_id.date': 1 }
  }
]);
```

### 10.5 Analytics Integration

**Metrics Tracked**:
1. No-show rate (%)
2. Average charge per no-show
3. Recovery rate (charges / potential revenue)
4. No-show patterns (by day, season, room type)
5. Guest no-show history
6. Financial impact

**Analytics Dashboard Widget**:
```javascript
// No-show KPI widget
const noShowKPI = {
  title: 'No-Show Analytics',
  period: 'Last 30 days',
  metrics: {
    totalNoShows: 12,
    noShowRate: '3.2%',        // 12 no-shows / 375 bookings
    chargesCollected: '$3,200',
    potentialRevenue: '$8,400',
    recoveryRate: '38.1%'      // $3,200 / $8,400
  },
  trend: {
    noShows: '+5% vs last month',
    charges: '+12% vs last month'
  }
};
```

**Predictive Analytics** (Future):
```javascript
// Predict no-show probability for booking
const noShowProbability = await predictNoShow({
  guestHistory: guest.noShowCount / guest.totalBookings,
  bookingLeadTime: daysBetween(bookingDate, checkInDate),
  roomRate: booking.totalAmount,
  seasonality: getSeason(booking.checkIn),
  channelSource: booking.source
});

// Example: 0.15 = 15% probability of no-show
if (noShowProbability > 0.20) {
  // Flag booking for confirmation call
  booking.requiresConfirmation = true;
}
```

---

## 11. Audit Trail

### 11.1 What Is Logged

Every no-show action creates multiple audit entries:

**When Marking as No-Show**:
```javascript
{
  action: 'mark_no_show',
  timestamp: '2025-10-18T10:30:00.000Z',
  user: {
    userId: '64abc123def456789',
    userName: 'John Smith',
    userRole: 'manager',
    email: 'john.smith@hotel.com'
  },
  booking: {
    bookingId: '64abc123def456789',
    bookingNumber: 'BK-2025-001234',
    guestName: 'Jane Doe',
    checkIn: '2025-10-18T15:00:00.000Z',
    totalAmount: 300.00
  },
  noShow: {
    reason: 'Guest did not arrive and did not contact hotel',
    chargeAmount: 100.00,
    previousStatus: 'confirmed',
    newStatus: 'no_show'
  },
  metadata: {
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0...',
    requestId: 'req_abc123'
  }
}
```

**Status History Entry**:
```javascript
statusHistory: [
  {
    status: 'no_show',
    timestamp: '2025-10-18T10:30:00.000Z',
    changedBy: {
      source: 'admin',
      userId: '64abc123def456789',
      userName: 'John Smith',
      channel: 'system'
    },
    reason: 'No-show marked with charge of 100. Reason: Guest did not arrive and did not contact hotel',
    automaticTransition: false,
    validatedTransition: true
  }
]
```

**Last Status Change**:
```javascript
lastStatusChange: {
  from: 'confirmed',
  to: 'no_show',
  timestamp: '2025-10-18T10:30:00.000Z',
  reason: 'Guest did not arrive and did not contact hotel'
}
```

### 11.2 Where to Find Logs

**Database Collections**:

1. **Booking Document** (`bookings` collection):
   - `noShowRecorded`: Timestamp
   - `noShowReason`: Text reason
   - `noShowMarkedBy`: User details
   - `noShowChargeAmount`: Charge applied
   - `statusHistory`: Complete timeline
   - `lastStatusChange`: Most recent change

2. **Audit Log Collection** (`auditlogs` collection):
   ```javascript
   {
     _id: ObjectId,
     entityType: 'booking',
     entityId: '64abc123def456789',
     action: 'mark_no_show',
     userId: '64abc123def456789',
     timestamp: ISODate,
     details: { ... },
     ipAddress: String,
     userAgent: String
   }
   ```

3. **Notification Log** (`notifications` collection):
   ```javascript
   {
     type: 'booking_no_show',
     bookingId: '64abc123def456789',
     recipientType: 'guest',
     recipientId: '64abc123def456789',
     sentAt: ISODate,
     status: 'delivered',
     metadata: { chargeAmount: 100 }
   }
   ```

**API Endpoints to Retrieve Logs**:

```bash
# Get booking audit trail
GET /api/v1/bookings/:bookingId/audit-trail

# Get user action history
GET /api/v1/audit/user/:userId?action=mark_no_show

# Get hotel no-show history
GET /api/v1/bookings/no-show/history?hotelId=xxx&startDate=xxx&endDate=xxx
```

**Admin Dashboard**:
- Navigate to: Admin → Audit Logs → Filter by "No-Show"
- View all no-show actions across properties
- Export to CSV/PDF

### 11.3 Report Generation

**No-Show Audit Report**:

```javascript
// Generate comprehensive audit report
const generateNoShowAuditReport = async (startDate, endDate, hotelId) => {
  const noShows = await Booking.find({
    status: 'no_show',
    noShowRecorded: { $gte: startDate, $lte: endDate },
    ...(hotelId && { hotelId })
  })
  .populate('hotelId userId noShowMarkedBy.userId')
  .sort({ noShowRecorded: -1 });

  return {
    reportPeriod: {
      start: startDate,
      end: endDate
    },
    summary: {
      totalNoShows: noShows.length,
      totalChargesApplied: noShows.reduce((sum, b) => sum + b.noShowChargeAmount, 0),
      totalPotentialRevenue: noShows.reduce((sum, b) => sum + b.totalAmount, 0),
      averageCharge: noShows.reduce((sum, b) => sum + b.noShowChargeAmount, 0) / noShows.length
    },
    details: noShows.map(booking => ({
      bookingNumber: booking.bookingNumber,
      guestName: booking.userId.name,
      hotelName: booking.hotelId.name,
      checkInDate: booking.checkIn,
      totalAmount: booking.totalAmount,
      chargeAmount: booking.noShowChargeAmount,
      reason: booking.noShowReason,
      markedBy: booking.noShowMarkedBy.userName,
      markedAt: booking.noShowRecorded
    })),
    chargeDistribution: {
      noCharge: noShows.filter(b => b.noShowChargeAmount === 0).length,
      partialCharge: noShows.filter(b => b.noShowChargeAmount > 0 && b.noShowChargeAmount < b.totalAmount).length,
      fullCharge: noShows.filter(b => b.noShowChargeAmount === b.totalAmount).length
    }
  };
};
```

**Example Report Output**:

```
NO-SHOW AUDIT REPORT
Period: January 1, 2025 - January 31, 2025
Hotel: Grand Plaza Hotel

SUMMARY
========
Total No-Shows: 15
Total Charges Applied: $3,850.00
Total Potential Revenue: $9,200.00
Average Charge: $256.67
Recovery Rate: 41.8%

CHARGE DISTRIBUTION
===================
No Charge (0%):     5 bookings (33%)
Partial Charge:     6 bookings (40%)
Full Charge (100%): 4 bookings (27%)

DETAILS
=======
| Booking # | Guest | Check-In | Amount | Charge | Marked By | Date |
|-----------|-------|----------|--------|--------|-----------|------|
| BK-001234 | Jane Doe | Jan 15 | $300 | $150 | J. Smith | Jan 15 |
| BK-001235 | John Doe | Jan 18 | $500 | $500 | M. Jones | Jan 18 |
...

STAFF ACTIONS
=============
John Smith (Manager): 8 no-shows marked
Mary Jones (Admin): 4 no-shows marked
Bob Wilson (Staff): 3 no-shows marked

Generated: February 1, 2025 10:00 AM
By: Admin User
```

### 11.4 Compliance

**Data Retention**:
- No-show records retained for: 7 years (financial compliance)
- Audit logs retained for: 7 years
- Personal data (guest names, emails): Subject to GDPR/CCPA

**GDPR Compliance**:
- Guest right to access: Provide all no-show records
- Guest right to rectification: Correct errors in records
- Guest right to erasure: Anonymize personal data after retention period
- Guest right to portability: Export no-show history

**Financial Compliance**:
- Sarbanes-Oxley (SOX): Complete audit trail
- PCI DSS: No credit card data in no-show records
- Tax Reporting: No-show charges included in revenue reports
- Internal Audit: Quarterly review of no-show charges

**Compliance Queries**:

```javascript
// GDPR: Export guest's no-show history
const exportGuestNoShowData = async (guestId) => {
  const noShows = await Booking.find({
    userId: guestId,
    status: 'no_show'
  }).select('bookingNumber checkIn checkOut totalAmount noShowRecorded noShowReason noShowChargeAmount');

  return {
    guestId,
    exportDate: new Date(),
    noShowHistory: noShows,
    totalNoShows: noShows.length,
    totalChargesPaid: noShows.reduce((sum, b) => sum + b.noShowChargeAmount, 0)
  };
};

// Financial Audit: No-show revenue by period
const auditNoShowRevenue = async (fiscalYear) => {
  return await Booking.aggregate([
    {
      $match: {
        status: 'no_show',
        noShowRecorded: {
          $gte: new Date(`${fiscalYear}-01-01`),
          $lte: new Date(`${fiscalYear}-12-31`)
        }
      }
    },
    {
      $group: {
        _id: { $month: '$noShowRecorded' },
        count: { $sum: 1 },
        totalCharges: { $sum: '$noShowChargeAmount' }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};
```

---

## 12. Troubleshooting

### 12.1 Common Issues

#### Issue 1: Cannot Mark as No-Show - Grace Period Error

**Error Message**:
```
Cannot mark as no-show yet. Grace period ends at 10/18/2025, 9:00:00 PM
```

**Cause**: Check-in time + 6 hours has not passed yet

**Solution**:
1. Check current time vs. grace period end time
2. Wait until grace period expires
3. If urgent, contact manager to adjust grace period setting

**Workaround** (Admin only):
```javascript
// Temporarily reduce grace period (requires admin access)
// Not recommended for production
const gracePeriodHours = 0; // Override to 0 hours
```

---

#### Issue 2: Button Disabled / "Mark as No-Show" Not Available

**Symptoms**:
- "Mark as No-Show" option grayed out
- Menu item not visible

**Possible Causes & Solutions**:

**Cause A**: Insufficient Permissions
- Check your role (must be Admin, Staff, or Manager)
- Contact admin to update your permissions

**Cause B**: Booking Status Invalid
- Current status must be "confirmed" or "pending"
- Check booking status badge
- If "checked_in" or "checked_out", cannot mark as no-show

**Cause C**: Already Marked as No-Show
- Check if status is already "No-Show" (red badge)
- Look for no-show details in booking view

---

#### Issue 3: Charge Amount Not Saving

**Symptoms**:
- Enter charge amount
- Submit form
- Charge shows as $0 in database

**Possible Causes & Solutions**:

**Cause A**: Validation Error
```javascript
// Check browser console for errors
// Common: chargeAmount > booking.totalAmount
```
- Ensure charge ≤ booking total
- Check for decimal format issues

**Cause B**: Frontend/Backend Mismatch
- Clear browser cache
- Hard refresh (Ctrl+Shift+R)
- Check network tab for 400 errors

**Cause C**: Database Issue
```javascript
// Verify in MongoDB
db.bookings.findOne(
  { bookingNumber: 'BK-2025-001234' },
  { noShowChargeAmount: 1, noShowChargeApplied: 1 }
)
```

**Fix**:
```javascript
// Manual database update (admin only)
db.bookings.updateOne(
  { bookingNumber: 'BK-2025-001234' },
  {
    $set: {
      noShowChargeAmount: 100,
      noShowChargeApplied: true
    }
  }
)
```

---

#### Issue 4: Guest Not Receiving Notification

**Symptoms**:
- Booking marked as no-show successfully
- Guest doesn't receive email notification

**Debugging Steps**:

1. **Check Notification Log**:
```bash
# API request
GET /api/v1/notifications/booking/:bookingId

# Look for:
{
  type: 'booking_no_show',
  status: 'delivered' | 'failed' | 'pending'
}
```

2. **Verify Guest Email**:
```javascript
// Check booking.userId.email exists and is valid
db.bookings.findOne(
  { _id: ObjectId('...') }
).userId.email
```

3. **Check Email Service Status**:
- Verify SMTP server is running
- Check email service logs
- Test with manual email send

4. **Check Spam Folder**:
- Ask guest to check spam/junk folder
- Whitelist hotel email domain

**Common Causes**:
- Invalid email address in guest profile
- Email service downtime
- Email marked as spam
- Notification automation service error

**Solution**:
```javascript
// Manually resend notification (admin only)
await NotificationAutomationService.handleBookingStatusChange(
  booking,
  'no_show',
  'confirmed',
  { triggeredBy: admin, resend: true }
);
```

---

#### Issue 5: "403 Forbidden" When Trying to Reverse No-Show

**Error Message**:
```json
{
  "success": false,
  "message": "You do not have permission to reverse no-show status",
  "statusCode": 403
}
```

**Cause**: User role is not Admin or Manager

**Solution**:
- Only Admin and Manager can reverse no-shows
- Staff cannot reverse (security policy)
- Contact your manager or admin to reverse
- If you should have manager role, contact admin to update permissions

**Verification**:
```javascript
// Check your role
GET /api/v1/auth/me

// Response should show:
{
  role: 'admin' or 'manager'  // Required for reversal
}
```

---

#### Issue 6: Statistics Not Updating

**Symptoms**:
- Mark booking as no-show
- Statistics page shows old data

**Cause**: Query cache not invalidated

**Solution**:

1. **Frontend**: Hard refresh page (Ctrl+Shift+R)

2. **Backend**: Clear query cache
```javascript
// Admin endpoint to clear cache
POST /api/v1/cache/clear
{
  "keys": ["no-show-stats"]
}
```

3. **Database**: Verify data
```javascript
// Direct database query
db.bookings.count({ status: 'no_show' })
```

**Prevention**:
```javascript
// Ensure query invalidation in mutation
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['no-show-stats'] });
}
```

---

### 12.2 Error Messages

| Error Code | Message | Meaning | Solution |
|------------|---------|---------|----------|
| 400 | "Booking is already marked as no-show" | Duplicate action | Check booking status, already no-show |
| 400 | "Cannot mark booking as no-show. Current status: checked_in" | Invalid status | Booking already checked in, cannot mark |
| 400 | "Cannot mark as no-show yet. Grace period ends at..." | Too early | Wait until grace period expires |
| 400 | "Reason is required" | Validation error | Enter reason in form |
| 400 | "Charge amount cannot be negative" | Validation error | Enter non-negative amount |
| 400 | "Charge amount cannot exceed booking total" | Validation error | Reduce charge to ≤ booking total |
| 403 | "You do not have permission to mark bookings as no-show" | Permission error | Login as Admin/Staff/Manager |
| 403 | "You do not have permission to reverse no-show status" | Permission error | Login as Admin/Manager |
| 404 | "Booking not found" | Invalid ID | Check booking ID, may be deleted |
| 500 | "Internal server error" | Server error | Contact support, check logs |

---

### 12.3 Solutions

**Quick Fixes**:

1. **Clear Browser Cache**:
   - Windows: Ctrl + Shift + Delete
   - Mac: Cmd + Shift + Delete
   - Select "Cached images and files"
   - Clear and refresh

2. **Check Token Expiration**:
```javascript
// If getting 401 errors
localStorage.removeItem('token');
// Login again
```

3. **Verify Booking Details**:
```bash
# API request
curl -X GET \
  'https://api.yourhotel.com/api/v1/bookings/:bookingId' \
  -H 'Authorization: Bearer token'

# Check response for:
# - status
# - checkIn date
# - totalAmount
```

4. **Test with Different Booking**:
- Try marking a different booking as no-show
- Isolates issue to specific booking vs. system-wide

5. **Check Backend Logs**:
```bash
# View server logs
tail -f backend/logs/error.log

# Look for:
# - API errors
# - Database connection issues
# - Validation failures
```

---

### 12.4 Support Escalation

**Level 1: Self-Service**
- Check this documentation
- Review error message
- Try common solutions above

**Level 2: Team Lead / Manager**
- Cannot resolve with documentation
- Permission issues
- Policy questions

**Level 3: IT Support**
- System errors (500 status codes)
- Database issues
- Integration failures
- Performance problems

**Level 4: Development Team**
- Bug reports
- Feature requests
- Code errors
- Security issues

**How to Report Issue**:

1. **Gather Information**:
   - What you were trying to do
   - Steps you took
   - Error message (exact text or screenshot)
   - Booking number
   - Your username and role
   - Timestamp of issue

2. **Create Support Ticket**:
```
Subject: No-Show System - [Brief Description]

Details:
- Booking Number: BK-2025-001234
- Action: Mark as no-show
- Error: "Cannot mark as no-show yet. Grace period ends at..."
- Timestamp: 2025-10-18 14:30:00
- User: John Smith (Manager)
- Browser: Chrome 120.0
- Screenshot: [attached]

Steps to Reproduce:
1. Login as manager
2. Navigate to Admin Bookings
3. Click menu on BK-2025-001234
4. Select "Mark as No-Show"
5. Error appears

Expected Behavior:
Should be able to mark as no-show (check-in was 8 hours ago)

Actual Behavior:
Error message about grace period
```

3. **Include Logs** (if available):
```javascript
// Browser console logs
// Network tab requests
// API response body
```

**Support Channels**:
- Email: support@yourhotel.com
- Internal Chat: #hotel-system-support
- Phone: ext. 1234 (urgent issues only)
- Ticket System: https://support.yourhotel.com

---

## 13. Production Checklist

### 13.1 Pre-Deployment Checks

**Code Review**:
- [ ] All endpoints tested (mark, reverse, stats)
- [ ] Frontend component validated
- [ ] Form validation working correctly
- [ ] Permission checks in place
- [ ] Error handling comprehensive
- [ ] No console.log statements in production code

**Database**:
- [ ] MongoDB indexes created for no-show queries
  ```javascript
  db.bookings.createIndex({ status: 1, noShowRecorded: -1 })
  db.bookings.createIndex({ hotelId: 1, status: 1, noShowRecorded: -1 })
  ```
- [ ] Schema validation rules active
- [ ] Backup strategy in place
- [ ] Migration scripts tested (if applicable)

**Security**:
- [ ] Authentication required on all endpoints
- [ ] Authorization checks working (role-based)
- [ ] Property access validation active
- [ ] Input sanitization in place
- [ ] SQL injection prevention (N/A for MongoDB)
- [ ] XSS protection enabled
- [ ] CSRF protection enabled
- [ ] Rate limiting configured

**Performance**:
- [ ] Query performance tested with large datasets
- [ ] Pagination implemented for statistics
- [ ] Caching strategy defined
- [ ] Database query optimization
- [ ] Frontend bundle size acceptable
- [ ] Lazy loading components

**Integrations**:
- [ ] Email service configured and tested
- [ ] Notification automation working
- [ ] Payment system integration (if implemented)
- [ ] Analytics tracking active
- [ ] Logging system operational

**Documentation**:
- [ ] API documentation complete (Swagger)
- [ ] Internal documentation updated
- [ ] Staff training materials prepared
- [ ] User guide created
- [ ] Troubleshooting guide available

---

### 13.2 Post-Deployment Validation

**Smoke Tests** (immediately after deployment):

1. **Test Mark as No-Show**:
```bash
# Create test booking
POST /api/v1/bookings (create test booking)

# Mark as no-show
POST /api/v1/bookings/:id/no-show
{
  "reason": "Post-deployment test",
  "chargeAmount": 50
}

# Expected: 200 success
```

2. **Test Statistics**:
```bash
GET /api/v1/bookings/no-show/stats

# Expected: Returns data including test booking
```

3. **Test Reverse**:
```bash
PUT /api/v1/bookings/:id/reverse-no-show
{
  "reason": "Post-deployment test reversal",
  "newStatus": "confirmed"
}

# Expected: 200 success
```

4. **Test Permissions**:
```bash
# Login as staff → mark no-show → Expected: 200
# Login as staff → reverse no-show → Expected: 403
# Login as manager → reverse no-show → Expected: 200
# Login as guest → mark no-show → Expected: 403
```

5. **Test Validation**:
```bash
# Empty reason → Expected: 400
# Negative charge → Expected: 400
# Charge > total → Expected: 400
```

**Functional Tests**:
- [ ] Staff can mark bookings as no-show
- [ ] Managers can view statistics
- [ ] Admins can reverse no-shows
- [ ] Guests receive email notifications
- [ ] Staff receive internal notifications
- [ ] Status history updated correctly
- [ ] Audit logs created
- [ ] Charge amounts recorded accurately

**Data Validation**:
```bash
# Check database records
db.bookings.findOne({ status: 'no_show' })

# Verify fields populated:
# - noShowRecorded
# - noShowReason
# - noShowMarkedBy
# - noShowChargeAmount
# - statusHistory contains entry
```

**Notification Verification**:
- [ ] Guest email sent and received
- [ ] Staff notification appears in dashboard
- [ ] Email content correct (booking details, charge amount)
- [ ] No spam flagging

---

### 13.3 Monitoring Setup

**Application Monitoring**:

1. **Error Tracking** (e.g., Sentry):
```javascript
Sentry.init({
  dsn: 'your-sentry-dsn',
  environment: 'production',
  beforeSend(event) {
    // Filter no-show related errors
    if (event.tags?.feature === 'no-show') {
      // Add custom context
      event.contexts.noShow = {
        bookingId: event.extra?.bookingId,
        chargeAmount: event.extra?.chargeAmount
      };
    }
    return event;
  }
});
```

2. **Performance Monitoring** (e.g., New Relic):
```javascript
// Track no-show endpoint performance
newrelic.addCustomAttributes({
  feature: 'no-show',
  endpoint: '/bookings/:id/no-show',
  method: 'POST'
});
```

3. **Logging**:
```javascript
// Winston logger configuration
logger.info('No-show marked', {
  feature: 'no-show',
  action: 'mark',
  bookingId: booking._id,
  userId: user._id,
  chargeAmount: chargeAmount,
  timestamp: new Date()
});
```

**Database Monitoring**:
```javascript
// Slow query alerts
db.setProfilingLevel(1, { slowms: 100 });

// Monitor indexes
db.bookings.stats()

// Watch for:
// - Slow queries on no-show status filtering
// - Missing index warnings
// - High memory usage
```

**Business Metrics**:
```javascript
// Custom metrics to track
{
  noShowsPerDay: Number,
  averageChargeAmount: Number,
  recoveryRate: Percentage,
  reversalRate: Percentage,  // How often no-shows are reversed
  staffUsage: {              // Which staff marking most no-shows
    userId: Number,
    count: Number
  }
}
```

**Alerts to Configure**:

1. **High No-Show Rate**:
```javascript
if (dailyNoShowRate > 10%) {
  alert('CRITICAL: No-show rate exceeds 10%');
}
```

2. **Low Recovery Rate**:
```javascript
if (recoveryRate < 30%) {
  alert('WARNING: No-show charge recovery below 30%');
}
```

3. **High Reversal Rate**:
```javascript
if (reversalRate > 20%) {
  alert('WARNING: 20%+ of no-shows being reversed - review marking process');
}
```

4. **Error Rate**:
```javascript
if (noShowErrorRate > 5%) {
  alert('ERROR: No-show endpoint error rate > 5%');
}
```

5. **Notification Failures**:
```javascript
if (emailFailureRate > 10%) {
  alert('WARNING: Email notification failure rate > 10%');
}
```

**Dashboards to Create**:

1. **Operations Dashboard**:
   - Daily no-show count
   - Charges collected
   - Recovery rate trend
   - Staff action breakdown

2. **Performance Dashboard**:
   - API response times
   - Database query performance
   - Error rates
   - Uptime

3. **Business Intelligence Dashboard**:
   - No-show patterns by day of week
   - Seasonal trends
   - Room type analysis
   - Guest segment analysis

---

### 13.4 KPIs to Track

**Operational KPIs**:

1. **No-Show Rate**:
```javascript
noShowRate = (totalNoShows / totalBookings) * 100
// Target: < 5%
// Alert if: > 10%
```

2. **Recovery Rate**:
```javascript
recoveryRate = (totalChargesCollected / totalPotentialRevenue) * 100
// Target: > 40%
// Alert if: < 30%
```

3. **Average Charge Amount**:
```javascript
averageCharge = totalChargesCollected / totalNoShows
// Target: 50% of average booking value
// Alert if: < 30% or > 80%
```

4. **Time to Mark**:
```javascript
timeToMark = averageTimeBetween(gracePeriodEnd, noShowRecorded)
// Target: < 2 hours after grace period
// Alert if: > 12 hours
```

5. **Reversal Rate**:
```javascript
reversalRate = (totalReversals / totalNoShows) * 100
// Target: < 5%
// Alert if: > 15%
```

**Financial KPIs**:

1. **No-Show Revenue**:
```javascript
monthlyNoShowRevenue = sum(noShowChargeAmount for month)
// Track monthly
// Compare to budget
```

2. **Revenue Lost to No-Shows**:
```javascript
revenueLost = totalPotentialRevenue - totalChargesCollected
// Track monthly
// Analyze trends
```

3. **Collection Rate**:
```javascript
collectionRate = (chargesCollected / chargesApplied) * 100
// Target: > 95%
// Alert if: < 90%
```

**Quality KPIs**:

1. **Reason Quality Score**:
```javascript
// Manual review: Are reasons detailed enough?
// Score: 1-5 scale
// Target: Average > 4.0
```

2. **Notification Delivery Rate**:
```javascript
deliveryRate = (notificationsDelivered / notificationsSent) * 100
// Target: > 98%
// Alert if: < 95%
```

3. **Error Rate**:
```javascript
errorRate = (failedNoShowAttempts / totalAttempts) * 100
// Target: < 1%
// Alert if: > 3%
```

**User Experience KPIs**:

1. **Time to Complete**:
```javascript
// Average time from opening modal to successful submission
// Target: < 2 minutes
// Alert if: > 5 minutes (suggests UI issues)
```

2. **Staff Adoption Rate**:
```javascript
adoptionRate = (staffUsingFeature / totalEligibleStaff) * 100
// Target: > 90% within 30 days of launch
```

**Reporting Schedule**:

- **Daily**: No-show count, charges collected
- **Weekly**: Recovery rate, staff usage, error rate
- **Monthly**: All KPIs, trends, business analysis
- **Quarterly**: ROI analysis, policy review, training effectiveness

---

## Summary

This production-ready documentation covers all aspects of the No-Show System:

✅ **Overview**: Business benefits and use cases
✅ **Features**: Complete feature list with permissions
✅ **Technical Implementation**: API endpoints, data models, frontend components
✅ **User Workflows**: Step-by-step guides with decision trees
✅ **Charge Integration**: Payment processing and settlement
✅ **UI/UX Guide**: Design principles, accessibility
✅ **Testing Scenarios**: 8 comprehensive test cases
✅ **Staff Training**: When/how to use, common scenarios, best practices
✅ **Business Rules**: Status rules, charge limits, grace periods
✅ **Integration Points**: Booking, payment, checkout, reporting systems
✅ **Audit Trail**: What's logged, where to find it, compliance
✅ **Troubleshooting**: Common issues, error messages, solutions
✅ **Production Checklist**: Pre/post-deployment validation, monitoring, KPIs

**Key Highlights**:
- 3 API endpoints: mark, reverse, stats
- 6-hour grace period before marking
- Role-based permissions (Admin, Manager, Staff)
- Flexible charging: $0 to 100% of booking
- Complete audit trail with status history
- Notification automation (guest + staff)
- Reversal capability (Admin/Manager only)
- Multi-property support
- Comprehensive error handling
- Production monitoring and KPIs

**File Location**:
`C:\Users\Mukul raj\Downloads\project-bolt-sb1-vhvvuqkj\project\.claude\context\NO_SHOW_SYSTEM_PRODUCTION_READY.md`
