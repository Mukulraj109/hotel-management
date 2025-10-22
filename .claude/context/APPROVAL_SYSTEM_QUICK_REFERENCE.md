# Approval System UI - Quick Reference Guide

## Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    APPROVAL SYSTEM UI                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  [ApprovalService] ←→ Backend API                           │
│         ↓                                                    │
│  ┌──────────────────┬──────────────────────────────────┐    │
│  │   FRONTDESK      │          ADMIN                   │    │
│  ├──────────────────┼──────────────────────────────────┤    │
│  │                  │                                  │    │
│  │ MyApprovalRequests│ ApprovalManagement             │    │
│  │  - View Requests │  - Review All Requests         │    │
│  │  - Cancel Pending│  - Approve/Reject              │    │
│  │  - Track Status  │  - View Statistics             │    │
│  │                  │                                  │    │
│  └──────────────────┴──────────────────────────────────┘    │
│         ↓                        ↓                           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │            SHARED COMPONENTS                        │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │ • ApprovalBadge                                    │    │
│  │ • ApprovalRequestCard                              │    │
│  │ • PriceChangeRequestModal                          │    │
│  │ • ApprovalReviewModal                              │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. ApprovalService

```typescript
// Import
import approvalService from '@/services/approvalService';

// Create Request
const request = await approvalService.createApprovalRequest({
  requestType: 'price_change',
  targetResource: { type: 'room_type', id: '123', name: 'Deluxe Suite' },
  currentData: { basePrice: 150 },
  requestedData: { basePrice: 175 },
  reason: 'Summer season pricing adjustment...'
});

// Get My Requests
const myRequests = await approvalService.getMyApprovalRequests({
  status: 'pending'
});

// Get All Requests (Admin)
const allRequests = await approvalService.getAllApprovalRequests({
  status: 'pending',
  requestType: 'price_change'
});

// Approve
await approvalService.approveRequest('requestId', 'Optional notes');

// Reject
await approvalService.rejectRequest('requestId', 'Required reason');

// Cancel
await approvalService.cancelRequest('requestId');

// Get Stats
const stats = await approvalService.getApprovalStats();
// Returns: { pending: 5, approved: 20, rejected: 3 }
```

---

## 2. ApprovalBadge

```tsx
import ApprovalBadge from '@/components/approvals/ApprovalBadge';

// Usage
<ApprovalBadge status="pending" />        // ⏳ Pending Approval
<ApprovalBadge status="approved" />       // ✓ Approved
<ApprovalBadge status="rejected" />       // ✗ Rejected
<ApprovalBadge status="cancelled" />      // ○ Cancelled

// With Size
<ApprovalBadge status="pending" size="sm" />
<ApprovalBadge status="pending" size="md" />
<ApprovalBadge status="pending" size="lg" />
```

**Visual Output:**
```
┌──────────────────┐
│ ⏳ Pending Approval│  (Yellow background)
└──────────────────┘

┌──────────┐
│ ✓ Approved│  (Green background)
└──────────┘

┌──────────┐
│ ✗ Rejected│  (Red background)
└──────────┘

┌──────────┐
│ ○ Cancelled│  (Gray background)
└──────────┘
```

---

## 3. PriceChangeRequestModal

```tsx
import PriceChangeRequestModal from '@/components/approvals/PriceChangeRequestModal';

const [isOpen, setIsOpen] = useState(false);
const roomType = { _id: '123', name: 'Deluxe Suite', basePrice: 150 };

<PriceChangeRequestModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onSuccess={() => {
    console.log('Request submitted!');
    setIsOpen(false);
  }}
  roomType={roomType}
/>
```

**Modal Layout:**
```
┌───────────────────────────────────────┐
│  Request Price Change            [X]  │
├───────────────────────────────────────┤
│                                       │
│  📘 Deluxe Suite                      │
│  Requesting approval to change price  │
│                                       │
│  Current Price                        │
│  ┌─────────────────────────────────┐ │
│  │ $150.00                         │ │
│  └─────────────────────────────────┘ │
│                                       │
│  Requested Price *                    │
│  ┌─────────────────────────────────┐ │
│  │ $ 175.00                        │ │
│  └─────────────────────────────────┘ │
│                                       │
│  ┌─────────────────────────────────┐ │
│  │ Price Change: +$25.00 (+16.7%)  │ │ (Green)
│  └─────────────────────────────────┘ │
│                                       │
│  Reason for Change *                  │
│  ┌─────────────────────────────────┐ │
│  │ Summer season pricing...        │ │
│  │                                 │ │
│  └─────────────────────────────────┘ │
│  20/20 characters minimum             │
│                                       │
│  ℹ️ Approval Required                 │
│  This request will be reviewed...     │
│                                       │
│  [Cancel] [Submit Request]            │
└───────────────────────────────────────┘
```

---

## 4. ApprovalRequestCard

```tsx
import ApprovalRequestCard from '@/components/approvals/ApprovalRequestCard';

const request = {
  _id: '123',
  requestType: 'price_change',
  targetResource: { type: 'room_type', id: '456', name: 'Deluxe Suite' },
  currentData: { basePrice: 150 },
  requestedData: { basePrice: 175 },
  reason: 'Summer season pricing adjustment...',
  status: 'pending',
  requestedBy: { name: 'John Doe', email: 'john@hotel.com' },
  createdAt: '2025-01-15T10:00:00Z'
};

// Basic Display
<ApprovalRequestCard request={request} />

// With Actions
<ApprovalRequestCard
  request={request}
  showActions={true}
  onReview={(req) => console.log('Review', req)}
  onCancel={(req) => console.log('Cancel', req)}
/>
```

**Card Layout:**
```
┌────────────────────────────────────────────┐
│ Price Change  [⏳ Pending Approval]        │
│ Target: Deluxe Suite                       │
├────────────────────────────────────────────┤
│                                            │
│ Requested Changes                          │
│ Current Price:      $150.00                │
│ Requested Price:    $175.00                │
│ ─────────────────────────────────────────  │
│ Change: +$25.00 (+16.7%)                  │
│                                            │
│ Reason                                     │
│ ┌────────────────────────────────────────┐│
│ │ Summer season pricing adjustment...    ││
│ └────────────────────────────────────────┘│
│                                            │
│ Requested By        Submitted              │
│ John Doe           Jan 15, 2025, 10:00 AM │
│ john@hotel.com                             │
├────────────────────────────────────────────┤
│ [Review Request]  [Cancel]                 │
└────────────────────────────────────────────┘
```

---

## 5. ApprovalReviewModal

```tsx
import ApprovalReviewModal from '@/components/approvals/ApprovalReviewModal';

const [isOpen, setIsOpen] = useState(false);
const [selectedRequest, setSelectedRequest] = useState(null);

<ApprovalReviewModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onSuccess={() => {
    console.log('Review completed!');
    setIsOpen(false);
  }}
  approvalRequest={selectedRequest}
/>
```

**Modal Workflow:**

**Step 1 - Initial View:**
```
┌────────────────────────────────────────┐
│ Review Approval Request           [X]  │
├────────────────────────────────────────┤
│                                        │
│ 📘 Price Change [⏳ Pending Approval]  │
│ Target: Deluxe Suite                   │
│                                        │
│ Requested By        Submitted          │
│ John Doe           Jan 15, 10:00 AM    │
│                                        │
│ Requested Changes                      │
│ ┌────────────────────────────────────┐ │
│ │ Current:    $150.00                │ │
│ │      ↓                             │ │
│ │ Requested:  $175.00                │ │
│ │ ───────────────────────────────    │ │
│ │ Change: +$25.00 (+16.7%)          │ │
│ └────────────────────────────────────┘ │
│                                        │
│ Reason                                 │
│ ⚠️ Summer season pricing adjustment... │
│                                        │
│ Select Action:                         │
│ [✓ Approve Request] [✗ Reject Request] │
└────────────────────────────────────────┘
```

**Step 2 - After Selecting Approve:**
```
┌────────────────────────────────────────┐
│ Review Approval Request           [X]  │
├────────────────────────────────────────┤
│                                        │
│ ✓ Approving this request              │ (Green bg)
│                                        │
│ Notes (Optional)                       │
│ ┌────────────────────────────────────┐ │
│ │ Approved for summer season...      │ │
│ │                                    │ │
│ └────────────────────────────────────┘ │
│                                        │
│ [Back] [Confirm Approval]              │
└────────────────────────────────────────┘
```

**Step 3 - After Selecting Reject:**
```
┌────────────────────────────────────────┐
│ Review Approval Request           [X]  │
├────────────────────────────────────────┤
│                                        │
│ ✗ Rejecting this request              │ (Red bg)
│                                        │
│ Rejection Reason *                     │
│ ┌────────────────────────────────────┐ │
│ │ Price increase not justified...    │ │
│ │                                    │ │
│ └────────────────────────────────────┘ │
│ 30/20 characters minimum               │
│                                        │
│ [Back] [Confirm Rejection]             │
└────────────────────────────────────────┘
```

---

## 6. MyApprovalRequests Page

```tsx
import MyApprovalRequests from '@/pages/frontdesk/MyApprovalRequests';

// Route
<Route path="/frontdesk/approval-requests" element={<MyApprovalRequests />} />

// Navigation
<Link to="/frontdesk/approval-requests">My Requests</Link>
```

**Page Layout:**
```
┌──────────────────────────────────────────────────────┐
│ My Approval Requests                                 │
│ Track and manage your approval requests              │
├─────────────┬─────────────┬─────────────┬───────────┤
│ 📋 Total    │ ⏳ Pending  │ ✓ Approved  │ ✗ Rejected│
│    12       │     3       │     7       │     2     │
├──────────────────────────────────────────────────────┤
│ Filter: [All(12)] [Pending(3)] [Approved(7)] ...    │
├──────────────────────────────────────────────────────┤
│                                                      │
│ ┌──────────────────────────────────────────────────┐│
│ │ [ApprovalRequestCard - Pending Request]          ││
│ └──────────────────────────────────────────────────┘│
│                                                      │
│ ┌──────────────────────────────────────────────────┐│
│ │ [ApprovalRequestCard - Pending Request]          ││
│ └──────────────────────────────────────────────────┘│
│                                                      │
│ ┌──────────────────────────────────────────────────┐│
│ │ [ApprovalRequestCard - Approved Request]         ││
│ └──────────────────────────────────────────────────┘│
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## 7. ApprovalManagement Page (Admin)

```tsx
import ApprovalManagement from '@/pages/admin/ApprovalManagement';

// Route
<Route path="/admin/approvals" element={<ApprovalManagement />} />

// Navigation with Badge
const { data: count } = useQuery({
  queryKey: ['pendingApprovals'],
  queryFn: approvalService.getPendingCount
});

<Link to="/admin/approvals">
  Approvals {count > 0 && <Badge>{count}</Badge>}
</Link>
```

**Page Layout:**
```
┌────────────────────────────────────────────────────────────┐
│ Approval Management                                        │
│ Review and manage approval requests from staff members     │
├──────────────────┬──────────────────┬─────────────────────┤
│ ⏳ Pending Review│ ✓ Approved (30d) │ ✗ Rejected (30d)    │
│      5          │       20         │        3            │
│ (Yellow gradient) (Green gradient)  (Red gradient)        │
├────────────────────────────────────────────────────────────┤
│ Filter by Status:                                          │
│ [All] [Pending] [Approved] [Rejected]                     │
│                                                            │
│ Filter by Request Type:                                    │
│ [All Types] [Price Change] [Booking Mod] [Refund] ...     │
├────────────────────────────────────────────────────────────┤
│ ⚠️ 5 requests pending review                               │
│ These requests require immediate attention                 │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ ┌────────────────────────────────────────────────────────┐│
│ │ Request  │Target│Req. By│Submitted│Status│Rev. By│Action│
│ ├──────────────────────────────────────────────────────────│
│ │Price Chng│Deluxe│John   │Jan 15   │⏳    │   -   │Review││ (Yellow bg)
│ │Price Chng│Suite │Jane   │Jan 14   │⏳    │   -   │Review││ (Yellow bg)
│ │Refund    │Bkg123│Mike   │Jan 13   │✓     │Admin  │View  ││
│ │Discount  │Bkg456│Sarah  │Jan 12   │✗     │Admin  │View  ││
│ └────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────┘
```

---

## Integration Examples

### 1. Room Type Management - Add Request Button

```tsx
import { useState } from 'react';
import PriceChangeRequestModal from '@/components/approvals/PriceChangeRequestModal';

function RoomTypeManagement() {
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [selectedRoomType, setSelectedRoomType] = useState(null);

  return (
    <div>
      {/* Room Type List */}
      {roomTypes.map(roomType => (
        <div key={roomType._id}>
          <h3>{roomType.name}</h3>
          <p>Current Price: ${roomType.basePrice}</p>

          <button onClick={() => {
            setSelectedRoomType(roomType);
            setRequestModalOpen(true);
          }}>
            Request Price Change
          </button>
        </div>
      ))}

      {/* Request Modal */}
      {selectedRoomType && (
        <PriceChangeRequestModal
          isOpen={requestModalOpen}
          onClose={() => setRequestModalOpen(false)}
          onSuccess={() => {
            toast.success('Price change request submitted!');
            setRequestModalOpen(false);
          }}
          roomType={selectedRoomType}
        />
      )}
    </div>
  );
}
```

### 2. Admin Header - Pending Badge

```tsx
import { useQuery } from '@tanstack/react-query';
import approvalService from '@/services/approvalService';

function AdminHeader() {
  const { data: pendingCount } = useQuery({
    queryKey: ['pendingApprovals'],
    queryFn: approvalService.getPendingCount,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  return (
    <nav>
      <Link to="/admin/approvals">
        Approvals
        {pendingCount > 0 && (
          <span className="badge">{pendingCount}</span>
        )}
      </Link>
    </nav>
  );
}
```

### 3. Notification System

```tsx
import { useQuery } from '@tanstack/react-query';
import approvalService from '@/services/approvalService';

function NotificationBell() {
  const { data: pendingCount } = useQuery({
    queryKey: ['pendingApprovals'],
    queryFn: approvalService.getPendingCount,
    refetchInterval: 30000
  });

  return (
    <div className="notification-bell">
      🔔
      {pendingCount > 0 && (
        <span className="notification-badge">{pendingCount}</span>
      )}
    </div>
  );
}
```

---

## User Flows

### Flow 1: Frontdesk Staff Requests Price Change

```
1. Staff → Room Type Management
2. Click "Request Price Change" on a room type
3. PriceChangeRequestModal opens
4. Enter new price: $175
5. Enter reason: "Summer season pricing..."
6. Click "Submit Request"
7. Toast: "Price change request submitted for approval"
8. Modal closes
9. Staff → My Approval Requests
10. See request with "Pending Approval" badge
```

### Flow 2: Admin Reviews and Approves

```
1. Admin → Approval Management
2. See pending badge: "5 requests pending"
3. See yellow alert: "5 requests pending review"
4. Click "Review" on a pending request
5. ApprovalReviewModal opens
6. Review details: $150 → $175 (+$25)
7. Click "Approve Request"
8. Add optional notes
9. Click "Confirm Approval"
10. Toast: "Request approved successfully"
11. Table updates, request removed from pending
12. Backend applies the price change
```

### Flow 3: Admin Reviews and Rejects

```
1. Admin → Approval Management
2. Click "Review" on a pending request
3. ApprovalReviewModal opens
4. Click "Reject Request"
5. Enter rejection reason (min 20 chars)
6. Click "Confirm Rejection"
7. Toast: "Request rejected"
8. Table updates
9. Staff sees rejection in My Approval Requests
10. Staff can see rejection reason
```

---

## Status Lifecycle

```
┌─────────┐
│ PENDING │ ────────┐
└─────────┘         │
     │              │
     │ Review       │ Cancel
     │              │ (Staff)
     ▼              │
┌─────────┐         │         ┌──────────┐
│APPROVED │         └────────>│CANCELLED │
└─────────┘                   └──────────┘
     │
     │ Review
     │
     ▼
┌─────────┐
│REJECTED │
└─────────┘
```

---

## Color Scheme Reference

```
Status Colors:
- Pending:   Yellow (#FEF3C7 bg, #92400E text)
- Approved:  Green  (#D1FAE5 bg, #065F46 text)
- Rejected:  Red    (#FEE2E2 bg, #991B1B text)
- Cancelled: Gray   (#F3F4F6 bg, #1F2937 text)

Action Colors:
- Primary (Approve):  Blue   (#2563EB)
- Success (Approved): Green  (#059669)
- Danger (Reject):    Red    (#DC2626)
- Neutral (Cancel):   Gray   (#6B7280)
```

---

## Quick Testing Checklist

### Manual Testing
- [ ] Submit price change request
- [ ] View request in "My Requests"
- [ ] Filter requests by status
- [ ] Cancel pending request
- [ ] Admin: See pending count badge
- [ ] Admin: Open review modal
- [ ] Admin: Approve a request
- [ ] Admin: Reject a request
- [ ] Verify toast notifications
- [ ] Check responsive design
- [ ] Test validation errors
- [ ] Test empty states
- [ ] Test loading states

### Edge Cases
- [ ] Submit with price = current price (should fail)
- [ ] Submit with reason < 20 chars (should fail)
- [ ] Reject without reason (should fail)
- [ ] Reject with reason < 20 chars (should fail)
- [ ] Multiple simultaneous requests
- [ ] Request after another pending
- [ ] Cancel already reviewed request (should fail)

---

## Troubleshooting

### Issue: "Failed to submit request"
**Check:**
- Backend `/api/v1/approvals` endpoint is running
- User is authenticated
- User has permission to create requests
- All required fields are provided

### Issue: "Failed to load requests"
**Check:**
- Backend endpoints are accessible
- User has proper role (admin for all requests)
- Network connection
- Query keys are correct

### Issue: Badge not updating
**Check:**
- `refetchInterval` is set (30000ms recommended)
- Query key is correct: `['pendingApprovals']`
- Backend endpoint returns correct count
- React Query DevTools for debugging

### Issue: Modal not closing after submit
**Check:**
- `onSuccess` callback is called
- `handleClose()` is executed
- `isOpen` state is updated
- No JavaScript errors in console

---

## Complete! 🎉

All components are created and ready to use. Follow the integration examples above to add them to your application.
