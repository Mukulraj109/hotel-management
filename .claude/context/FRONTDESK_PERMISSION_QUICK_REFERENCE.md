# FrontDesk Permission System - Quick Reference Guide

## 🎯 Quick Start

### Import Permission Components
```tsx
// Import the hook
import { usePermissions } from '../hooks/usePermissions';

// Import components
import { RoleGate, PermissionButton } from '../components/permissions';
```

## 📋 Common Use Cases

### 1. Hide Content Based on Role
```tsx
// Hide from guests
<RoleGate allowedRoles={['admin', 'frontdesk', 'staff']}>
  <StaffOnlyContent />
</RoleGate>

// Admin only
<RoleGate allowedRoles={['admin']}>
  <AdminPanel />
</RoleGate>

// Admin and FrontDesk only
<RoleGate allowedRoles={['admin', 'frontdesk']}>
  <ManagementTools />
</RoleGate>
```

### 2. Show Error Message Instead of Hiding
```tsx
<RoleGate allowedRoles={['admin']} showError>
  <FinancialDashboard />
</RoleGate>

// User without permission sees:
// [!] Access Denied
// You don't have permission to view this content.
// Required roles: admin
```

### 3. Conditional Rendering with Fallback
```tsx
<RoleGate
  allowedRoles={['admin']}
  fallback={<LimitedDashboard />}
>
  <FullDashboard />
</RoleGate>

// Admin sees: FullDashboard
// Others see: LimitedDashboard
```

### 4. Disable Buttons Based on Permission
```tsx
// Role-based
<PermissionButton
  requiredRole="admin"
  onClick={handleDelete}
  variant="destructive"
>
  Delete
</PermissionButton>

// Resource + action based
<PermissionButton
  requiredPermission={{ resource: 'bookings', action: 'edit' }}
  onClick={handleEdit}
>
  Edit Booking
</PermissionButton>

// Multiple roles allowed
<PermissionButton
  requiredRole={['admin', 'frontdesk']}
  onClick={handleApprove}
>
  Approve Request
</PermissionButton>
```

### 5. Use Permission Hook for Complex Logic
```tsx
function BookingCard({ booking }) {
  const permissions = usePermissions();

  return (
    <div>
      <h3>{booking.guestName}</h3>

      {/* Show different actions based on role */}
      <div className="actions">
        {permissions.canEdit('bookings') && (
          <button onClick={handleEdit}>Edit</button>
        )}

        {permissions.canDelete('bookings') && (
          <button onClick={handleDelete}>Delete</button>
        )}

        {permissions.canApprove() && (
          <button onClick={handleApprove}>Approve</button>
        )}
      </div>

      {/* Show financial info only to admin */}
      {permissions.canAccessFinancials() && (
        <div className="financial-section">
          <p>Revenue: ${booking.totalAmount}</p>
          <p>Commission: ${booking.commission}</p>
        </div>
      )}
    </div>
  );
}
```

### 6. Different Views for Different Roles
```tsx
function Dashboard() {
  const permissions = usePermissions();

  if (permissions.isAdmin()) {
    return <AdminDashboard />;
  }

  if (permissions.isFrontDesk()) {
    return <FrontDeskDashboard />;
  }

  if (permissions.isStaff()) {
    return <StaffDashboard />;
  }

  return <GuestDashboard />;
}
```

## 🔑 usePermissions Hook API

### Boolean Checks
```tsx
const permissions = usePermissions();

// Role checks
permissions.isAdmin()           // true if user is admin
permissions.isFrontDesk()       // true if user is frontdesk
permissions.isStaff()           // true if user is staff
permissions.isGuest()           // true if user is guest
permissions.hasRole('admin')    // true if user has specific role
permissions.hasRole(['admin', 'frontdesk']) // true if user has any of these roles

// Action checks
permissions.canEdit('bookings')      // Can user edit this resource?
permissions.canDelete('bookings')    // Can user delete this resource?
permissions.canView('bookings')      // Can user view this resource?
permissions.canApprove()             // Can user approve bypasses?

// Special checks
permissions.canAccessFinancials()    // Can view financial data
permissions.canManageStaff()         // Can manage staff
permissions.canManageRoomTypes()     // Can create/delete room types
```

### Editable Resources by Role

#### Admin (can edit everything)
All resources

#### FrontDesk (limited edit access)
- bookings
- rooms
- housekeeping
- maintenance
- guest-services
- service-requests
- inventory-requests
- daily-check
- checkout
- billing
- payments
- meet-up
- supply-requests

#### Staff (very limited)
- service-requests
- inventory-requests
- daily-check

#### Guest (no edit access)
None

### Deletable Resources by Role

#### Admin (can delete most things)
All resources

#### FrontDesk (very limited)
- service-requests
- inventory-requests

#### Staff & Guest
None

## 🧩 Component Props Reference

### RoleGate Props
```tsx
interface RoleGateProps {
  allowedRoles: string[];        // Required: ['admin', 'frontdesk', etc.]
  children: ReactNode;           // Required: Content to show if allowed
  fallback?: ReactNode;          // Optional: Content to show if denied
  showError?: boolean;           // Optional: Show error message (default: false)
}
```

### PermissionButton Props
```tsx
interface PermissionButtonProps {
  // Permission settings (choose one)
  requiredRole?: string | string[];              // e.g., 'admin' or ['admin', 'frontdesk']
  requiredPermission?: {                         // e.g., { resource: 'bookings', action: 'edit' }
    resource: string;
    action: 'view' | 'edit' | 'delete' | 'approve';
  };

  // UI settings
  tooltipMessage?: string;       // Custom tooltip (default: "You don't have permission...")
  children: ReactNode;           // Button content
  disabled?: boolean;            // External disabled state
  loading?: boolean;             // Loading state
  onClick?: () => void;          // Click handler

  // Button variants (from Button component)
  variant?: 'default' | 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'danger';
  size?: 'default' | 'sm' | 'md' | 'lg';
  className?: string;
}
```

## 📊 Permission Matrix

| Action | Admin | FrontDesk | Staff | Guest |
|--------|-------|-----------|-------|-------|
| **View Bookings** | ✅ | ✅ | ✅ | Own only |
| **Edit Bookings** | ✅ | ✅ | ❌ | ❌ |
| **Delete Bookings** | ✅ | ❌ | ❌ | ❌ |
| **Approve Bypasses** | ✅ | ✅ | ❌ | ❌ |
| **View Financials** | ✅ | ❌ | ❌ | ❌ |
| **Manage Staff** | ✅ | ✅ | ❌ | ❌ |
| **Manage Room Types** | ✅ | View only | ❌ | ❌ |
| **Service Requests** | ✅ | ✅ | Edit only | ❌ |
| **API Management** | ✅ | ❌ | ❌ | ❌ |
| **Security Dashboard** | ✅ | ❌ | ❌ | ❌ |

## 💡 Best Practices

### 1. Use RoleGate for Large Content Blocks
```tsx
// ✅ Good - Hide entire section
<RoleGate allowedRoles={['admin']}>
  <AdminPanel />
</RoleGate>

// ❌ Bad - Manually checking
{user?.role === 'admin' && <AdminPanel />}
```

### 2. Use PermissionButton for Action Buttons
```tsx
// ✅ Good - Automatic disable + tooltip
<PermissionButton
  requiredRole="admin"
  onClick={handleDelete}
>
  Delete
</PermissionButton>

// ❌ Bad - Manual implementation
<Button
  disabled={user?.role !== 'admin'}
  onClick={handleDelete}
>
  Delete
</Button>
```

### 3. Use usePermissions for Complex Conditional Logic
```tsx
// ✅ Good - Clear and readable
const permissions = usePermissions();
if (permissions.canEdit('bookings') && booking.status === 'pending') {
  // Allow edit
}

// ❌ Bad - Hardcoded role checks
if (user?.role === 'admin' || user?.role === 'frontdesk') {
  // Fragile and hard to maintain
}
```

### 4. Combine Multiple Permission Checks
```tsx
const permissions = usePermissions();

const canModifyBooking =
  permissions.canEdit('bookings') &&
  booking.status !== 'completed' &&
  booking.checkInDate > new Date();

return (
  <PermissionButton
    requiredPermission={{ resource: 'bookings', action: 'edit' }}
    disabled={!canModifyBooking}
    onClick={handleModify}
  >
    Modify Booking
  </PermissionButton>
);
```

### 5. Show Appropriate Fallback Content
```tsx
// ✅ Good - Informative fallback
<RoleGate
  allowedRoles={['admin']}
  fallback={
    <div className="bg-blue-50 p-4 rounded">
      <p>Contact your administrator for financial reports.</p>
    </div>
  }
>
  <FinancialReport />
</RoleGate>

// ✅ Also good - Show error
<RoleGate allowedRoles={['admin']} showError>
  <FinancialReport />
</RoleGate>
```

## 🎨 Styling Tips

### Custom Tooltip Messages
```tsx
<PermissionButton
  requiredRole="admin"
  tooltipMessage="Only administrators can delete users"
  onClick={handleDelete}
  variant="destructive"
>
  Delete User
</PermissionButton>
```

### Disabled Button Styling
The PermissionButton automatically applies disabled styles:
- Reduced opacity (opacity-50)
- Not-allowed cursor
- No hover effects

### Error Message Styling
The RoleGate error message uses:
- Red color scheme (bg-red-50, text-red-800)
- Alert icon
- Required roles display

## 🔄 HOC Pattern (Advanced)

### Protect Entire Components
```tsx
import { withRoleGate } from '../components/permissions';

// Component
function AdminSettings() {
  return <div>Admin Settings</div>;
}

// Wrap with HOC
export default withRoleGate(AdminSettings, ['admin']);

// Now AdminSettings is automatically protected
// Only admins can see it, others see nothing
```

### With Custom Fallback
```tsx
const ProtectedSettings = withRoleGate(
  AdminSettings,
  ['admin'],
  <div>Access denied</div>
);
```

## 🧪 Testing Examples

### Test Permission Hook
```tsx
import { renderHook } from '@testing-library/react-hooks';
import { usePermissions } from '../hooks/usePermissions';

test('admin can edit all resources', () => {
  // Mock user as admin
  const { result } = renderHook(() => usePermissions());

  expect(result.current.canEdit('bookings')).toBe(true);
  expect(result.current.canDelete('bookings')).toBe(true);
  expect(result.current.isAdmin()).toBe(true);
});
```

### Test RoleGate Component
```tsx
import { render, screen } from '@testing-library/react';
import { RoleGate } from '../components/permissions';

test('shows content for allowed roles', () => {
  render(
    <RoleGate allowedRoles={['admin']}>
      <div>Admin Content</div>
    </RoleGate>
  );

  expect(screen.getByText('Admin Content')).toBeInTheDocument();
});
```

## 📦 Import Paths

```tsx
// Hook
import { usePermissions } from '@/hooks/usePermissions';

// Components (individual)
import { RoleGate } from '@/components/permissions/RoleGate';
import { PermissionButton } from '@/components/permissions/PermissionButton';

// Components (from index)
import { RoleGate, PermissionButton, withRoleGate } from '@/components/permissions';
```

## 🚀 Ready-to-Use Code Snippets

### Protected Page Template
```tsx
import { RoleGate } from '@/components/permissions';

export default function ProtectedPage() {
  return (
    <RoleGate allowedRoles={['admin', 'frontdesk']} showError>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Protected Page</h1>
        {/* Your content */}
      </div>
    </RoleGate>
  );
}
```

### Action Bar with Permissions
```tsx
import { PermissionButton } from '@/components/permissions';

function ActionBar({ item }) {
  return (
    <div className="flex gap-2">
      <PermissionButton
        requiredPermission={{ resource: 'bookings', action: 'edit' }}
        onClick={() => handleEdit(item)}
      >
        Edit
      </PermissionButton>

      <PermissionButton
        requiredPermission={{ resource: 'bookings', action: 'delete' }}
        onClick={() => handleDelete(item)}
        variant="destructive"
      >
        Delete
      </PermissionButton>

      <PermissionButton
        requiredRole={['admin', 'frontdesk']}
        onClick={() => handleApprove(item)}
        variant="primary"
      >
        Approve
      </PermissionButton>
    </div>
  );
}
```

### Multi-Role Dashboard
```tsx
import { usePermissions } from '@/hooks/usePermissions';
import { RoleGate } from '@/components/permissions';

function Dashboard() {
  const permissions = usePermissions();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Everyone sees this */}
      <StatCard title="Total Bookings" value={123} />

      {/* Admin and FrontDesk only */}
      <RoleGate allowedRoles={['admin', 'frontdesk']}>
        <StatCard title="Pending Approvals" value={5} />
      </RoleGate>

      {/* Admin only */}
      <RoleGate allowedRoles={['admin']}>
        <StatCard title="Total Revenue" value="$12,345" />
      </RoleGate>

      {/* Conditional rendering */}
      {permissions.canAccessFinancials() && (
        <FinancialChart />
      )}
    </div>
  );
}
```
