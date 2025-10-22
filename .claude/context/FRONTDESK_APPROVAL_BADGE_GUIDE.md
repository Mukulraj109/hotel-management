# FrontDesk Approval Badge - Implementation Guide

## Overview

The FrontDesk header includes a real-time approval notification badge that shows pending approval requests requiring attention from the logged-in frontdesk user.

## Visual Design

```
┌─────────────────────────────────────────────────────────────┐
│  ☰  Front Desk Dashboard    [Property Selector ▼]          │
│                                                              │
│                                    [🔔5] [⚙️] User [Logout] │
│                                       ↑                      │
│                                  Approval Badge              │
└─────────────────────────────────────────────────────────────┘

Badge Details:
┌─────────┐
│   ✓    │  <- CheckCircle icon
│   (5)  │  <- Orange badge with count
└─────────┘
    ↓
  Pulse animation
```

## Features

### 1. Real-Time Updates
- Fetches count every 60 seconds
- Uses React Query for caching and background updates
- Auto-refetches when window regains focus

### 2. Visual Indicators
- **Icon:** CheckCircle (Lucide icon)
- **Badge Color:** Orange (bg-orange-500)
- **Badge Position:** Top-right corner
- **Animation:** Pulse effect for attention
- **Count Display:**
  - 1-9: Show actual number
  - 10+: Show "9+"

### 3. Interactive
- Clickable link to `/frontdesk/my-approvals`
- Hover state with tooltip
- Tooltip shows: "X pending approval(s)"

### 4. Conditional Display
- Only shows when count > 0
- Hidden when no pending approvals
- Clean, uncluttered header when not needed

## Code Implementation

### FrontDeskHeader.tsx

```tsx
// 1. Import dependencies
import { CheckCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

// 2. Fetch pending approvals
const { data: pendingApprovalsData } = useQuery({
  queryKey: ['pending-approvals-count'],
  queryFn: async () => {
    try {
      const response = await api.get('/api/admin-bypass/approvals/pending');
      return response.data;
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      return { count: 0 };
    }
  },
  refetchInterval: 60000, // Refetch every minute
  enabled: !!user, // Only fetch if user is logged in
});

const pendingApprovalCount = pendingApprovalsData?.count || 0;

// 3. Render badge
{pendingApprovalCount > 0 && (
  <a
    href="/frontdesk/my-approvals"
    className="relative p-2 rounded-md text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
    title={`${pendingApprovalCount} pending approval${pendingApprovalCount > 1 ? 's' : ''}`}
  >
    <CheckCircle className="h-5 w-5" />
    {pendingApprovalCount > 0 && (
      <span className="absolute -top-1 -right-1 h-5 w-5 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
        {pendingApprovalCount > 9 ? '9+' : pendingApprovalCount}
      </span>
    )}
  </a>
)}
```

## API Endpoint

### GET /api/admin-bypass/approvals/pending

**Location:** `backend/src/routes/adminBypassManagement.js`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "bypassType": "checkout",
      "requestedBy": "...",
      "status": "pending",
      "createdAt": "2024-01-15T10:30:00Z",
      // ... other fields
    }
  ],
  "count": 5
}
```

**Authentication:** Required
**Roles:** admin, manager (frontdesk will be added)
**Property Filter:** Automatically filtered by user's property

## Styling Classes

### Container
```css
className="relative p-2 rounded-md text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
```

### Icon
```css
className="h-5 w-5"
```

### Badge
```css
className="absolute -top-1 -right-1 h-5 w-5 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse"
```

## States

### 1. No Approvals (count = 0)
```
[Header content]  [🔔] [⚙️] User [Logout]

Badge is hidden completely
```

### 2. Has Approvals (count = 3)
```
[Header content]  [✓3] [🔔] [⚙️] User [Logout]
                   ↑
              Pulsing orange badge
```

### 3. Many Approvals (count = 15)
```
[Header content]  [✓9+] [🔔] [⚙️] User [Logout]
                   ↑
              Shows "9+" instead of actual count
```

### 4. Loading
```
[Header content]  [🔔] [⚙️] User [Logout]

Badge doesn't show while loading (shows 0)
```

### 5. Error
```
[Header content]  [🔔] [⚙️] User [Logout]

Badge doesn't show on error (shows 0)
Error logged to console
```

## User Flow

1. **FrontDesk user logs in**
   - Header renders
   - Badge query starts
   - Loading state (no badge shown)

2. **Query completes**
   - If count > 0: Badge appears with number
   - If count = 0: Badge stays hidden

3. **User clicks badge**
   - Navigates to `/frontdesk/my-approvals`
   - Shows full list of pending approvals

4. **User approves/rejects items**
   - Count updates on next refetch (within 60 seconds)
   - Badge updates or disappears

5. **Background updates**
   - Every 60 seconds, count refreshes
   - Badge updates automatically
   - No page reload needed

## Integration with My Approvals Page

### Create MyApprovals.tsx

```tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export default function MyApprovals() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-approvals'],
    queryFn: async () => {
      const response = await api.get('/api/admin-bypass/approvals/pending');
      return response.data;
    },
  });

  const approvals = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">My Approval Requests</h1>
        <div className="text-sm text-gray-500">
          {approvals.length} pending request{approvals.length !== 1 ? 's' : ''}
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : approvals.length === 0 ? (
        <EmptyState message="No pending approvals" />
      ) : (
        <div className="space-y-4">
          {approvals.map((approval) => (
            <ApprovalCard key={approval._id} approval={approval} />
          ))}
        </div>
      )}
    </div>
  );
}
```

## Sidebar Integration

The sidebar includes a dedicated menu item:

```tsx
{
  name: 'My Approval Requests',
  href: '/frontdesk/my-approvals',
  icon: CheckCircle
}
```

Position: Last item in the navigation menu

## Performance Considerations

### 1. React Query Caching
- Cache time: 5 minutes (default)
- Stale time: 0 (always considered stale)
- Refetch on window focus: Enabled
- Background refetching: Every 60 seconds

### 2. Optimization
```tsx
const { data: pendingApprovalsData } = useQuery({
  queryKey: ['pending-approvals-count'],
  queryFn: async () => {
    try {
      const response = await api.get('/api/admin-bypass/approvals/pending');
      return response.data;
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      return { count: 0 }; // Graceful fallback
    }
  },
  refetchInterval: 60000,
  enabled: !!user, // Don't fetch if not logged in
  staleTime: 30000, // Consider fresh for 30 seconds
  cacheTime: 300000, // Keep in cache for 5 minutes
});
```

### 3. Network Efficiency
- Small payload (only count needed in header)
- Full data fetched only on approvals page
- Cached to reduce redundant requests
- Error handling prevents infinite retries

## Accessibility

### 1. Screen Readers
```tsx
title={`${pendingApprovalCount} pending approval${pendingApprovalCount > 1 ? 's' : ''}`}
```
Announces: "5 pending approvals"

### 2. Keyboard Navigation
- Link is keyboard focusable
- Focus ring visible (focus:ring-2)
- Enter key activates link

### 3. Visual Indicators
- High contrast badge (orange on white)
- Pulse animation for attention
- Icon + number for redundancy

## Testing Checklist

- [ ] Badge shows correct count from API
- [ ] Badge hidden when count is 0
- [ ] Badge shows "9+" when count > 9
- [ ] Badge pulses with animation
- [ ] Click navigates to /frontdesk/my-approvals
- [ ] Tooltip shows on hover
- [ ] Refetches every 60 seconds
- [ ] Gracefully handles API errors
- [ ] Only fetches when user logged in
- [ ] Updates when approvals processed
- [ ] Keyboard accessible
- [ ] Screen reader friendly

## Future Enhancements

### 1. Sound Notification
```tsx
// Play subtle sound when new approval arrives
useEffect(() => {
  if (prevCount < pendingApprovalCount) {
    playNotificationSound();
  }
}, [pendingApprovalCount]);
```

### 2. Desktop Notifications
```tsx
// Request permission and show browser notification
if (Notification.permission === 'granted') {
  new Notification('New Approval Request', {
    body: `You have ${pendingApprovalCount} pending approval requests`,
    icon: '/approval-icon.png'
  });
}
```

### 3. Priority Indicators
```tsx
// Show red badge for urgent approvals
const hasUrgent = approvals.some(a => a.priority === 'urgent');
const badgeColor = hasUrgent ? 'bg-red-500' : 'bg-orange-500';
```

### 4. Category Breakdown
```tsx
// Tooltip shows breakdown by type
title={`
  ${pendingApprovalCount} pending approvals:
  - Checkout: 3
  - Pricing: 2
`}
```

## Troubleshooting

### Badge not showing
1. Check if user is logged in
2. Verify API endpoint is accessible
3. Check browser console for errors
4. Verify query is enabled

### Count incorrect
1. Clear React Query cache
2. Refresh page
3. Check API response
4. Verify property filter

### Not updating
1. Check refetchInterval setting
2. Verify network connectivity
3. Check React Query devtools
4. Ensure window focus triggers refetch

## Summary

The approval badge provides:
- ✅ Real-time updates (60s interval)
- ✅ Visual prominence (orange + pulse)
- ✅ Direct navigation to approvals
- ✅ Graceful error handling
- ✅ Performance optimized
- ✅ Fully accessible
- ✅ Clean, professional UI
