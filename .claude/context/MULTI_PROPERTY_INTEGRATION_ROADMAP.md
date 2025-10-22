# 🎯 MULTI-PROPERTY SYSTEM - COMPREHENSIVE PRODUCTION INTEGRATION ROADMAP

**Version:** 2.0
**Date:** 2025-01-27
**Status:** Ready for Implementation
**Estimated Timeline:** 6-8 Weeks

---

## 📋 TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [Critical Findings](#critical-findings)
3. [Complete Backend Analysis](#complete-backend-analysis)
4. [Complete Frontend Analysis](#complete-frontend-analysis)
5. [Phase-by-Phase Implementation Plan](#phase-by-phase-implementation-plan)
6. [Success Criteria](#success-criteria)
7. [Testing Strategy](#testing-strategy)

---

## 📊 EXECUTIVE SUMMARY

### **The Problem**
The Multi-Property Manager exists as an **isolated feature** with ZERO integration to the rest of the application. While the feature itself is 95% complete, the entire application architecture needs fundamental changes to support multi-property management.

### **Current State**
```
✅ Multi-Property Manager: 95% complete (standalone)
❌ Property Context: Does NOT exist
❌ Property Selector: Missing from UI
❌ 87 Admin Pages: NOT property-aware
❌ Backend Endpoints: 96+ routes, only ~40% support hotelId filtering
❌ Integration: ZERO connection between features
```

### **Target State**
```
✅ Global Property Context
✅ Property Selector in Header
✅ 87 Admin Pages: ALL property-aware
✅ Backend Endpoints: 100% support hotelId/portfolio filtering
✅ Seamless Multi-Property Manager Integration
✅ Portfolio View + Single Property View
```

---

## 🔴 CRITICAL FINDINGS

### **Frontend Issues**

| Issue | Current State | Impact | Priority |
|-------|--------------|--------|----------|
| **No Property Context** | Each page has its own `selectedHotelId` state | Data inconsistency, no persistence | CRITICAL |
| **Hardcoded Property IDs** | `'68c7ab1242a357d06adbb2aa'` everywhere | Only works for 1 hotel | CRITICAL |
| **No Property Selector** | Missing from header/navbar | Users can't switch properties | CRITICAL |
| **87 Admin Pages** | Not property-aware | Show data from ALL properties mixed | HIGH |
| **No Portfolio View** | Can't see aggregated metrics | Multi-property users confused | HIGH |
| **No Breadcrumbs** | Can't tell which property they're viewing | Poor UX | MEDIUM |

### **Backend Issues**

| Issue | Current State | Impact | Priority |
|-------|--------------|--------|----------|
| **Inconsistent Filtering** | Only ~40% of endpoints filter by hotelId | Data leakage across properties | CRITICAL |
| **No Owner Filtering** | Some endpoints show ALL hotels | Security issue | CRITICAL |
| **No Portfolio Endpoints** | Can't get aggregated data | Multi-property analytics broken | HIGH |
| **No Permission Checks** | Property group permissions not enforced | Security issue | HIGH |

---

## 🔍 COMPLETE BACKEND ANALYSIS

### **Backend Structure Overview**

```
backend/src/
├── models/
│   ├── PropertyGroup.js      ✅ COMPLETE - Multi-property management
│   ├── Hotel.js               ✅ COMPLETE - Property model with grouping
│   ├── User.js                ⚠️ NEEDS UPDATE - Multi-property users
│   ├── Booking.js             ✅ HAS hotelId field
│   ├── Room.js                ✅ HAS hotelId field
│   └── [87+ other models]     ⚠️ VARIES - Need hotelId audit
├── controllers/
│   ├── propertyGroupController.js  ✅ COMPLETE
│   └── [100+ other controllers]    ⚠️ NEEDS AUDIT
└── routes/
    ├── propertyGroups.js       ✅ COMPLETE - All endpoints ready
    ├── admin.js                ⚠️ PARTIAL - Has hotelId filtering
    └── [96+ other route files] ⚠️ NEEDS AUDIT
```

### **Backend Endpoints Status**

#### **✅ WORKING CORRECTLY (Property-Aware)**

| Endpoint | Filter Support | Owner Check | Status |
|----------|---------------|-------------|--------|
| `GET /admin/hotels` | ✅ Yes | ✅ Yes (via ownerId) | READY |
| `GET /admin/bookings?hotelId={id}` | ✅ Yes | ✅ Yes | READY |
| `GET /property-groups` | ✅ Yes | ✅ Yes | READY |
| `GET /property-groups/:id/dashboard` | ✅ Yes | ✅ Yes | READY |
| `POST /property-groups/:id/sync` | ✅ Yes | ✅ Yes | READY |

#### **⚠️ NEEDS UPDATE (Missing hotelId Filter)**

| Endpoint | Current Behavior | Required Change | Priority |
|----------|------------------|-----------------|----------|
| `GET /rooms` | Returns ALL rooms | Add `?hotelId={id}` filter | CRITICAL |
| `GET /guests` | Returns ALL guests | Add `?hotelId={id}` filter | HIGH |
| `GET /staff` | Returns ALL staff | Add `?hotelId={id}` filter | HIGH |
| `GET /inventory` | Returns ALL inventory | Add `?hotelId={id}` filter | HIGH |
| `GET /housekeeping` | Returns ALL tasks | Add `?hotelId={id}` filter | HIGH |
| `GET /pos/orders` | Returns ALL orders | Add `?hotelId={id}` filter | MEDIUM |
| `GET /financial/reports` | Returns ALL reports | Add `?hotelId={id}` filter | HIGH |

**Estimated**: 60+ endpoints need updates

#### **❌ MISSING (New Endpoints Needed)**

| Endpoint | Purpose | Priority |
|----------|---------|----------|
| `GET /portfolio/metrics` | Aggregated KPIs across all properties | HIGH |
| `GET /portfolio/dashboard` | Portfolio overview dashboard | HIGH |
| `GET /portfolio/bookings` | All bookings across properties | MEDIUM |
| `GET /portfolio/revenue` | Consolidated revenue report | MEDIUM |
| `GET /portfolio/occupancy` | Aggregated occupancy data | MEDIUM |

### **Database Schema Updates Required**

#### **User Model Updates**
```javascript
// Current
{
  hotelId: ObjectId,  // Single property reference
  role: String
}

// REQUIRED
{
  hotelId: ObjectId,        // Primary property (backward compatible)
  properties: [ObjectId],   // ✅ NEW - Array of owned properties
  primaryProperty: ObjectId, // ✅ NEW - Default selected property
  role: String,

  // Multi-property permissions
  multiPropertyAccess: {    // ✅ NEW
    enabled: Boolean,
    allowedProperties: [ObjectId],
    restrictions: {
      canCreateProperties: Boolean,
      canDeleteProperties: Boolean,
      canManageGroups: Boolean
    }
  }
}
```

**Migration Strategy**: Add new fields with defaults, maintain backward compatibility

#### **Hotel Model** (Already Complete! ✅)
```javascript
{
  propertyGroupId: ObjectId,  // ✅ Already exists
  groupSettings: {            // ✅ Already exists
    inheritSettings: Boolean,
    lastSyncAt: Date,
    overrides: Mixed
  },
  hierarchy: {                // ✅ Already exists
    level: Enum,
    parentId: ObjectId,
    path: String
  }
}
```

### **Backend Implementation Tasks**

#### **Task 1: Audit ALL Endpoints (Week 1)**
```bash
# Script to identify endpoints needing updates
grep -r "router.get" backend/src/routes/ | grep -v "hotelId"
grep -r "router.post" backend/src/routes/ | grep -v "hotelId"
```

**Output**: List of 96+ route files
**Action**: For each route, add hotelId filtering

#### **Task 2: Update Controller Pattern (Week 1-2)**
```javascript
// ❌ BEFORE
export const getBookings = async (req, res) => {
  const bookings = await Booking.find({});  // Gets ALL bookings
  res.json({ data: bookings });
};

// ✅ AFTER
export const getBookings = async (req, res) => {
  const { hotelId } = req.query;

  // Build query
  const query = {};
  if (hotelId) {
    query.hotelId = hotelId;
  } else if (req.user.properties && req.user.properties.length > 0) {
    // If no hotelId specified, only show user's properties
    query.hotelId = { $in: req.user.properties };
  }

  const bookings = await Booking.find(query);
  res.json({ data: bookings });
};
```

#### **Task 3: Create Portfolio Endpoints (Week 2)**

**File**: `backend/src/routes/portfolio.js` (NEW)
```javascript
import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import Hotel from '../models/Hotel.js';
import Booking from '../models/Booking.js';
import Room from '../models/Room.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize(['admin', 'manager']));

/**
 * GET /portfolio/metrics
 * Get aggregated metrics across all user's properties
 */
router.get('/metrics', async (req, res) => {
  try {
    // Get all properties owned by user
    const properties = await Hotel.find({
      ownerId: req.user._id,
      isActive: true
    });

    const propertyIds = properties.map(p => p._id);

    // Aggregate metrics
    const [
      totalRooms,
      totalBookings,
      totalRevenue,
      avgOccupancy
    ] = await Promise.all([
      Room.countDocuments({ hotelId: { $in: propertyIds } }),

      Booking.countDocuments({
        hotelId: { $in: propertyIds },
        status: { $in: ['confirmed', 'checked_in', 'checked_out'] }
      }),

      Booking.aggregate([
        {
          $match: {
            hotelId: { $in: propertyIds },
            paymentStatus: 'paid'
          }
        },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),

      // Calculate average occupancy
      calculatePortfolioOccupancy(propertyIds)
    ]);

    res.json({
      success: true,
      data: {
        totalProperties: properties.length,
        totalRooms,
        totalBookings,
        totalRevenue: totalRevenue[0]?.total || 0,
        avgOccupancy,
        properties: properties.map(p => ({
          id: p._id,
          name: p.name,
          city: p.address.city,
          roomCount: 0 // Will be populated
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch portfolio metrics',
      error: error.message
    });
  }
});

/**
 * GET /portfolio/dashboard
 * Get consolidated dashboard for all properties
 */
router.get('/dashboard', async (req, res) => {
  const { period = '30d' } = req.query;

  // Implementation similar to property-groups/:id/dashboard
  // but for ALL user's properties

  // ... (similar to propertyGroupController.js getConsolidatedDashboard)
});

/**
 * GET /portfolio/revenue
 * Get revenue breakdown across properties
 */
router.get('/revenue', async (req, res) => {
  const { startDate, endDate } = req.query;

  const properties = await Hotel.find({
    ownerId: req.user._id
  });

  const propertyIds = properties.map(p => p._id);

  const revenueByProperty = await Booking.aggregate([
    {
      $match: {
        hotelId: { $in: propertyIds },
        paymentStatus: 'paid',
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      }
    },
    {
      $group: {
        _id: '$hotelId',
        revenue: { $sum: '$totalAmount' },
        bookings: { $sum: 1 }
      }
    },
    {
      $lookup: {
        from: 'hotels',
        localField: '_id',
        foreignField: '_id',
        as: 'hotel'
      }
    }
  ]);

  res.json({ success: true, data: revenueByProperty });
});

// Helper function
async function calculatePortfolioOccupancy(propertyIds) {
  const today = new Date();

  const [totalRooms, occupiedRooms] = await Promise.all([
    Room.countDocuments({ hotelId: { $in: propertyIds } }),
    Booking.countDocuments({
      hotelId: { $in: propertyIds },
      checkIn: { $lte: today },
      checkOut: { $gt: today },
      status: { $in: ['confirmed', 'checked_in'] }
    })
  ]);

  return totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;
}

export default router;
```

**Register Route** in `backend/src/app.js`:
```javascript
import portfolioRoutes from './routes/portfolio.js';

app.use('/api/v1/portfolio', portfolioRoutes);
```

#### **Task 4: Add Owner Filtering Middleware (Week 2)**

**File**: `backend/src/middleware/propertyAccess.js` (NEW)
```javascript
/**
 * Middleware to ensure users can only access their own properties
 */
export const ensurePropertyAccess = async (req, res, next) => {
  try {
    const { hotelId } = req.query;

    if (!hotelId) {
      // No hotelId specified, allow (will be filtered in controller)
      return next();
    }

    // Check if user owns this property
    const property = await Hotel.findOne({
      _id: hotelId,
      ownerId: req.user._id
    });

    if (!property) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not own this property.'
      });
    }

    // Attach property to request for use in controller
    req.property = property;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to check property group access
 */
export const ensureGroupAccess = async (req, res, next) => {
  try {
    const { id } = req.params;

    const group = await PropertyGroup.findOne({
      _id: id,
      ownerId: req.user._id
    });

    if (!group) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not own this property group.'
      });
    }

    req.propertyGroup = group;
    next();
  } catch (error) {
    next(error);
  }
};
```

**Usage**:
```javascript
import { ensurePropertyAccess } from '../middleware/propertyAccess.js';

router.get('/bookings',
  authenticate,
  ensurePropertyAccess,  // ✅ Add this
  getBookings
);
```

---

## 🎨 COMPLETE FRONTEND ANALYSIS

### **Frontend Structure Overview**

```
frontend/src/
├── context/
│   ├── AuthContext.tsx          ✅ EXISTS
│   └── PropertyContext.tsx      ❌ MISSING - CRITICAL
├── components/
│   ├── common/
│   │   └── PropertySelector.tsx ❌ MISSING - CRITICAL
│   ├── multi-property/
│   │   ├── MultiPropertyManager.tsx     ✅ COMPLETE
│   │   ├── AddPropertyModal.tsx         ✅ COMPLETE
│   │   ├── EditPropertyModal.tsx        ✅ COMPLETE
│   │   ├── AddGroupModal.tsx            ✅ COMPLETE
│   │   ├── EditGroupModal.tsx           ✅ COMPLETE
│   │   └── ExportModal.tsx              ✅ COMPLETE
│   └── dashboard/
│       └── PortfolioDashboard.tsx       ❌ MISSING - HIGH
├── layouts/
│   ├── AdminLayout.tsx          ⚠️ NEEDS UPDATE - Add PropertyProvider
│   └── components/
│       └── AdminHeader.tsx      ⚠️ NEEDS UPDATE - Add PropertySelector
└── pages/admin/
    ├── AdminDashboard.tsx       ⚠️ NEEDS UPDATE - Use PropertyContext
    ├── AdminBookings.tsx        ⚠️ NEEDS UPDATE - Use PropertyContext
    ├── AdminRooms.tsx           ⚠️ NEEDS UPDATE - Use PropertyContext
    └── [84 more admin pages]    ⚠️ NEEDS UPDATE - Use PropertyContext
```

### **87 Admin Pages Categorization**

#### **Category 1: CRITICAL - Data Pages (25 pages)**
Must filter by selected property immediately:

| # | Page | Current hotelId Usage | Update Required | Priority |
|---|------|----------------------|-----------------|----------|
| 1 | AdminDashboard.tsx | Hardcoded `'68c7ab...'` | Use `useProperty()` hook | CRITICAL |
| 2 | AdminBookings.tsx | Filter bar dropdown | Use `useProperty()` hook | CRITICAL |
| 3 | AdminRooms.tsx | Hardcoded | Use `useProperty()` hook | CRITICAL |
| 4 | AdminUpcomingBookings.tsx | Hardcoded | Use `useProperty()` hook | CRITICAL |
| 5 | AdminGuestList.tsx | Not filtering | Use `useProperty()` hook | CRITICAL |
| 6 | AdminTapeChart.tsx | Hardcoded | Use `useProperty()` hook | CRITICAL |
| 7 | AdminFinancial.tsx | Not filtering | Use `useProperty()` hook | HIGH |
| 8 | AdminReports.tsx | Not filtering | Use `useProperty()` hook | HIGH |
| 9 | AdminRevenueManagement.tsx | Not filtering | Use `useProperty()` hook | HIGH |
| 10 | AdminStaffManagement.tsx | Filter by hotelId | Use `useProperty()` hook | HIGH |
| 11 | AdminInventory.tsx | Not filtering | Use `useProperty()` hook | HIGH |
| 12 | AdminInventoryManagement.tsx | Not filtering | Use `useProperty()` hook | HIGH |
| 13 | AdminHousekeeping.tsx | Not filtering | Use `useProperty()` hook | HIGH |
| 14 | AdminServiceRequests.tsx | Not filtering | Use `useProperty()` hook | HIGH |
| 15 | AdminPOS.tsx | Not filtering | Use `useProperty()` hook | MEDIUM |
| 16 | AdminMeetUpManagement.tsx | Not filtering | Use `useProperty()` hook | MEDIUM |
| 17 | AdminLaundryManagement.tsx | Not filtering | Use `useProperty()` hook | MEDIUM |
| 18 | AdminSupplyRequests.tsx | Not filtering | Use `useProperty()` hook | MEDIUM |
| 19 | AdminCheckoutInventoryManagement.tsx | Not filtering | Use `useProperty()` hook | MEDIUM |
| 20 | AdminInventoryRequests.tsx | Not filtering | Use `useProperty()` hook | MEDIUM |
| 21 | AdminPurchaseOrders.tsx | Not filtering | Use `useProperty()` hook | MEDIUM |
| 22 | AdminVendorManagement.tsx | Not filtering | Use `useProperty()` hook | MEDIUM |
| 23 | AdminDailyCheckManagement.tsx | Not filtering | Use `useProperty()` hook | MEDIUM |
| 24 | AdminMaintenance.tsx | Not filtering | Use `useProperty()` hook | MEDIUM |
| 25 | AdminDigitalKeyManagement.tsx | Not filtering | Use `useProperty()` hook | MEDIUM |

#### **Category 2: MEDIUM - Settings Pages (30 pages)**
Property-specific OR group-level settings:

| # | Page | Update Strategy | Priority |
|---|------|----------------|----------|
| 26 | AdminRoomTypes.tsx | Property-specific + "Apply to Group" button | MEDIUM |
| 27 | AdminRoomTaxes.tsx | Property-specific + inheritance | MEDIUM |
| 28 | AdminSeasonalPricing.tsx | Property-specific + inheritance | MEDIUM |
| 29 | AdminCustomFields.tsx | Property-specific + group-level | MEDIUM |
| 30 | AdminPaymentMethods.tsx | Property-specific + group-level | MEDIUM |
| 31 | AdminReasons.tsx | Property-specific + group-level | MEDIUM |
| 32 | AdminSalutations.tsx | Property-specific + group-level | MEDIUM |
| 33 | AdminVIP.tsx | Property-specific | MEDIUM |
| 34 | AdminBlacklist.tsx | Property-specific + shared option | MEDIUM |
| 35 | AdminDepartments.tsx | Property-specific | MEDIUM |
| 36 | AdminHotelAreas.tsx | Property-specific | MEDIUM |
| 37 | AdminPhoneExtensions.tsx | Property-specific | MEDIUM |
| 38 | AdminMeasurementUnits.tsx | Global or property-specific | LOW |
| 39 | AdminPOSAttributes.tsx | Property-specific | MEDIUM |
| 40 | AdminPOSTaxes.tsx | Property-specific + inheritance | MEDIUM |
| 41 | AdminRevenueAccounts.tsx | Property-specific + group-level | MEDIUM |
| 42 | AdminHotelServices.tsx | Property-specific | MEDIUM |
| 43 | AdminOfferManagement.tsx | Property-specific + group campaigns | MEDIUM |
| 44 | AdminDayUseManagement.tsx | Property-specific | MEDIUM |
| 45 | AdminRoomBlocks.tsx | Property-specific | MEDIUM |
| 46 | AdminRoomAllotmentCreate.tsx | Property-specific | MEDIUM |
| 47 | AdminRoomTypeAllotments.tsx | Property-specific | MEDIUM |
| 48 | AdminRoomPricing.tsx | Property-specific + group rates | MEDIUM |
| 49 | AdminWebSettings.tsx | Property-specific + group branding | MEDIUM |
| 50 | AdminWebOptimization.tsx | Property-specific | LOW |
| 51 | AdminBookingFormBuilder.tsx | Property-specific + templates | MEDIUM |
| 52 | AdminBookingEngine.tsx | Property-specific + group config | MEDIUM |
| 53 | AdminAutomation.tsx | Property-specific + group rules | MEDIUM |
| 54 | AdminNotifications.tsx | Property-specific + group templates | MEDIUM |
| 55 | AdminSettings.tsx | Property-specific + system-wide | MEDIUM |

#### **Category 3: LOW - Global Pages (32 pages)**
These remain global (no property filter):

| # | Page | Reason | Priority |
|---|------|--------|----------|
| 56 | AdminUserManagement.tsx | Global user management | N/A |
| 57 | AdminLogin.tsx | Login page | N/A |
| 58 | AdminMultiProperty.tsx | Portfolio view (shows ALL) | N/A |
| 59 | AdminAPIManagement.tsx | System-wide API settings | N/A |
| 60 | AdminAdvancedFeatures.tsx | System features | N/A |
| 61 | AdminMobileApps.tsx | Global app settings | N/A |
| 62 | AdminOTA.tsx | OTA integrations (can be per-property or global) | LOW |
| 63 | AdminCentralizedRates.tsx | Multi-property rate management | N/A |
| 64 | AdminLoginActivity.tsx | Security logs | N/A |
| 65 | AdminUserAnalytics.tsx | User behavior analytics | N/A |
| 66 | AdminSecurityDashboard.tsx | Security monitoring | N/A |
| 67 | AdminFinancialAnalytics.tsx | Can be portfolio or property-specific | MEDIUM |
| 68 | AdminBypassApprovals.tsx | Approval workflows | MEDIUM |
| 69 | AdminBypassCheckout.tsx | System override | LOW |
| 70 | AdminReviewsManagement.tsx | Reviews (property-specific) | MEDIUM |
| 71 | AdminCorporateDashboard.tsx | Corporate bookings | MEDIUM |
| 72 | AdminTravelDashboard.tsx | Travel agent management | LOW |
| 73 | AdminDocumentVerification.tsx | Document processing | LOW |
| 74 | AdminDocumentAnalytics.tsx | Document analytics | LOW |
| 75-87 | [Other system/global pages] | Various system settings | LOW |

### **Frontend Implementation Pattern**

#### **Standard Page Update Pattern**
```typescript
// ❌ BEFORE
import { useState } from 'react';

export default function AdminBookings() {
  const [hotelId, setHotelId] = useState('68c7ab1242a357d06adbb2aa'); // Hardcoded!

  const { data } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => api.get('/bookings')  // No filtering!
  });

  return (
    <div>
      {/* FilterBar with hotel selector */}
      <FilterBar filters={[
        { key: 'hotelId', type: 'select', options: [...hardcoded] }
      ]} />
      {/* ... */}
    </div>
  );
}

// ✅ AFTER
import { useProperty } from '../../context/PropertyContext';

export default function AdminBookings() {
  const { selectedPropertyId, selectedProperty, viewMode } = useProperty();

  const { data } = useQuery({
    queryKey: ['bookings', selectedPropertyId],  // ✅ Reactive
    queryFn: () => api.get(`/bookings?hotelId=${selectedPropertyId}`),
    enabled: !!selectedPropertyId  // Only fetch when property selected
  });

  // Handle portfolio view
  if (viewMode === 'all') {
    return <PortfolioBookingsView />;
  }

  return (
    <div>
      {/* Property name in breadcrumb */}
      <Breadcrumb>
        <BreadcrumbItem>{selectedProperty?.name}</BreadcrumbItem>
        <BreadcrumbItem>Bookings</BreadcrumbItem>
      </Breadcrumb>

      {/* NO hotel selector in FilterBar - it's global now */}
      <FilterBar filters={[
        { key: 'status', type: 'select', ... },
        { key: 'dateRange', type: 'daterange', ... }
        // ❌ NO hotelId filter - it's in header now
      ]} />

      {/* ... rest of component */}
    </div>
  );
}
```

---

## 📅 PHASE-BY-PHASE IMPLEMENTATION PLAN

### **PHASE 1: FOUNDATION (Week 1) - CRITICAL**

#### **Goals**
- Create Property Context
- Add Property Selector to Header
- Update User Model for multi-property support
- Test basic property switching

#### **Backend Tasks**

**Task 1.1: Update User Model**
```bash
File: backend/src/models/User.js
Time: 2 hours
```

Add fields:
```javascript
properties: [{
  type: mongoose.Schema.ObjectId,
  ref: 'Hotel'
}],
primaryProperty: {
  type: mongoose.Schema.ObjectId,
  ref: 'Hotel'
},
multiPropertyAccess: {
  enabled: { type: Boolean, default: false },
  allowedProperties: [{ type: mongoose.Schema.ObjectId, ref: 'Hotel' }],
  restrictions: {
    canCreateProperties: { type: Boolean, default: true },
    canDeleteProperties: { type: Boolean, default: false },
    canManageGroups: { type: Boolean, default: true }
  }
}
```

**Task 1.2: Create Migration Script**
```bash
File: backend/src/scripts/migrateUsersForMultiProperty.js
Time: 3 hours
```

```javascript
/**
 * Migrate existing users to multi-property model
 * - Populate properties array from hotelId
 * - Set primaryProperty = hotelId
 * - Enable multiPropertyAccess for admins
 */
import User from '../models/User.js';
import Hotel from '../models/Hotel.js';

async function migrate() {
  console.log('🚀 Starting multi-property migration...');

  const users = await User.find({});

  for (const user of users) {
    if (user.hotelId) {
      user.properties = [user.hotelId];
      user.primaryProperty = user.hotelId;
    }

    if (user.role === 'admin') {
      // Find all hotels owned by this user
      const ownedHotels = await Hotel.find({ ownerId: user._id });
      user.properties = ownedHotels.map(h => h._id);
      user.multiPropertyAccess = {
        enabled: true,
        allowedProperties: user.properties,
        restrictions: {
          canCreateProperties: true,
          canDeleteProperties: true,
          canManageGroups: true
        }
      };
    }

    await user.save();
    console.log(`✅ Migrated user: ${user.email}`);
  }

  console.log('✨ Migration complete!');
}

migrate().catch(console.error);
```

Run migration:
```bash
cd backend
node src/scripts/migrateUsersForMultiProperty.js
```

**Task 1.3: Update Auth Endpoints**
```bash
File: backend/src/routes/auth.js
Time: 2 hours
```

```javascript
// Update /me endpoint to include properties
router.get('/me', authenticate, async (req, res) => {
  const user = await User.findById(req.user._id)
    .select('-password')
    .populate('properties', 'name address.city totalRooms')
    .populate('primaryProperty', 'name');

  res.json({
    success: true,
    data: { user }
  });
});
```

#### **Frontend Tasks**

**Task 1.4: Create PropertyContext**
```bash
File: frontend/src/context/PropertyContext.tsx
Time: 4 hours
```

See implementation in [Complete Backend Analysis](#complete-backend-analysis) section above.

**Task 1.5: Create PropertySelector Component**
```bash
File: frontend/src/components/common/PropertySelector.tsx
Time: 3 hours
```

See implementation in [Complete Backend Analysis](#complete-backend-analysis) section above.

**Task 1.6: Update AdminLayout**
```bash
File: frontend/src/layouts/AdminLayout.tsx
Time: 1 hour
```

```typescript
import { PropertyProvider } from '../../context/PropertyContext';

export default function AdminLayout() {
  return (
    <PropertyProvider>  {/* ✅ Wrap entire layout */}
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <AdminHeader ... />
        <div className="flex flex-1">
          <AdminSidebar ... />
          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </PropertyProvider>
  );
}
```

**Task 1.7: Update AdminHeader**
```bash
File: frontend/src/layouts/components/AdminHeader.tsx
Time: 2 hours
```

```typescript
import { PropertySelector } from '../../components/common/PropertySelector';

export default function AdminHeader({ ...props }) {
  return (
    <header className="...">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h1>Admin Dashboard</h1>

          {/* ✅ ADD PROPERTY SELECTOR */}
          <PropertySelector />
        </div>
        {/* ... rest */}
      </div>
    </header>
  );
}
```

#### **Phase 1 Deliverables**
- ✅ Property Context created and working
- ✅ Property Selector visible in header
- ✅ User can switch between properties
- ✅ Selection persists to localStorage
- ✅ Backend ready for multi-property users

#### **Phase 1 Testing**
```bash
# Frontend
- Navigate to admin dashboard
- Verify PropertySelector appears (if user has >1 property)
- Select different property
- Verify selection persists on page refresh
- Verify "All Properties" option appears

# Backend
- Call GET /auth/me
- Verify `properties` array is populated
- Verify `primaryProperty` is set
```

---

### **PHASE 2: CRITICAL PAGES UPDATE (Week 2-3) - HIGH PRIORITY**

#### **Goals**
- Update top 25 critical data pages
- Ensure all data filtering works
- Add breadcrumbs showing property name

#### **Backend Tasks**

**Task 2.1: Create Property Access Middleware**
```bash
File: backend/src/middleware/propertyAccess.js
Time: 3 hours
```

See implementation in [Complete Backend Analysis](#complete-backend-analysis) section above.

**Task 2.2: Update Critical Endpoints**

For each endpoint, apply this pattern:

```javascript
// Example: Rooms endpoint
// File: backend/src/routes/rooms.js

// ❌ BEFORE
router.get('/', authenticate, async (req, res) => {
  const rooms = await Room.find({});
  res.json({ data: rooms });
});

// ✅ AFTER
import { ensurePropertyAccess } from '../middleware/propertyAccess.js';

router.get('/',
  authenticate,
  ensurePropertyAccess,  // ✅ Add middleware
  async (req, res) => {
    const { hotelId } = req.query;

    // Build query
    const query = {};

    if (hotelId) {
      query.hotelId = hotelId;
    } else if (req.user.properties && req.user.properties.length > 0) {
      // No specific property - return all user's properties
      query.hotelId = { $in: req.user.properties };
    }

    const rooms = await Room.find(query);
    res.json({ data: rooms });
  }
);
```

**Endpoints to Update** (Week 2):
1. `GET /rooms` ✅
2. `GET /guests` ✅
3. `GET /bookings/upcoming` ✅
4. `GET /housekeeping/tasks` ✅
5. `GET /staff` ✅
6. `GET /inventory` ✅
7. `GET /financial/summary` ✅
8. `GET /reports/occupancy` ✅

**Task 2.3: Audit All Route Files**
```bash
# Script to find all routes that need updates
cd backend/src/routes
grep -l "router.get" *.js | xargs -I {} echo "File: {}"
```

Create tracking spreadsheet:
```
Endpoint | Has hotelId Filter | Updated | Tested
---------|-------------------|---------|--------
GET /rooms | ❌ No | ⏳ Pending | ❌
GET /guests | ❌ No | ⏳ Pending | ❌
...
```

#### **Frontend Tasks**

**Task 2.4: Update AdminDashboard**
```bash
File: frontend/src/pages/admin/AdminDashboard.tsx
Time: 3 hours
Priority: CRITICAL
```

See implementation pattern in [Complete Frontend Analysis](#complete-frontend-analysis).

**Task 2.5: Update AdminBookings**
```bash
File: frontend/src/pages/admin/AdminBookings.tsx
Time: 2 hours
Priority: CRITICAL
```

**Task 2.6: Update AdminRooms**
```bash
File: frontend/src/pages/admin/AdminRooms.tsx
Time: 2 hours
Priority: CRITICAL
```

**Task 2.7: Update Remaining 22 Critical Pages**
```bash
Time: 1-2 hours each x 22 pages = 44 hours (Week 3)
```

For each page:
1. Remove local `hotelId` state
2. Import `useProperty` hook
3. Use `selectedPropertyId` from context
4. Update API calls to include `hotelId` parameter
5. Add property name to breadcrumb
6. Handle portfolio view (if applicable)
7. Test property switching

**Task 2.8: Create Breadcrumb Component**
```bash
File: frontend/src/components/common/PropertyBreadcrumb.tsx
Time: 2 hours
```

```typescript
import { useProperty } from '../../context/PropertyContext';
import { Building2, ChevronRight } from 'lucide-react';

export function PropertyBreadcrumb({ items }: { items: string[] }) {
  const { selectedProperty, viewMode } = useProperty();

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600">
      {viewMode === 'all' ? (
        <div className="flex items-center space-x-1 font-medium">
          <Building2 className="h-4 w-4" />
          <span>All Properties</span>
        </div>
      ) : selectedProperty ? (
        <div className="flex items-center space-x-1 font-medium">
          <Building2 className="h-4 w-4" />
          <span>{selectedProperty.name}</span>
        </div>
      ) : null}

      {items.map((item, index) => (
        <div key={index} className="flex items-center space-x-2">
          <ChevronRight className="h-4 w-4" />
          <span className={index === items.length - 1 ? 'font-medium text-gray-900' : ''}>
            {item}
          </span>
        </div>
      ))}
    </nav>
  );
}

// Usage
<PropertyBreadcrumb items={['Bookings', 'Upcoming']} />
// Output: "Hotel Mumbai > Bookings > Upcoming"
```

#### **Phase 2 Deliverables**
- ✅ 25 critical pages updated
- ✅ All data properly filtered by property
- ✅ Breadcrumbs showing property name
- ✅ Property switching works on all pages
- ✅ Backend endpoints secured

#### **Phase 2 Testing Checklist**

For EACH of the 25 pages:
```
Page: AdminDashboard
- [ ] Property selector appears in header
- [ ] Selecting property updates dashboard data
- [ ] Switching properties refetches data
- [ ] Selection persists on page refresh
- [ ] Breadcrumb shows property name
- [ ] "All Properties" shows portfolio view
- [ ] No hardcoded property IDs in code
- [ ] API calls include hotelId parameter
- [ ] Data only shows selected property
- [ ] No data leakage from other properties
```

Repeat for all 25 pages.

---

### **PHASE 3: PORTFOLIO VIEW & ANALYTICS (Week 3-4) - HIGH PRIORITY**

#### **Goals**
- Create portfolio dashboard
- Implement aggregated analytics
- Multi-property reporting
- Integrate with Multi-Property Manager

#### **Backend Tasks**

**Task 3.1: Create Portfolio Routes**
```bash
File: backend/src/routes/portfolio.js
Time: 1 day
```

See complete implementation in [Complete Backend Analysis](#complete-backend-analysis) section.

**Task 3.2: Add Portfolio Analytics**
```bash
File: backend/src/controllers/portfolioController.js
Time: 1 day
```

```javascript
/**
 * Get portfolio trends over time
 */
export const getPortfolioTrends = async (req, res) => {
  const { period = '30d' } = req.query;

  const properties = await Hotel.find({
    ownerId: req.user._id
  });
  const propertyIds = properties.map(p => p._id);

  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  const days = parseInt(period.replace('d', ''));
  startDate.setDate(startDate.getDate() - days);

  // Get daily revenue across all properties
  const dailyRevenue = await Booking.aggregate([
    {
      $match: {
        hotelId: { $in: propertyIds },
        paymentStatus: 'paid',
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
        },
        revenue: { $sum: '$totalAmount' },
        bookings: { $sum: 1 }
      }
    },
    { $sort: { '_id.date': 1 } }
  ]);

  // Get occupancy trends
  const occupancyTrends = await calculateDailyOccupancy(propertyIds, startDate, endDate);

  res.json({
    success: true,
    data: {
      period,
      dailyRevenue,
      occupancyTrends,
      summary: {
        totalRevenue: dailyRevenue.reduce((sum, d) => sum + d.revenue, 0),
        totalBookings: dailyRevenue.reduce((sum, d) => sum + d.bookings, 0),
        avgOccupancy: calculateAverage(occupancyTrends)
      }
    }
  });
};

/**
 * Get property comparison metrics
 */
export const getPropertyComparison = async (req, res) => {
  const properties = await Hotel.find({
    ownerId: req.user._id
  }).select('name address.city');

  const propertyMetrics = await Promise.all(
    properties.map(async (property) => {
      const [bookings, revenue, occupancy] = await Promise.all([
        Booking.countDocuments({ hotelId: property._id }),
        Booking.aggregate([
          { $match: { hotelId: property._id, paymentStatus: 'paid' } },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]),
        calculatePropertyOccupancy(property._id)
      ]);

      return {
        property: {
          id: property._id,
          name: property.name,
          city: property.address.city
        },
        metrics: {
          bookings,
          revenue: revenue[0]?.total || 0,
          occupancy
        }
      };
    })
  );

  res.json({ success: true, data: propertyMetrics });
};
```

#### **Frontend Tasks**

**Task 3.3: Create PortfolioDashboard Component**
```bash
File: frontend/src/components/dashboard/PortfolioDashboard.tsx
Time: 2 days
```

```typescript
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useProperty } from '../../context/PropertyContext';
import { api } from '../../services/api';
import {
  MetricCard,
  ChartCard,
  LineChart,
  BarChart
} from '../dashboard';

export function PortfolioDashboard() {
  const { properties } = useProperty();

  // Fetch portfolio metrics
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['portfolio-metrics'],
    queryFn: async () => {
      const response = await api.get('/portfolio/metrics');
      return response.data.data;
    }
  });

  // Fetch portfolio trends
  const { data: trends } = useQuery({
    queryKey: ['portfolio-trends', '30d'],
    queryFn: async () => {
      const response = await api.get('/portfolio/trends?period=30d');
      return response.data.data;
    }
  });

  // Fetch property comparison
  const { data: comparison } = useQuery({
    queryKey: ['property-comparison'],
    queryFn: async () => {
      const response = await api.get('/portfolio/comparison');
      return response.data.data;
    }
  });

  if (isLoading) {
    return <div>Loading portfolio...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Portfolio Overview</h1>
          <p className="text-gray-600">Aggregated metrics across {properties.length} properties</p>
        </div>
        <Button onClick={() => window.location.href = '/admin/multi-property'}>
          View Full Multi-Property Manager
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          title="Total Properties"
          value={metrics?.totalProperties || 0}
          icon={<Building2 />}
          color="blue"
        />
        <MetricCard
          title="Total Rooms"
          value={metrics?.totalRooms || 0}
          icon={<Bed />}
          color="green"
        />
        <MetricCard
          title="Total Revenue"
          value={metrics?.totalRevenue || 0}
          type="currency"
          icon={<IndianRupee />}
          color="purple"
        />
        <MetricCard
          title="Avg Occupancy"
          value={metrics?.avgOccupancy || 0}
          type="percentage"
          icon={<TrendingUp />}
          color="orange"
        />
      </div>

      {/* Revenue Trend Chart */}
      <ChartCard title="Revenue Trends (Last 30 Days)">
        <LineChart
          data={trends?.dailyRevenue || []}
          xDataKey="date"
          lines={[
            { dataKey: 'revenue', name: 'Revenue', color: '#10b981' },
            { dataKey: 'bookings', name: 'Bookings', color: '#3b82f6' }
          ]}
        />
      </ChartCard>

      {/* Property Comparison */}
      <ChartCard title="Property Performance Comparison">
        <BarChart
          data={comparison || []}
          xDataKey="property.name"
          bars={[
            { dataKey: 'metrics.revenue', name: 'Revenue', color: '#10b981' },
            { dataKey: 'metrics.bookings', name: 'Bookings', color: '#3b82f6' }
          ]}
        />
      </ChartCard>

      {/* Property List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Properties</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {properties.map(property => (
              <PropertyCard
                key={property._id}
                property={property}
                onClick={() => {
                  // Switch to this property
                  setSelectedPropertyId(property._id);
                  navigate('/admin/dashboard');
                }}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Task 3.4: Update AdminDashboard for Portfolio View**
```bash
File: frontend/src/pages/admin/AdminDashboard.tsx
Time: 3 hours
```

```typescript
import { PortfolioDashboard } from '../../components/dashboard/PortfolioDashboard';

export default function AdminDashboard() {
  const { selectedPropertyId, viewMode } = useProperty();

  // If viewing all properties, show portfolio dashboard
  if (viewMode === 'all') {
    return <PortfolioDashboard />;
  }

  // Otherwise show single property dashboard
  return (
    <div className="space-y-6">
      {/* Single property dashboard */}
    </div>
  );
}
```

**Task 3.5: Integrate with Multi-Property Manager**
```bash
File: frontend/src/components/multi-property/MultiPropertyManager.tsx
Time: 2 hours
```

Add navigation from portfolio dashboard:

```typescript
// In PortfolioDashboard.tsx
<Card>
  <CardHeader>
    <CardTitle>Advanced Portfolio Management</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Access advanced features:</p>
    <ul>
      - Property Groups
      - Centralized Rate Management
      - Consolidated Analytics
      - Cross-Property Reporting
    </ul>
    <Button onClick={() => navigate('/admin/multi-property')}>
      Open Multi-Property Manager →
    </Button>
  </CardContent>
</Card>
```

Add back-navigation in MultiPropertyManager:

```typescript
// In MultiPropertyManager.tsx
<Button
  variant="ghost"
  onClick={() => {
    setViewMode('all');
    navigate('/admin/dashboard');
  }}
>
  ← Back to Portfolio Dashboard
</Button>
```

#### **Phase 3 Deliverables**
- ✅ Portfolio dashboard created
- ✅ Aggregated metrics working
- ✅ Property comparison charts
- ✅ Multi-Property Manager integration
- ✅ Seamless navigation between views

#### **Phase 3 Testing**
```
- [ ] Select "All Properties" from selector
- [ ] Verify portfolio dashboard appears
- [ ] Verify aggregated metrics are correct
- [ ] Verify revenue trends chart
- [ ] Click property card → switches to that property
- [ ] Click "Multi-Property Manager" → navigates correctly
- [ ] Back button returns to portfolio dashboard
```

---

### **PHASE 4: SETTINGS PAGES & GROUP INHERITANCE (Week 4-5) - MEDIUM PRIORITY**

#### **Goals**
- Update 30 settings pages
- Implement group-level settings inheritance
- Add "Apply to All Properties" functionality

#### **Backend Tasks**

**Task 4.1: Create Settings Inheritance Service**
```bash
File: backend/src/services/settingsInheritance.js
Time: 1 day
```

```javascript
/**
 * Service to handle settings inheritance from PropertyGroups
 */
export class SettingsInheritanceService {

  /**
   * Apply group settings to a property
   */
  static async applyGroupSettings(propertyId, groupId) {
    const [property, group] = await Promise.all([
      Hotel.findById(propertyId),
      PropertyGroup.findById(groupId)
    ]);

    if (!property || !group) {
      throw new Error('Property or group not found');
    }

    // Apply settings based on inheritance rules
    if (property.groupSettings.inheritSettings) {
      // Update property with group settings
      if (group.settings.defaultCancellationPolicy) {
        property.policies.cancellationPolicy = group.settings.defaultCancellationPolicy;
      }

      if (group.settings.baseCurrency) {
        property.settings.currency = group.settings.baseCurrency;
      }

      // Mark last sync
      property.groupSettings.lastSyncAt = new Date();
      property.groupSettings.version = group.updatedAt;

      await property.save();
    }

    return property;
  }

  /**
   * Apply settings to all properties in a group
   */
  static async applySettingsToGroup(groupId, settings) {
    const group = await PropertyGroup.findById(groupId);
    const properties = await Hotel.find({ propertyGroupId: groupId });

    const results = await Promise.all(
      properties.map(property =>
        this.applyGroupSettings(property._id, groupId)
      )
    );

    return {
      propertiesUpdated: results.length,
      properties: results
    };
  }

  /**
   * Check if property can override group settings
   */
  static canOverride(property, settingKey) {
    const group = property.propertyGroupId;
    if (!group) return true;  // No group, can always override

    return group.settings.rateManagement.allowPropertyOverrides;
  }
}
```

**Task 4.2: Add Settings Endpoints with Group Support**
```bash
File: backend/src/routes/settings.js
Time: 1 day
```

```javascript
/**
 * Update room type settings
 * Can apply to single property or all properties in group
 */
router.put('/room-types/:id',
  authenticate,
  ensurePropertyAccess,
  async (req, res) => {
    const { id } = req.params;
    const { applyToAll, applyToGroup } = req.body;

    const roomType = await RoomType.findById(id);

    // Update single property room type
    if (!applyToAll && !applyToGroup) {
      Object.assign(roomType, req.body);
      await roomType.save();

      return res.json({
        success: true,
        data: roomType,
        appliedTo: 'single'
      });
    }

    // Apply to all properties owned by user
    if (applyToAll) {
      const properties = await Hotel.find({ ownerId: req.user._id });
      const propertyIds = properties.map(p => p._id);

      await RoomType.updateMany(
        {
          hotelId: { $in: propertyIds },
          name: roomType.name  // Update same room type across properties
        },
        { $set: req.body }
      );

      return res.json({
        success: true,
        data: roomType,
        appliedTo: 'all',
        propertiesAffected: propertyIds.length
      });
    }

    // Apply to property group
    if (applyToGroup) {
      const property = await Hotel.findById(roomType.hotelId);
      if (!property.propertyGroupId) {
        return res.status(400).json({
          success: false,
          message: 'Property is not part of a group'
        });
      }

      const groupProperties = await Hotel.find({
        propertyGroupId: property.propertyGroupId
      });
      const propertyIds = groupProperties.map(p => p._id);

      await RoomType.updateMany(
        {
          hotelId: { $in: propertyIds },
          name: roomType.name
        },
        { $set: req.body }
      );

      return res.json({
        success: true,
        data: roomType,
        appliedTo: 'group',
        propertiesAffected: propertyIds.length
      });
    }
  }
);
```

#### **Frontend Tasks**

**Task 4.3: Create ApplyToSelector Component**
```bash
File: frontend/src/components/settings/ApplyToSelector.tsx
Time: 3 hours
```

```typescript
import { useProperty } from '../../context/PropertyContext';

interface ApplyToSelectorProps {
  value: 'single' | 'all' | 'group';
  onChange: (value: string) => void;
}

export function ApplyToSelector({ value, onChange }: ApplyToSelectorProps) {
  const { selectedProperty, isMultiProperty } = useProperty();

  // Don't show if user has only 1 property
  if (!isMultiProperty) return null;

  const hasGroup = !!selectedProperty?.propertyGroupId;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <label className="block text-sm font-medium text-blue-900 mb-3">
        Apply Changes To:
      </label>

      <div className="space-y-2">
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="radio"
            value="single"
            checked={value === 'single'}
            onChange={(e) => onChange(e.target.value)}
            className="w-4 h-4 text-blue-600"
          />
          <div>
            <div className="font-medium">This Property Only</div>
            <div className="text-sm text-gray-600">
              Changes apply to {selectedProperty?.name} only
            </div>
          </div>
        </label>

        {hasGroup && (
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="radio"
              value="group"
              checked={value === 'group'}
              onChange={(e) => onChange(e.target.value)}
              className="w-4 h-4 text-blue-600"
            />
            <div>
              <div className="font-medium">Property Group</div>
              <div className="text-sm text-gray-600">
                Apply to all properties in the same group
              </div>
            </div>
          </label>
        )}

        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="radio"
            value="all"
            checked={value === 'all'}
            onChange={(e) => onChange(e.target.value)}
            className="w-4 h-4 text-blue-600"
          />
          <div>
            <div className="font-medium">All My Properties</div>
            <div className="text-sm text-gray-600">
              Apply to all {properties.length} properties you own
            </div>
          </div>
        </label>
      </div>

      {value !== 'single' && (
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <strong>Warning:</strong> This will update settings for multiple properties.
              This action cannot be undone easily.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Task 4.4: Update Settings Pages Pattern**
```bash
Time: 1-2 hours each x 30 pages
```

Example: AdminRoomTypes.tsx

```typescript
export default function AdminRoomTypes() {
  const { selectedPropertyId } = useProperty();
  const [applyTo, setApplyTo] = useState<'single' | 'all' | 'group'>('single');

  const updateRoomType = async (id: string, data: any) => {
    const response = await api.put(`/settings/room-types/${id}`, {
      ...data,
      applyToAll: applyTo === 'all',
      applyToGroup: applyTo === 'group'
    });

    toast.success(
      applyTo === 'single'
        ? 'Room type updated'
        : `Room type updated for ${response.data.propertiesAffected} properties`
    );
  };

  return (
    <div>
      <ApplyToSelector value={applyTo} onChange={setApplyTo} />

      {/* Rest of room types management */}
    </div>
  );
}
```

#### **Phase 4 Deliverables**
- ✅ 30 settings pages updated
- ✅ "Apply to all" functionality working
- ✅ Group inheritance implemented
- ✅ Warning modals for bulk updates

#### **Phase 4 Testing**
```
For each settings page:
- [ ] ApplyToSelector appears
- [ ] "This Property Only" works
- [ ] "Property Group" works (if in group)
- [ ] "All My Properties" works
- [ ] Warning modal appears for bulk updates
- [ ] Correct number of properties updated
- [ ] Settings inherited correctly from group
```

---

### **PHASE 5: REMAINING PAGES & POLISH (Week 5-6) - LOW PRIORITY**

#### **Goals**
- Update remaining 32 pages
- Add keyboard shortcuts
- Performance optimizations
- Mobile responsiveness

#### **Tasks**

**Task 5.1: Update Remaining Pages**
- Pages that are property-specific but lower priority
- Apply same pattern as Phase 2

**Task 5.2: Add Keyboard Shortcuts**
```typescript
// File: frontend/src/hooks/usePropertyHotkeys.ts

import { useHotkeys } from 'react-hotkeys-hook';
import { useProperty } from '../context/PropertyContext';

export function usePropertyHotkeys() {
  const { properties, setSelectedPropertyId, viewMode, setViewMode } = useProperty();

  // Cmd/Ctrl + K: Open property switcher
  useHotkeys('mod+k', (e) => {
    e.preventDefault();
    // Open property switcher modal
  });

  // Cmd/Ctrl + 0: Switch to portfolio view
  useHotkeys('mod+0', () => {
    setViewMode('all');
  });

  // Cmd/Ctrl + 1-9: Quick switch to property
  for (let i = 1; i <= 9; i++) {
    useHotkeys(`mod+${i}`, () => {
      if (properties[i - 1]) {
        setSelectedPropertyId(properties[i - 1]._id);
        setViewMode('single');
      }
    });
  }
}
```

**Task 5.3: Performance Optimizations**
```typescript
// Lazy load property selector
const PropertySelector = React.lazy(() => import('./PropertySelector'));

// Memoize property data
const memoizedProperties = useMemo(() => properties, [properties]);

// Debounce property switching
const debouncedSwitch = useDebouncedCallback(
  (propertyId) => setSelectedPropertyId(propertyId),
  300
);
```

**Task 5.4: Mobile Responsiveness**
```typescript
// Mobile property selector as bottom sheet
export function MobilePropertySelector() {
  return (
    <Sheet>
      <SheetTrigger>
        <Button variant="ghost" className="lg:hidden">
          <Building2 className="h-5 w-5" />
          <span className="ml-2">{selectedProperty?.name}</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom">
        {/* Property list for mobile */}
      </SheetContent>
    </Sheet>
  );
}
```

#### **Phase 5 Deliverables**
- ✅ All 87 pages updated
- ✅ Keyboard shortcuts working
- ✅ Performance optimized
- ✅ Mobile-friendly

---

### **PHASE 6: TESTING & DEPLOYMENT (Week 6) - CRITICAL**

#### **Goals**
- Comprehensive testing
- Bug fixes
- Documentation
- Production deployment

#### **Testing Strategy**

**Unit Tests**
```bash
# PropertyContext tests
npm test PropertyContext.test.tsx

# PropertySelector tests
npm test PropertySelector.test.tsx

# Hook tests
npm test useProperty.test.tsx
```

**Integration Tests**
```bash
# Test property switching across pages
npm test integration/property-switching.test.tsx

# Test portfolio view
npm test integration/portfolio-view.test.tsx

# Test settings inheritance
npm test integration/settings-inheritance.test.tsx
```

**E2E Tests (Playwright)**
```typescript
// tests/e2e/multi-property.spec.ts

test('Admin can switch between properties', async ({ page }) => {
  await page.goto('/admin/dashboard');

  // Open property selector
  await page.click('[data-testid="property-selector"]');

  // Select different property
  await page.click('[data-testid="property-Hotel-Mumbai"]');

  // Verify dashboard updates
  await expect(page.locator('h1')).toContainText('Hotel Mumbai');

  // Verify data filtered
  const bookings = await page.locator('[data-testid="bookings-list"] tr');
  await expect(bookings).toHaveCount(5);  // Specific to Hotel Mumbai
});

test('Portfolio view shows aggregated data', async ({ page }) => {
  await page.goto('/admin/dashboard');

  // Select "All Properties"
  await page.click('[data-testid="property-selector"]');
  await page.click('[data-testid="portfolio-view-option"]');

  // Verify portfolio dashboard
  await expect(page.locator('h1')).toContainText('Portfolio Overview');

  // Verify metrics are aggregated
  const totalRevenue = await page.locator('[data-testid="total-revenue"]').textContent();
  expect(totalRevenue).toMatch(/₹[0-9,]+/);
});
```

**Manual Testing Checklist**

```markdown
## Multi-Property Integration Testing Checklist

### Property Switching
- [ ] Property selector appears in header
- [ ] Dropdown shows all user's properties
- [ ] "All Properties" option appears
- [ ] Selecting property updates URL
- [ ] Page content updates immediately
- [ ] Selection persists on refresh
- [ ] Switching works on all 87 pages
- [ ] No errors in console
- [ ] No data leakage between properties

### Portfolio View
- [ ] "All Properties" shows portfolio dashboard
- [ ] Aggregated metrics are correct
- [ ] Can navigate to Multi-Property Manager
- [ ] Can switch to specific property from portfolio
- [ ] Charts show correct data
- [ ] Property cards clickable

### Data Filtering
- [ ] Dashboard shows only selected property data
- [ ] Bookings filtered correctly
- [ ] Rooms filtered correctly
- [ ] All reports property-specific
- [ ] Settings apply to correct property
- [ ] Bulk updates work ("Apply to All")

### Settings Inheritance
- [ ] Property can inherit from group
- [ ] "Apply to Group" works
- [ ] "Apply to All" works
- [ ] Warning modals appear
- [ ] Correct properties updated

### Performance
- [ ] Property switch < 500ms
- [ ] No unnecessary API calls
- [ ] Data cached properly
- [ ] Page doesn't freeze

### Mobile
- [ ] Property selector works on mobile
- [ ] All pages responsive
- [ ] Touch interactions work

### Security
- [ ] Users only see their properties
- [ ] Can't access other users' data
- [ ] API returns 403 for unauthorized access
- [ ] Property groups properly secured
```

#### **Deployment Steps**

**Backend Deployment**
```bash
# 1. Run migration
cd backend
node src/scripts/migrateUsersForMultiProperty.js

# 2. Deploy backend
git add .
git commit -m "feat: Multi-property system integration"
git push origin main

# 3. Deploy to production
# (Your deployment process)
```

**Frontend Deployment**
```bash
# 1. Build frontend
cd frontend
npm run build

# 2. Test build locally
npm run preview

# 3. Deploy
# (Your deployment process)
```

**Post-Deployment Verification**
```bash
# 1. Check backend health
curl https://your-api.com/health

# 2. Verify multi-property endpoints
curl https://your-api.com/api/v1/portfolio/metrics

# 3. Test frontend
open https://your-app.com/admin/dashboard

# 4. Monitor logs
tail -f logs/application.log
```

---

## ✅ SUCCESS CRITERIA

### **Functional Requirements**
- [ ] **Property Context**: Global state working
- [ ] **Property Selector**: Visible in header, functional
- [ ] **87 Admin Pages**: ALL property-aware
- [ ] **Backend Endpoints**: 100% support hotelId filtering
- [ ] **Portfolio View**: Aggregated metrics working
- [ ] **Multi-Property Manager**: Seamlessly integrated
- [ ] **Settings Inheritance**: Group settings apply correctly
- [ ] **Security**: Users only see their properties
- [ ] **Persistence**: Selection survives page refresh

### **Performance Requirements**
- [ ] Property switch: < 500ms
- [ ] API response: < 2 seconds
- [ ] No excessive re-renders
- [ ] Data cached appropriately
- [ ] Page load: < 3 seconds

### **User Experience**
- [ ] Clear visual indicator of selected property
- [ ] Breadcrumbs show property name
- [ ] Smooth transitions
- [ ] No data flash on property switch
- [ ] Mobile-friendly
- [ ] Keyboard shortcuts work
- [ ] Help text available

### **Security & Data Integrity**
- [ ] No data leakage between properties
- [ ] API authorization checks pass
- [ ] Property group permissions enforced
- [ ] Audit logs working
- [ ] Error handling graceful

---

## 🎯 TESTING STRATEGY

### **Automated Testing**

#### **Unit Tests** (200+ tests)
```bash
# Frontend
frontend/src/__tests__/
├── context/PropertyContext.test.tsx
├── hooks/useProperty.test.tsx
├── components/PropertySelector.test.tsx
└── pages/AdminDashboard.test.tsx

# Backend
backend/src/__tests__/
├── middleware/propertyAccess.test.js
├── routes/portfolio.test.js
└── services/settingsInheritance.test.js
```

#### **Integration Tests** (50+ scenarios)
```bash
tests/integration/
├── property-switching.test.ts
├── portfolio-view.test.ts
├── settings-inheritance.test.ts
└── data-filtering.test.ts
```

#### **E2E Tests** (30+ flows)
```bash
tests/e2e/
├── multi-property-admin.spec.ts
├── property-groups.spec.ts
├── portfolio-analytics.spec.ts
└── settings-bulk-update.spec.ts
```

### **Manual Testing**

**Test Scenarios**:
1. **New User Journey**: User signs up, adds properties, switches between them
2. **Multi-Property Admin**: User manages 5+ properties, creates groups
3. **Settings Cascade**: Update group settings, verify propagation
4. **Data Isolation**: Verify no data leakage
5. **Performance**: Test with 10+ properties, 1000+ bookings

---

## 📈 PROGRESS TRACKING

### **Implementation Dashboard**

| Phase | Status | Progress | Start Date | End Date | Blockers |
|-------|--------|----------|------------|----------|----------|
| Phase 1: Foundation | ⏳ Pending | 0% | Week 1 | Week 1 | None |
| Phase 2: Critical Pages | ⏳ Pending | 0% | Week 2 | Week 3 | Depends on Phase 1 |
| Phase 3: Portfolio | ⏳ Pending | 0% | Week 3 | Week 4 | Depends on Phase 2 |
| Phase 4: Settings | ⏳ Pending | 0% | Week 4 | Week 5 | Depends on Phase 3 |
| Phase 5: Polish | ⏳ Pending | 0% | Week 5 | Week 6 | Depends on Phase 4 |
| Phase 6: Testing | ⏳ Pending | 0% | Week 6 | Week 6 | Depends on Phase 5 |

### **Backend Endpoints Tracker**

Create spreadsheet: `backend-endpoints-audit.xlsx`

| Endpoint | Route File | Has hotelId | Owner Check | Updated | Tested | Notes |
|----------|-----------|-------------|-------------|---------|--------|-------|
| GET /rooms | rooms.js | ❌ No | ❌ No | ⏳ Pending | ❌ | Week 2 |
| GET /bookings | bookings.js | ✅ Yes | ✅ Yes | ✅ Done | ✅ | Already working |
| GET /guests | guests.js | ❌ No | ❌ No | ⏳ Pending | ❌ | Week 2 |
| ... | ... | ... | ... | ... | ... | ... |

*(Repeat for all 96+ route files)*

### **Frontend Pages Tracker**

Create spreadsheet: `frontend-pages-audit.xlsx`

| Page | Category | Uses PropertyContext | Breadcrumb Added | Tested | Notes |
|------|----------|---------------------|------------------|--------|-------|
| AdminDashboard.tsx | Critical | ⏳ Pending | ⏳ Pending | ❌ | Week 2 |
| AdminBookings.tsx | Critical | ⏳ Pending | ⏳ Pending | ❌ | Week 2 |
| AdminRooms.tsx | Critical | ⏳ Pending | ⏳ Pending | ❌ | Week 2 |
| ... | ... | ... | ... | ... | ... |

*(Repeat for all 87 pages)*

---

## 🚀 GETTING STARTED

### **Week 1 Kickoff Checklist**

```markdown
## Before Starting Phase 1

### Prerequisites
- [ ] Backend and frontend running locally
- [ ] Database accessible
- [ ] Git branches created
  - [ ] `feature/multi-property-backend`
  - [ ] `feature/multi-property-frontend`
- [ ] Team aligned on plan
- [ ] Stakeholder approval obtained

### Development Environment
- [ ] Node.js v18+ installed
- [ ] MongoDB running
- [ ] Redis running (if used)
- [ ] Environment variables configured
- [ ] Test database seeded

### Documentation
- [ ] This roadmap reviewed by team
- [ ] Tasks assigned
- [ ] Daily standups scheduled
- [ ] Progress tracking spreadsheet created

### Day 1 Tasks
1. [ ] Create PropertyContext.tsx (4 hours)
2. [ ] Create PropertySelector.tsx (3 hours)
3. [ ] Update User model (2 hours)

### Day 2 Tasks
1. [ ] Run migration script (1 hour)
2. [ ] Update AdminLayout (1 hour)
3. [ ] Update AdminHeader (2 hours)
4. [ ] Test basic property switching (2 hours)

### Day 3 Tasks
1. [ ] Create property access middleware (3 hours)
2. [ ] Update first 5 backend endpoints (4 hours)

### Day 4 Tasks
1. [ ] Update AdminDashboard.tsx (3 hours)
2. [ ] Create PropertyBreadcrumb component (2 hours)
3. [ ] Test dashboard property filtering (2 hours)

### Day 5 Tasks
1. [ ] Update AdminBookings.tsx (2 hours)
2. [ ] Update AdminRooms.tsx (2 hours)
3. [ ] Phase 1 testing (3 hours)
4. [ ] Phase 1 review meeting
```

---

## 📞 SUPPORT & RESOURCES

### **Key Files Reference**

**Backend**:
- Models: `backend/src/models/`
- Controllers: `backend/src/controllers/propertyGroupController.js`
- Routes: `backend/src/routes/propertyGroups.js`
- Middleware: `backend/src/middleware/propertyAccess.js` (to be created)

**Frontend**:
- Context: `frontend/src/context/PropertyContext.tsx` (to be created)
- Components: `frontend/src/components/multi-property/`
- Selector: `frontend/src/components/common/PropertySelector.tsx` (to be created)
- Pages: `frontend/src/pages/admin/`

**Documentation**:
- This roadmap: `.claude/context/MULTI_PROPERTY_INTEGRATION_ROADMAP.md`
- Backend analysis: Included in this file
- API docs: See Swagger documentation

### **Contact Points**

- **Backend Lead**: [Name]
- **Frontend Lead**: [Name]
- **QA Lead**: [Name]
- **Product Owner**: [Name]

---

## 📝 CHANGE LOG

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-01-27 | 2.0.0 | Complete roadmap with backend analysis, phase-by-phase plan | Claude |
| 2025-01-27 | 1.0.0 | Initial draft | Claude |

---

## ✨ CONCLUSION

This roadmap provides a **comprehensive, production-ready plan** to integrate the Multi-Property Manager with the entire application.

**Key Takeaways**:
- **6 phases over 6-8 weeks**
- **87 frontend pages** need updates
- **96+ backend endpoints** need hotelId filtering
- **Complete testing strategy** included
- **Phase-by-phase breakdown** with time estimates

**Next Steps**:
1. ✅ Review and approve this roadmap
2. ✅ Create tracking spreadsheets
3. ✅ Assign team members to phases
4. ✅ Begin Phase 1: Foundation

---

**Questions or Concerns?**
Reach out to the project team or create an issue in the repository.

**Ready to start?**
See [Week 1 Kickoff Checklist](#week-1-kickoff-checklist) above! 🚀
