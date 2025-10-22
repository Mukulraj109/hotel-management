# 🏨 Front Desk Dashboard Implementation Plan

**Project:** Hotel Management System - Front Desk Role & Approval System
**Status:** 📋 Planning Complete
**Created:** October 19, 2025

---

## 🎯 **Overview**

Create a new **Front Desk** role with limited permissions and an **approval mechanism** for sensitive operations (price changes, room type management). Front desk staff can request changes, and admins can approve/reject them.

---

## 📊 **Requirements Summary**

### **1. New Role: `frontdesk`**
- Add to User model role enum
- Create dedicated dashboard layout
- Reuse existing admin pages with permission restrictions

### **2. Front Desk Dashboard Pages** (with restrictions)

| Page | Restrictions | Approval Required |
|------|-------------|-------------------|
| **Rooms** | View only, no create/edit/delete | N/A |
| **TapeChart** | Show only one section (simplified view) | N/A |
| **Room Type Management** | No add/delete buttons, price changes need approval | ✅ Price changes |
| **Bookings** | Hide total revenue section | N/A |
| **Upcoming Arrivals** | Full access | N/A |
| **Corporate Management** | Only corporate-management and group booking sections | N/A |
| **Travel Agent** | Full access | N/A |
| **Staff Management** | Full access | N/A |
| **Billing & Payment** | Full access | N/A |
| **Booking Engine** | Full access | N/A |
| **Housekeeping** | Full access | N/A |
| **Daily Check Management** | Full access | N/A |
| **Maintenance** | Full access | N/A |
| **Guest Service** | Full access | N/A |
| **Service Request** | Full access | N/A |
| **Inventory Request** | Full access | N/A |
| **Hotel Service** | Full access | N/A |
| **Meet Up Management** | Full access | N/A |
| **Supply** | Full access | N/A |
| **Inventory** | Full access | N/A |
| **Checkout** | Full access | N/A |
| **Inventory Automation** | Full access | N/A |

### **3. Approval System**

**Approval Types:**
- Room type price changes
- Room rate adjustments
- (Extensible for future: discount approvals, refunds, etc.)

**Workflow:**
1. Front desk initiates action (e.g., change room type price)
2. System creates approval request (status: pending)
3. Notification sent to admins
4. Admin reviews request
5. Admin approves or rejects with reason
6. If approved, change is applied
7. Front desk notified of decision

---

## 📁 **Implementation Phases**

### ✅ **Phase 1: Backend - Role & Permissions** [PRIORITY: HIGH]

**Tasks:**
1. ✅ Add `frontdesk` to User model role enum
2. ✅ Create approval request model (`ApprovalRequest`)
3. ✅ Create role permission middleware
4. ✅ Create approval routes and controllers
5. ✅ Add frontdesk access to existing routes with restrictions

**Files to Modify:**
- `backend/src/models/User.js` - Add 'frontdesk' role
- `backend/src/models/ApprovalRequest.js` - NEW
- `backend/src/middleware/rolePermissions.js` - NEW
- `backend/src/routes/approvals.js` - NEW
- `backend/src/controllers/approvalController.js` - NEW
- All existing route files - Add frontdesk permissions

---

### ✅ **Phase 2: Backend - Approval System** [PRIORITY: HIGH]

**ApprovalRequest Model:**
```javascript
{
  requestedBy: ObjectId (User),
  requestType: String (enum: 'price_change', 'rate_adjustment', ...),
  targetResource: String (e.g., 'room_type', 'booking'),
  targetResourceId: ObjectId,
  requestData: Object (original and proposed changes),
  status: String (enum: 'pending', 'approved', 'rejected'),
  reviewedBy: ObjectId (User),
  reviewedAt: Date,
  reviewNotes: String,
  hotelId: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

**API Endpoints:**
- `POST /api/v1/approvals` - Create approval request
- `GET /api/v1/approvals` - List approval requests (filtered by role)
- `GET /api/v1/approvals/:id` - Get single request
- `PUT /api/v1/approvals/:id/approve` - Approve request
- `PUT /api/v1/approvals/:id/reject` - Reject request
- `DELETE /api/v1/approvals/:id` - Cancel pending request

---

### ✅ **Phase 3: Frontend - Front Desk Layout** [PRIORITY: HIGH]

**Tasks:**
1. ✅ Create FrontDeskLayout component
2. ✅ Create FrontDeskSidebar component (subset of admin menu items)
3. ✅ Create FrontDeskHeader component
4. ✅ Add front desk routes to App.tsx
5. ✅ Create permission-based UI components

**Files to Create:**
- `frontend/src/layouts/FrontDeskLayout.tsx` - NEW
- `frontend/src/layouts/components/FrontDeskSidebar.tsx` - NEW
- `frontend/src/layouts/components/FrontDeskHeader.tsx` - NEW

**Files to Modify:**
- `frontend/src/App.tsx` - Add frontdesk routes

---

### ✅ **Phase 4: Frontend - Permission-Based UI** [PRIORITY: MEDIUM]

**Create Reusable Components:**
1. ✅ `<RoleGate>` - Show/hide based on role
2. ✅ `<PermissionButton>` - Button with permission check
3. ✅ `<ApprovalBadge>` - Show "Pending Approval" status

**Hook:**
- `usePermissions()` - Check if user can perform action

**Files to Create:**
- `frontend/src/components/permissions/RoleGate.tsx` - NEW
- `frontend/src/components/permissions/PermissionButton.tsx` - NEW
- `frontend/src/components/approvals/ApprovalBadge.tsx` - NEW
- `frontend/src/hooks/usePermissions.ts` - NEW

---

### ✅ **Phase 5: Frontend - Approval Request UI** [PRIORITY: MEDIUM]

**For Front Desk:**
1. ✅ Price change modal with approval request flow
2. ✅ "Request Approval" button in Room Type Management
3. ✅ My Approval Requests page (view status)

**Files to Create:**
- `frontend/src/components/approvals/PriceChangeRequestModal.tsx` - NEW
- `frontend/src/pages/frontdesk/MyApprovalRequests.tsx` - NEW

**Files to Modify:**
- `frontend/src/pages/admin/AdminRoomTypes.tsx` - Add approval flow for frontdesk

---

### ✅ **Phase 6: Frontend - Admin Approval Management** [PRIORITY: MEDIUM]

**For Admins:**
1. ✅ Approval Requests Dashboard
2. ✅ Approve/Reject modal
3. ✅ Notification badge for pending approvals

**Files to Create:**
- `frontend/src/pages/admin/ApprovalManagement.tsx` - NEW
- `frontend/src/components/approvals/ApprovalReviewModal.tsx` - NEW
- `frontend/src/components/approvals/ApprovalRequestCard.tsx` - NEW

**Files to Modify:**
- `frontend/src/layouts/components/AdminSidebar.tsx` - Add "Approval Requests" menu item
- `frontend/src/layouts/components/AdminHeader.tsx` - Add notification badge

---

### ✅ **Phase 7: Page Modifications for Front Desk** [PRIORITY: LOW]

**Modify Existing Pages:**

1. **AdminRoomTypes.tsx**
   - Hide "Add Room Type" button for frontdesk
   - Replace price edit with "Request Price Change"

2. **AdminTapeChart.tsx**
   - Show simplified view for frontdesk (one section only)

3. **AdminBookings.tsx**
   - Hide total revenue section for frontdesk

4. **AdminCorporateDashboard.tsx**
   - Show only corporate-management and group booking sections

**Pattern for all pages:**
```tsx
import { useAuth } from '@/context/AuthContext';

const { user } = useAuth();
const isFrontDesk = user?.role === 'frontdesk';

// Conditionally render based on role
{!isFrontDesk && <TotalRevenueCard />}
{isFrontDesk && <RequestApprovalButton />}
```

---

### ✅ **Phase 8: Testing** [PRIORITY: HIGH]

**Test Cases:**

1. **Role Creation**
   - ✅ Create user with frontdesk role
   - ✅ Verify frontdesk can login
   - ✅ Verify frontdesk sees correct dashboard

2. **Permission Enforcement**
   - ✅ Verify frontdesk cannot access admin-only pages
   - ✅ Verify frontdesk cannot perform restricted actions

3. **Approval Workflow**
   - ✅ Create price change request as frontdesk
   - ✅ Verify admin sees request in dashboard
   - ✅ Approve request and verify change applied
   - ✅ Reject request and verify change not applied

4. **UI Restrictions**
   - ✅ Verify revenue hidden in bookings
   - ✅ Verify TapeChart shows simplified view
   - ✅ Verify Room Type Management restrictions

---

## 🛠️ **Technical Architecture**

### **Role Hierarchy**

```
Admin (highest)
  ├── Full system access
  ├── Can approve/reject requests
  └── Can manage all resources

Front Desk
  ├── Limited operational access
  ├── Can request approvals
  └── Can view most resources

Manager
  ├── Property-level access
  └── Can approve some requests (future)

Staff
  ├── Operational access
  └── Cannot request approvals

Guest (lowest)
  └── Self-service access only
```

### **Permission Matrix**

| Action | Admin | Front Desk | Manager | Staff | Guest |
|--------|-------|------------|---------|-------|-------|
| View Rooms | ✅ | ✅ | ✅ | ✅ | ❌ |
| Edit Rooms | ✅ | ❌ | ✅ | ❌ | ❌ |
| View Bookings | ✅ | ✅ | ✅ | ✅ | Own only |
| View Revenue | ✅ | ❌ | ✅ | ❌ | ❌ |
| Change Prices | ✅ | Request Approval | ✅ | ❌ | ❌ |
| Approve Requests | ✅ | ❌ | Partial | ❌ | ❌ |

---

## 🔄 **Approval Workflow Diagram**

```
Front Desk User
      |
      ↓
[Clicks "Change Price"]
      |
      ↓
[Opens Price Change Modal]
      |
      ↓
[Enters new price + reason]
      |
      ↓
[Submits for Approval]
      |
      ↓
POST /api/v1/approvals
      |
      ↓
[Creates ApprovalRequest]
  (status: pending)
      |
      ↓
[Notification to Admins]
      |
      ↓
Admin Dashboard
[Sees Pending Request Badge]
      |
      ↓
[Opens Approval Management]
      |
      ↓
[Reviews Request Details]
      |
      ↓
    /   \
   /     \
Approve  Reject
   |       |
   ↓       ↓
Apply   Notify
Change  Front Desk
   |       |
   ↓       ↓
Notify  Request
Front   Closed
Desk
```

---

## 📝 **Implementation Checklist**

### **Backend Tasks**

- [ ] **Phase 1.1**: Add 'frontdesk' to User model
- [ ] **Phase 1.2**: Create ApprovalRequest model
- [ ] **Phase 1.3**: Create role permissions middleware
- [ ] **Phase 1.4**: Create approval routes
- [ ] **Phase 1.5**: Create approval controller
- [ ] **Phase 1.6**: Add frontdesk permissions to existing routes

### **Frontend Tasks**

- [ ] **Phase 3.1**: Create FrontDeskLayout
- [ ] **Phase 3.2**: Create FrontDeskSidebar
- [ ] **Phase 3.3**: Create FrontDeskHeader
- [ ] **Phase 3.4**: Add frontdesk routes to App.tsx
- [ ] **Phase 4.1**: Create RoleGate component
- [ ] **Phase 4.2**: Create PermissionButton component
- [ ] **Phase 4.3**: Create usePermissions hook
- [ ] **Phase 5.1**: Create PriceChangeRequestModal
- [ ] **Phase 5.2**: Create MyApprovalRequests page
- [ ] **Phase 6.1**: Create ApprovalManagement page
- [ ] **Phase 6.2**: Create ApprovalReviewModal
- [ ] **Phase 6.3**: Add notification badge to AdminHeader
- [ ] **Phase 7.1**: Modify AdminRoomTypes for frontdesk
- [ ] **Phase 7.2**: Modify AdminTapeChart for frontdesk
- [ ] **Phase 7.3**: Modify AdminBookings for frontdesk
- [ ] **Phase 7.4**: Modify AdminCorporateDashboard for frontdesk

### **Testing Tasks**

- [ ] **Phase 8.1**: Test frontdesk role creation
- [ ] **Phase 8.2**: Test permission enforcement
- [ ] **Phase 8.3**: Test approval workflow
- [ ] **Phase 8.4**: Test UI restrictions

---

## 🚀 **Parallel Execution Plan**

**Team A (Backend):**
1. Phase 1: Role & Permissions (2 hours)
2. Phase 2: Approval System (3 hours)
3. Testing backend APIs (1 hour)

**Team B (Frontend - Layout):**
1. Phase 3: Front Desk Layout (2 hours)
2. Phase 4: Permission Components (2 hours)

**Team C (Frontend - Approvals):**
1. Phase 5: Front Desk Approval UI (2 hours)
2. Phase 6: Admin Approval UI (2 hours)

**Team D (Frontend - Page Mods):**
1. Phase 7: Modify existing pages (3 hours)

**Total Estimated Time:** 6-8 hours (with parallel execution)

---

## 📦 **Deliverables**

1. ✅ New `frontdesk` role in database
2. ✅ ApprovalRequest model and API endpoints
3. ✅ Front Desk dashboard with restricted pages
4. ✅ Approval request workflow (UI + API)
5. ✅ Admin approval management interface
6. ✅ Permission-based UI components
7. ✅ Modified admin pages with frontdesk restrictions
8. ✅ Complete test coverage
9. ✅ Documentation (this file)

---

## 🎯 **Success Criteria**

- [ ] Front desk user can login and see their dashboard
- [ ] Front desk can view but not modify room types
- [ ] Front desk can request price changes
- [ ] Admin receives notification of pending requests
- [ ] Admin can approve/reject requests
- [ ] Approved changes are applied automatically
- [ ] Front desk sees only authorized pages
- [ ] Revenue data is hidden from front desk
- [ ] TapeChart shows simplified view for front desk
- [ ] All tests pass

---

## 🔐 **Security Considerations**

1. **Permission Middleware**: All backend routes must check role
2. **Frontend Guards**: React Router guards for role-based routing
3. **API Validation**: Validate role permissions on every request
4. **Approval Security**: Only admins can approve/reject
5. **Audit Trail**: Log all approval actions

---

## 📚 **Future Enhancements**

1. **Manager Approvals**: Allow managers to approve certain requests
2. **Approval Templates**: Predefined approval workflows
3. **Bulk Approvals**: Approve multiple requests at once
4. **Email Notifications**: Send emails for approval requests
5. **Approval History**: View all historical approval decisions
6. **Delegated Approvals**: Assign approval rights to specific users
7. **Approval Limits**: Set price change limits that don't need approval

---

**Status:** Ready for implementation
**Next Step:** Begin Phase 1 - Backend Role & Permissions

---

**Created by:** Claude Code
**Date:** October 19, 2025
**Version:** 1.0
