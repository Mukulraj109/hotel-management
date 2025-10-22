# 🔐 Admin User Creation - Comprehensive Implementation Plan

**Date:** October 18, 2025
**Status:** Planning Phase
**Priority:** HIGH - Critical for hotel operations

---

## 📋 TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Proposed Solution](#proposed-solution)
4. [UI/UX Design](#uiux-design)
5. [Backend Implementation](#backend-implementation)
6. [Frontend Implementation](#frontend-implementation)
7. [Security & Validation](#security--validation)
8. [Implementation Steps](#implementation-steps)
9. [Testing Plan](#testing-plan)

---

## 📊 EXECUTIVE SUMMARY

### **The Problem**
Currently, there is NO way to create new admin users through the admin dashboard. Users can only be created through:
- Direct database insertion
- Registration endpoint (but this creates guests, not admins)
- Backend scripts

This creates a bottleneck for hotel operations and prevents proper admin team management.

### **The Goal**
Add a complete admin user management system with the ability to:
- ✅ Create new users (Admin, Manager, Staff)
- ✅ Edit existing user roles and permissions
- ✅ Manage multi-property access
- ✅ Activate/deactivate users
- ✅ Assign properties to users

### **Preferred Location**
Based on your screenshot and suggestion: **Settings → System Settings → User Management** section

---

## 🔍 CURRENT STATE ANALYSIS

### **What Exists ✅**

1. **User Model** (`backend/src/models/User.js`)
   - Complete schema with all fields needed
   - Roles: guest, staff, admin, manager, travel_agent
   - Multi-property support fields (properties, primaryProperty, multiPropertyAccess)
   - Password hashing with bcrypt
   - Methods for user management

2. **User Management Page** (`frontend/src/pages/admin/AdminUserManagement.tsx`)
   - Displays list of all users
   - Has "Add User" button (line 374-377) **BUT NO HANDLER**
   - Filtering, sorting, pagination working
   - Bulk operations UI exists
   - Export/Import functionality

3. **Backend Routes** (`backend/src/routes/users.js`)
   - ⚠️ **VERY LIMITED** - Only 3 routes:
     - GET `/:userId/profile`
     - PUT `/:userId/profile`
     - GET/PUT `/:userId/billing`
   - ❌ **MISSING**: User creation endpoint
   - ❌ **MISSING**: User update endpoint
   - ❌ **MISSING**: User deletion endpoint
   - ❌ **MISSING**: User list endpoint

### **What's Missing ❌**

| Component | Status | Impact |
|-----------|--------|--------|
| **Backend: Create User Endpoint** | ❌ Missing | CRITICAL - Can't create users |
| **Backend: Update User Endpoint** | ❌ Missing | HIGH - Can't edit users |
| **Backend: Delete User Endpoint** | ❌ Missing | MEDIUM - Can't remove users |
| **Backend: List Users Endpoint** | ⚠️ Partial | MEDIUM - Limited functionality |
| **Frontend: Create User Modal** | ❌ Missing | CRITICAL - No UI for creation |
| **Frontend: Edit User Modal** | ❌ Missing | HIGH - No UI for editing |
| **Frontend: Role Management UI** | ❌ Missing | HIGH - Can't assign roles |
| **Settings Page Integration** | ❌ Missing | MEDIUM - Not in Settings |

---

## 💡 PROPOSED SOLUTION

### **Three-Tier Approach**

We'll add user management functionality in **THREE locations** for maximum flexibility:

#### **Option 1: Settings → System Settings → User Management** (PRIMARY)
**Best for:** Admin user creation and configuration
**Location:** Add new section in System Settings page
**Features:**
- Create admin, manager, staff users
- Assign roles and permissions
- Configure multi-property access
- Set default hotel/property

#### **Option 2: Existing User Management Page Enhancement** (SECONDARY)
**Best for:** Viewing and bulk operations
**Location:** Enhance existing AdminUserManagement.tsx
**Features:**
- Add functional "Create User" modal
- Add "Edit User" functionality
- Keep all existing features (filters, bulk ops, analytics)

#### **Option 3: Header Settings Dropdown** (QUICK ACCESS)
**Best for:** Quick admin creation
**Location:** Add menu item in Settings dropdown
**Features:**
- Quick link: "User & Access Management"
- Opens User Management modal/page

---

## 🎨 UI/UX DESIGN

### **1. Settings Page Integration**

```
Settings Dropdown (Current):
├── Profile Settings
├── Notifications
├── Display
├── Hotel Settings
├── System Settings
│   ├── Security ← EXISTING
│   ├── Integrations ← EXISTING
│   └── 🆕 User Management ← NEW SECTION
│       ├── Admin Users
│       ├── Staff Users
│       ├── Access Control
│       └── Role Permissions
└── Integrations
```

### **2. System Settings → User Management Section**

**New Tab in System Settings:**

```typescript
<Tabs>
  <TabsList>
    <TabsTrigger value="security">Security</TabsTrigger>
    <TabsTrigger value="integrations">Integrations</TabsTrigger>
    <TabsTrigger value="users">👥 User Management</TabsTrigger> ← NEW
  </TabsList>

  <TabsContent value="users">
    {/* User Management Content */}
  </TabsContent>
</Tabs>
```

**User Management Tab Content:**

```
┌─────────────────────────────────────────────────────────┐
│  👥 User Management                    [+ Create User]  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Quick Stats:                                           │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐             │
│  │ 5 Admins  │ │ 12 Staff  │ │ 8 Managers│             │
│  └───────────┘ └───────────┘ └───────────┘             │
│                                                          │
│  ┌─ Admin Users ──────────────────────────────────┐    │
│  │ [Search...] [Filter by Property ▼]             │    │
│  ├──────────────────────────────────────────────────┤  │
│  │ 👤 John Doe              │ Admin  │ [Edit] [✓]  │  │
│  │ john@pentouz.com         │ Active │             │  │
│  │ Hotel Mumbai + 3 more    │        │             │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ 👤 Jane Smith            │ Manager│ [Edit] [✓]  │  │
│  │ jane@pentouz.com         │ Active │             │  │
│  │ Hotel Delhi              │        │             │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### **3. Create User Modal Design**

```
┌────────────────────────────────────────────────────────┐
│  ✨ Create New User                      [✕]           │
├────────────────────────────────────────────────────────┤
│                                                         │
│  Basic Information                                      │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Name *                                           │  │
│  │ [________________________]                       │  │
│  │                                                   │  │
│  │ Email *                                          │  │
│  │ [________________________]                       │  │
│  │                                                   │  │
│  │ Phone                                            │  │
│  │ [________________________]                       │  │
│  │                                                   │  │
│  │ Temporary Password *                             │  │
│  │ [____________] [🔄 Generate] [👁️ Show]          │  │
│  │ ℹ️ User will be required to change on first login│  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  Role & Permissions                                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Role *                                           │  │
│  │ [Select Role ▼]                                  │  │
│  │   ○ Admin - Full system access                   │  │
│  │   ○ Manager - Property management access         │  │
│  │   ○ Staff - Limited operational access           │  │
│  │                                                   │  │
│  │ Department                                       │  │
│  │ [Select Department ▼] (Optional)                 │  │
│  │                                                   │  │
│  │ Employee ID                                      │  │
│  │ [____________] (Optional)                        │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  Property Access (Multi-Property)                       │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Primary Property *                               │  │
│  │ [Select Property ▼]                              │  │
│  │                                                   │  │
│  │ Additional Properties (Optional)                 │  │
│  │ ☑️ Hotel Mumbai                                  │  │
│  │ ☑️ Hotel Delhi                                   │  │
│  │ ☐ Hotel Bangalore                                │  │
│  │ ☐ Hotel Chennai                                  │  │
│  │                                                   │  │
│  │ Multi-Property Permissions                       │  │
│  │ ☑️ Can create new properties                     │  │
│  │ ☐ Can delete properties                          │  │
│  │ ☑️ Can manage property groups                    │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  Account Status                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Status                                           │  │
│  │ ○ Active (User can log in immediately)          │  │
│  │ ○ Inactive (User cannot log in)                 │  │
│  │                                                   │  │
│  │ ☑️ Send welcome email with login credentials    │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  [Cancel]                          [Create User ✨]    │
└────────────────────────────────────────────────────────┘
```

### **4. Edit User Modal Design**

Same structure as Create User Modal but:
- Pre-filled with existing data
- Password field shows "Change Password" option
- Shows "Last Login" and "Created At" info
- Additional "Deactivate User" button

---

## 🔧 BACKEND IMPLEMENTATION

### **File Structure**

```
backend/src/
├── controllers/
│   └── userManagementController.js (ENHANCE)
├── routes/
│   └── userManagement.js (NEW - comprehensive routes)
├── middleware/
│   ├── auth.js (EXISTS)
│   └── validateUserCreation.js (NEW)
├── models/
│   └── User.js (EXISTS - already complete)
└── services/
    └── emailService.js (EXISTS - for welcome emails)
```

### **1. Create User Management Controller**

**File:** `backend/src/controllers/userManagementController.js`

```javascript
import User from '../models/User.js';
import Hotel from '../models/Hotel.js';
import { sendWelcomeEmail } from '../services/emailService.js';
import crypto from 'crypto';

/**
 * Create a new user (Admin, Manager, Staff)
 * POST /api/v1/user-management/users
 */
export const createUser = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      role,
      hotelId,
      department,
      employeeId,
      isActive,
      sendWelcomeEmail: sendEmail,
      // Multi-property fields
      properties,
      primaryProperty,
      multiPropertyAccess
    } = req.body;

    // Validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password, and role are required'
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Validate role
    const validRoles = ['admin', 'manager', 'staff'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be admin, manager, or staff'
      });
    }

    // For admin/manager/staff, hotelId or primaryProperty is required
    if (!hotelId && !primaryProperty) {
      return res.status(400).json({
        success: false,
        message: 'Hotel ID or Primary Property is required for this role'
      });
    }

    // Verify property access
    const propertyId = primaryProperty || hotelId;
    const property = await Hotel.findById(propertyId);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Check if current user owns this property
    if (property.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to create users for this property'
      });
    }

    // Create user object
    const userData = {
      name,
      email: email.toLowerCase(),
      phone,
      password, // Will be hashed by pre-save hook
      role,
      hotelId: propertyId,
      department,
      employeeId,
      isActive: isActive !== undefined ? isActive : true
    };

    // Multi-property support
    if (properties && properties.length > 0) {
      // Verify all properties belong to current user
      const propertiesToAdd = await Hotel.find({
        _id: { $in: properties },
        ownerId: req.user._id
      });

      if (propertiesToAdd.length !== properties.length) {
        return res.status(403).json({
          success: false,
          message: 'You do not own all the specified properties'
        });
      }

      userData.properties = properties;
      userData.primaryProperty = primaryProperty || propertyId;

      if (multiPropertyAccess) {
        userData.multiPropertyAccess = {
          enabled: true,
          allowedProperties: properties,
          restrictions: {
            canCreateProperties: multiPropertyAccess.canCreateProperties || false,
            canDeleteProperties: multiPropertyAccess.canDeleteProperties || false,
            canManageGroups: multiPropertyAccess.canManageGroups || false
          }
        };
      }
    } else {
      // Single property user
      userData.properties = [propertyId];
      userData.primaryProperty = propertyId;
    }

    // Create user
    const newUser = await User.create(userData);

    // Send welcome email if requested
    if (sendEmail) {
      await sendWelcomeEmail(newUser.email, {
        name: newUser.name,
        tempPassword: password, // Send temp password
        loginUrl: process.env.FRONTEND_URL || 'http://localhost:5173/login'
      });
    }

    // Remove password from response
    const userResponse = newUser.toJSON();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: userResponse,
        emailSent: sendEmail
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: error.message
    });
  }
};

/**
 * Update existing user
 * PUT /api/v1/user-management/users/:userId
 */
export const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      name,
      email,
      phone,
      role,
      department,
      employeeId,
      isActive,
      properties,
      primaryProperty,
      multiPropertyAccess,
      password // Optional password update
    } = req.body;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify permission - user must own the property
    const userProperty = await Hotel.findById(user.hotelId);
    if (!userProperty || userProperty.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this user'
      });
    }

    // Update basic fields
    if (name) user.name = name;
    if (email) {
      // Check if new email is already taken
      const emailTaken = await User.findOne({
        email: email.toLowerCase(),
        _id: { $ne: userId }
      });
      if (emailTaken) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use'
        });
      }
      user.email = email.toLowerCase();
    }
    if (phone !== undefined) user.phone = phone;
    if (role) {
      const validRoles = ['admin', 'manager', 'staff'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role'
        });
      }
      user.role = role;
    }
    if (department !== undefined) user.department = department;
    if (employeeId !== undefined) user.employeeId = employeeId;
    if (isActive !== undefined) user.isActive = isActive;

    // Update password if provided
    if (password) {
      user.password = password; // Will be hashed by pre-save hook
    }

    // Update multi-property access
    if (properties) {
      // Verify all properties belong to current user
      const propertiesToAdd = await Hotel.find({
        _id: { $in: properties },
        ownerId: req.user._id
      });

      if (propertiesToAdd.length !== properties.length) {
        return res.status(403).json({
          success: false,
          message: 'You do not own all the specified properties'
        });
      }

      user.properties = properties;
    }

    if (primaryProperty) {
      user.primaryProperty = primaryProperty;
      user.hotelId = primaryProperty; // Keep in sync
    }

    if (multiPropertyAccess) {
      user.multiPropertyAccess = {
        enabled: multiPropertyAccess.enabled || false,
        allowedProperties: multiPropertyAccess.allowedProperties || user.properties,
        restrictions: {
          canCreateProperties: multiPropertyAccess.canCreateProperties || false,
          canDeleteProperties: multiPropertyAccess.canDeleteProperties || false,
          canManageGroups: multiPropertyAccess.canManageGroups || false
        }
      };
    }

    await user.save();

    // Remove password from response
    const userResponse = user.toJSON();

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user: userResponse }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message
    });
  }
};

/**
 * Delete user
 * DELETE /api/v1/user-management/users/:userId
 */
export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deleting yourself
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    // Verify permission
    const userProperty = await Hotel.findById(user.hotelId);
    if (!userProperty || userProperty.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this user'
      });
    }

    // Soft delete - set inactive instead of removing
    user.isActive = false;
    await user.save();

    // Or hard delete if preferred:
    // await User.findByIdAndDelete(userId);

    res.json({
      success: true,
      message: 'User deleted successfully',
      data: { userId }
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
};

/**
 * Get list of users
 * GET /api/v1/user-management/users
 */
export const getUsers = async (req, res) => {
  try {
    const {
      role,
      isActive,
      hotelId,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query - only show users from properties current user owns
    const userProperties = await Hotel.find({ ownerId: req.user._id });
    const propertyIds = userProperties.map(p => p._id);

    const query = {
      hotelId: { $in: propertyIds }
    };

    // Apply filters
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (hotelId) query.hotelId = hotelId;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    // Execute query
    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password -passwordResetToken -passwordResetExpires')
        .populate('hotelId', 'name address.city')
        .populate('properties', 'name address.city')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: { users },
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
};

/**
 * Generate temporary password
 * GET /api/v1/user-management/generate-password
 */
export const generatePassword = (req, res) => {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';

  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }

  res.json({
    success: true,
    data: { password }
  });
};
```

### **2. Create User Management Routes**

**File:** `backend/src/routes/userManagement.js` (ENHANCE EXISTING)

```javascript
import express from 'express';
import * as userManagementController from '../controllers/userManagementController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { ensurePropertyAccess } from '../middleware/propertyAccess.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Only admins and managers can manage users
router.use(authorize('admin', 'manager'));

/**
 * User CRUD Operations
 */
// Create new user
router.post('/users',
  userManagementController.createUser
);

// Get list of users
router.get('/users',
  ensurePropertyAccess,
  userManagementController.getUsers
);

// Get single user
router.get('/users/:userId',
  ensurePropertyAccess,
  userManagementController.getUserById
);

// Update user
router.put('/users/:userId',
  userManagementController.updateUser
);

// Delete user (soft delete - set inactive)
router.delete('/users/:userId',
  userManagementController.deleteUser
);

/**
 * Utility Routes
 */
// Generate temporary password
router.get('/generate-password',
  userManagementController.generatePassword
);

// Existing routes (keep these)
router.route('/:userId/profile')
  .get(userManagementController.getUserBillingDetails)
  .put(userManagementController.updateUserProfile);

router.route('/:userId/billing')
  .get(userManagementController.getUserBillingDetails)
  .put(userManagementController.updateUserBillingDetails);

router.route('/validate-gst')
  .post(userManagementController.validateGSTNumber);

// Advanced analytics routes (if they exist)
router.get('/advanced-list', userManagementController.advancedList);
router.get('/analytics', userManagementController.getAnalytics);
router.post('/bulk-operations', userManagementController.bulkOperations);
router.get('/export', userManagementController.exportUsers);
router.post('/import', userManagementController.importUsers);

export default router;
```

### **3. Register Routes in Server**

**File:** `backend/src/server.js`

```javascript
// ... existing imports
import userManagementRoutes from './routes/userManagement.js';

// ... existing middleware

// Routes
app.use('/api/v1/user-management', userManagementRoutes); // Should already exist
// ... other routes
```

---

## 💻 FRONTEND IMPLEMENTATION

### **File Structure**

```
frontend/src/
├── pages/admin/
│   ├── AdminUserManagement.tsx (ENHANCE)
│   └── settings/
│       └── SystemSettings.tsx (ENHANCE)
├── components/
│   ├── user/
│   │   ├── CreateUserModal.tsx (NEW)
│   │   ├── EditUserModal.tsx (NEW)
│   │   └── UserManagementSection.tsx (NEW)
│   └── ui/ (existing components)
├── services/
│   └── userManagementService.ts (NEW)
└── hooks/
    └── useUserManagement.ts (NEW)
```

### **1. Create User Management Service**

**File:** `frontend/src/services/userManagementService.ts`

```typescript
import { api } from './api';

export interface CreateUserData {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: 'admin' | 'manager' | 'staff';
  hotelId?: string;
  department?: string;
  employeeId?: string;
  isActive?: boolean;
  sendWelcomeEmail?: boolean;
  // Multi-property
  properties?: string[];
  primaryProperty?: string;
  multiPropertyAccess?: {
    enabled: boolean;
    canCreateProperties: boolean;
    canDeleteProperties: boolean;
    canManageGroups: boolean;
  };
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  role?: 'admin' | 'manager' | 'staff';
  department?: string;
  employeeId?: string;
  isActive?: boolean;
  properties?: string[];
  primaryProperty?: string;
  multiPropertyAccess?: {
    enabled: boolean;
    canCreateProperties: boolean;
    canDeleteProperties: boolean;
    canManageGroups: boolean;
  };
}

class UserManagementService {
  /**
   * Create new user
   */
  async createUser(data: CreateUserData) {
    const response = await api.post('/user-management/users', data);
    return response.data;
  }

  /**
   * Update existing user
   */
  async updateUser(userId: string, data: UpdateUserData) {
    const response = await api.put(`/user-management/users/${userId}`, data);
    return response.data;
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string) {
    const response = await api.delete(`/user-management/users/${userId}`);
    return response.data;
  }

  /**
   * Get list of users
   */
  async getUsers(filters?: {
    role?: string;
    isActive?: boolean;
    hotelId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const response = await api.get('/user-management/users', {
      params: filters
    });
    return response.data;
  }

  /**
   * Generate temporary password
   */
  async generatePassword() {
    const response = await api.get('/user-management/generate-password');
    return response.data.data.password;
  }
}

export default new UserManagementService();
```

### **2. Create User Modal Component**

**File:** `frontend/src/components/user/CreateUserModal.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import userManagementService, { CreateUserData } from '../../services/userManagementService';
import { useProperty } from '../../context/PropertyContext';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateUserModal({ isOpen, onClose, onSuccess }: CreateUserModalProps) {
  const { properties } = useProperty();

  const [formData, setFormData] = useState<CreateUserData>({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'staff',
    department: '',
    employeeId: '',
    isActive: true,
    sendWelcomeEmail: true,
    properties: [],
    multiPropertyAccess: {
      enabled: false,
      canCreateProperties: false,
      canDeleteProperties: false,
      canManageGroups: false
    }
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);

  const handleGeneratePassword = async () => {
    try {
      const password = await userManagementService.generatePassword();
      setFormData({ ...formData, password });
      toast.success('Password generated');
    } catch (error) {
      toast.error('Failed to generate password');
    }
  };

  const handlePropertyToggle = (propertyId: string) => {
    setSelectedProperties(prev => {
      if (prev.includes(propertyId)) {
        return prev.filter(id => id !== propertyId);
      } else {
        return [...prev, propertyId];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name || !formData.email || !formData.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);

      const userData: CreateUserData = {
        ...formData,
        properties: selectedProperties.length > 0 ? selectedProperties : undefined,
        primaryProperty: formData.primaryProperty || selectedProperties[0]
      };

      await userManagementService.createUser(userData);

      toast.success('User created successfully');
      onSuccess();
      onClose();

      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        password: '',
        role: 'staff',
        department: '',
        employeeId: '',
        isActive: true,
        sendWelcomeEmail: true,
        properties: [],
        multiPropertyAccess: {
          enabled: false,
          canCreateProperties: false,
          canDeleteProperties: false,
          canManageGroups: false
        }
      });
      setSelectedProperties([]);
    } catch (error: any) {
      console.error('Create user error:', error);
      toast.error(error.response?.data?.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New User">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div>
          <h3 className="text-lg font-medium mb-4">Basic Information</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98765 43210"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Temporary Password *
              </label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Button type="button" onClick={handleGeneratePassword} variant="outline">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                ℹ️ User will be required to change password on first login
              </p>
            </div>
          </div>
        </div>

        {/* Role & Permissions */}
        <div>
          <h3 className="text-lg font-medium mb-4">Role & Permissions</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role *
              </label>
              <Select
                value={formData.role}
                onChange={(value) => setFormData({ ...formData, role: value as any })}
                options={[
                  { value: 'staff', label: '👨‍💼 Staff - Limited operational access' },
                  { value: 'manager', label: '🎯 Manager - Property management access' },
                  { value: 'admin', label: '👑 Admin - Full system access' }
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <Input
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="e.g., Front Desk, Housekeeping"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employee ID
              </label>
              <Input
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                placeholder="e.g., EMP001"
              />
            </div>
          </div>
        </div>

        {/* Property Access */}
        <div>
          <h3 className="text-lg font-medium mb-4">Property Access</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Primary Property *
              </label>
              <Select
                value={formData.primaryProperty || ''}
                onChange={(value) => {
                  setFormData({ ...formData, primaryProperty: value });
                  if (!selectedProperties.includes(value)) {
                    setSelectedProperties([...selectedProperties, value]);
                  }
                }}
                options={properties.map(p => ({
                  value: p._id,
                  label: p.name
                }))}
              />
            </div>

            {properties.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Properties
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
                  {properties.map(property => (
                    <label key={property._id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedProperties.includes(property._id)}
                        onChange={() => handlePropertyToggle(property._id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">{property.name}</span>
                    </label>
                  ))}
                </div>

                {selectedProperties.length > 1 && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-md">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Multi-Property Permissions
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.multiPropertyAccess?.canCreateProperties}
                          onChange={(e) => setFormData({
                            ...formData,
                            multiPropertyAccess: {
                              ...formData.multiPropertyAccess!,
                              enabled: true,
                              canCreateProperties: e.target.checked
                            }
                          })}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm">Can create new properties</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.multiPropertyAccess?.canDeleteProperties}
                          onChange={(e) => setFormData({
                            ...formData,
                            multiPropertyAccess: {
                              ...formData.multiPropertyAccess!,
                              enabled: true,
                              canDeleteProperties: e.target.checked
                            }
                          })}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm">Can delete properties</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.multiPropertyAccess?.canManageGroups}
                          onChange={(e) => setFormData({
                            ...formData,
                            multiPropertyAccess: {
                              ...formData.multiPropertyAccess!,
                              enabled: true,
                              canManageGroups: e.target.checked
                            }
                          })}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm">Can manage property groups</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Account Status */}
        <div>
          <h3 className="text-lg font-medium mb-4">Account Status</h3>

          <div className="space-y-3">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                checked={formData.isActive}
                onChange={() => setFormData({ ...formData, isActive: true })}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm">Active (User can log in immediately)</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                checked={!formData.isActive}
                onChange={() => setFormData({ ...formData, isActive: false })}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm">Inactive (User cannot log in)</span>
            </label>

            <label className="flex items-center space-x-2 pt-2">
              <input
                type="checkbox"
                checked={formData.sendWelcomeEmail}
                onChange={(e) => setFormData({ ...formData, sendWelcomeEmail: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm">Send welcome email with login credentials</span>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create User ✨'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
```

### **3. Enhance AdminUserManagement Page**

**File:** `frontend/src/pages/admin/AdminUserManagement.tsx`

Add the create user functionality by updating line 374-377:

```typescript
// Replace the existing "Add User" button with:
import { CreateUserModal } from '../../components/user/CreateUserModal';

// Add state
const [showCreateModal, setShowCreateModal] = useState(false);

// Replace button on line 374-377:
<button
  onClick={() => setShowCreateModal(true)}
  className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
>
  <UserPlus className="w-4 h-4 mr-2" />
  Add User
</button>

// Add modal before closing div:
<CreateUserModal
  isOpen={showCreateModal}
  onClose={() => setShowCreateModal(false)}
  onSuccess={() => {
    setShowCreateModal(false);
    fetchUsers();
  }}
/>
```

### **4. Add User Management to System Settings**

**File:** `frontend/src/pages/admin/settings/SystemSettings.tsx`

```typescript
// Add new tab for User Management
import { UserManagementSection } from '../../../components/user/UserManagementSection';

// In the tabs:
<Tabs defaultValue="security">
  <TabsList>
    <TabsTrigger value="security">Security</TabsTrigger>
    <TabsTrigger value="integrations">Integrations</TabsTrigger>
    <TabsTrigger value="users">👥 User Management</TabsTrigger> {/* NEW */}
  </TabsList>

  {/* ... existing tabs ... */}

  <TabsContent value="users">
    <UserManagementSection />
  </TabsContent>
</Tabs>
```

---

## 🔒 SECURITY & VALIDATION

### **Backend Validation**

1. **Email Validation**
   - Check format (regex)
   - Check uniqueness in database
   - Convert to lowercase

2. **Password Requirements**
   - Minimum 6 characters
   - Hash with bcrypt (salt rounds: 12)
   - Never return password in API responses

3. **Role Validation**
   - Only allow: admin, manager, staff
   - Prevent privilege escalation

4. **Property Access Validation**
   - User must own the property to create users for it
   - Verify all selected properties belong to current user
   - Prevent cross-property access

5. **Permission Checks**
   - Only admins and managers can create users
   - Users can only manage users in their properties
   - Cannot delete yourself
   - Cannot modify super admin accounts

### **Frontend Validation**

1. **Form Validation**
   - Required fields marked with *
   - Email format validation
   - Phone format validation
   - Password strength indicator

2. **Confirmation Dialogs**
   - Confirm before deleting users
   - Warn when deactivating users
   - Confirm when changing critical roles

3. **Error Handling**
   - Display clear error messages
   - Handle network errors gracefully
   - Retry failed requests

---

## 📝 IMPLEMENTATION STEPS

### **Phase 1: Backend Foundation** (Day 1-2)

1. ✅ **Update User Management Controller**
   - Add `createUser` function
   - Add `updateUser` function
   - Add `deleteUser` function
   - Add `getUsers` function
   - Add `generatePassword` utility

2. ✅ **Update Routes**
   - Add POST `/api/v1/user-management/users`
   - Add PUT `/api/v1/user-management/users/:userId`
   - Add DELETE `/api/v1/user-management/users/:userId`
   - Add GET `/api/v1/user-management/users`
   - Add GET `/api/v1/user-management/generate-password`

3. ✅ **Test Backend**
   - Test user creation with Postman
   - Test validation errors
   - Test permission checks
   - Test multi-property support

### **Phase 2: Frontend Components** (Day 2-3)

1. ✅ **Create Service Layer**
   - Create `userManagementService.ts`
   - Add all CRUD methods
   - Add password generation

2. ✅ **Create Components**
   - Create `CreateUserModal.tsx`
   - Create `EditUserModal.tsx`
   - Create `UserManagementSection.tsx` (for Settings)

3. ✅ **Test Components**
   - Test form validation
   - Test API integration
   - Test error handling

### **Phase 3: Integration** (Day 3-4)

1. ✅ **Enhance AdminUserManagement**
   - Connect "Add User" button to CreateUserModal
   - Add Edit functionality
   - Test end-to-end flow

2. ✅ **Add to System Settings**
   - Add User Management tab
   - Integrate UserManagementSection
   - Test navigation

3. ✅ **Add to Header Settings**
   - Add "User & Access Management" menu item
   - Link to User Management page or modal

### **Phase 4: Testing & Polish** (Day 4-5)

1. ✅ **End-to-End Testing**
   - Test complete user creation flow
   - Test user editing
   - Test user deletion
   - Test multi-property scenarios

2. ✅ **Security Testing**
   - Test permission boundaries
   - Test cross-property access prevention
   - Test password handling

3. ✅ **UX Polish**
   - Add loading states
   - Add success/error messages
   - Add confirmation dialogs
   - Mobile responsiveness

### **Phase 5: Documentation** (Day 5)

1. ✅ **API Documentation**
   - Document all new endpoints
   - Add request/response examples
   - Update Swagger docs

2. ✅ **User Guide**
   - Create user creation tutorial
   - Document role permissions
   - Add screenshots

---

## 🧪 TESTING PLAN

### **Unit Tests**

```javascript
// Backend Tests
describe('User Management Controller', () => {
  it('should create a new admin user', async () => {});
  it('should reject invalid email', async () => {});
  it('should prevent duplicate emails', async () => {});
  it('should hash password before saving', async () => {});
  it('should enforce property ownership', async () => {});
});

// Frontend Tests
describe('CreateUserModal', () => {
  it('should render form fields', () => {});
  it('should validate required fields', () => {});
  it('should generate password', () => {});
  it('should submit form data', () => {});
});
```

### **Integration Tests**

```javascript
describe('User Creation Flow', () => {
  it('should create admin user end-to-end', async () => {
    // 1. Open modal
    // 2. Fill form
    // 3. Submit
    // 4. Verify user in database
    // 5. Verify welcome email sent
  });
});
```

### **Manual Testing Checklist**

```markdown
## User Creation
- [ ] Open Settings → System Settings → User Management
- [ ] Click "Create User" button
- [ ] Fill in all required fields
- [ ] Generate temporary password
- [ ] Select role (Admin, Manager, Staff)
- [ ] Select primary property
- [ ] Add additional properties
- [ ] Set multi-property permissions
- [ ] Enable/disable account
- [ ] Toggle welcome email
- [ ] Submit form
- [ ] Verify success message
- [ ] Verify user appears in list
- [ ] Verify user can log in with temp password
- [ ] Verify forced password change on first login

## User Editing
- [ ] Click Edit on existing user
- [ ] Modify user details
- [ ] Change role
- [ ] Update property access
- [ ] Submit changes
- [ ] Verify updates saved

## User Deletion
- [ ] Click Delete on user
- [ ] Confirm deletion
- [ ] Verify user deactivated
- [ ] Verify user cannot log in

## Permissions
- [ ] Verify only admin/manager can access
- [ ] Verify property ownership enforced
- [ ] Verify cannot delete self
- [ ] Verify cannot escalate privileges

## Multi-Property
- [ ] Create user with multiple properties
- [ ] Verify user can switch between properties
- [ ] Verify permissions apply correctly
- [ ] Verify inheritance rules work
```

---

## 🎯 SUCCESS CRITERIA

- ✅ Admins can create new users (Admin, Manager, Staff) from Settings
- ✅ All user fields can be configured (name, email, role, properties)
- ✅ Temporary passwords are generated securely
- ✅ Welcome emails are sent with login credentials
- ✅ Multi-property access can be configured
- ✅ Property ownership is enforced
- ✅ Only authorized users can manage users
- ✅ Users cannot delete themselves
- ✅ All actions are validated and secure
- ✅ Clear error messages for validation failures
- ✅ Responsive UI works on mobile and desktop
- ✅ Integration with existing user management page
- ✅ Comprehensive audit logging

---

## 📞 NEXT STEPS

### **Immediate Actions**

1. **Review this plan** - Confirm approach is correct
2. **Prioritize features** - Decide which features are must-have vs nice-to-have
3. **Assign tasks** - Break down work into manageable chunks
4. **Set timeline** - Estimate completion date
5. **Begin implementation** - Start with Phase 1 (Backend)

### **Questions to Answer**

1. Should we do soft delete (set inactive) or hard delete (remove from DB)?
2. Should we allow users to reset other users' passwords?
3. Should we add email verification for new users?
4. Should we add 2FA support?
5. Should we track user creation/modification history in audit logs?

---

## 📊 ESTIMATED TIMELINE

| Phase | Duration | Effort |
|-------|----------|--------|
| Phase 1: Backend Foundation | 1-2 days | 12 hours |
| Phase 2: Frontend Components | 1-2 days | 12 hours |
| Phase 3: Integration | 1-2 days | 8 hours |
| Phase 4: Testing & Polish | 1-2 days | 8 hours |
| Phase 5: Documentation | 1 day | 4 hours |
| **TOTAL** | **5-9 days** | **44 hours** |

---

## ✨ CONCLUSION

This comprehensive plan provides:
- ✅ Complete backend infrastructure for user management
- ✅ Full-featured frontend UI components
- ✅ Security and validation at every layer
- ✅ Integration with existing systems
- ✅ Multiple access points (Settings, User Management page)
- ✅ Multi-property support
- ✅ Comprehensive testing strategy
- ✅ Clear implementation steps

**Ready to build a production-grade admin user management system!** 🚀

---

**Last Updated:** October 18, 2025
**Status:** Planning Complete - Ready for Implementation
**Next Action:** Review plan and begin Phase 1
