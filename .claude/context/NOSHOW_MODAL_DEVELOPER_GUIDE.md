# NoShowModal Component - Developer Guide

## Quick Reference

### File Location
```
frontend/src/components/admin/NoShowModal.tsx
```

### Component Usage
```tsx
import NoShowModal from '@/components/admin/NoShowModal';

<NoShowModal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  booking={selectedBooking}
  onSuccess={() => {
    // Handle success callback
    console.log('Booking marked as no-show');
  }}
/>
```

---

## Props Interface

```tsx
interface NoShowModalProps {
  isOpen: boolean;              // Controls modal visibility
  onClose: () => void;          // Callback when modal closes
  booking: {                    // Booking object to mark as no-show
    _id: string;                // Booking ID (required for API call)
    bookingNumber: string;      // Display booking number
    userId?: { name: string };  // Guest name
    checkIn: string;            // Check-in date (ISO string)
    checkOut: string;           // Check-out date (ISO string)
    totalAmount: number;        // Total booking amount
    currency: string;           // Currency code (e.g., 'USD')
    status: string;             // Current booking status
  };
  onSuccess?: () => void;       // Optional success callback
}
```

---

## Key Features

### 1. Two-Step Process
- **Step 1**: Enter details (reason + charge amount)
- **Step 2**: Review and confirm

### 2. Quick Select Buttons

#### Reason Quick Selects:
```tsx
const recentReasons = [
  'Guest did not arrive',
  'No communication from guest',
  'Unable to contact guest',
  'Booking not honored'
];
```

#### Amount Quick Selects:
- 0% - No charge
- 25% - Quarter of total
- 50% - Half of total
- 75% - Three-quarters
- 100% - Full amount

### 3. Auto-save Draft
- Saves to localStorage on every change
- Key: `no-show-draft-${booking._id}`
- Loads automatically when modal reopens
- Clears on successful submission

### 4. Form Validation

```tsx
// Reason validation
- Required field
- Maximum 500 characters
- Cannot be empty or whitespace only

// Charge amount validation
- Cannot be negative
- Cannot exceed booking total amount
- Must be a valid number
```

---

## API Integration

### Endpoint
```
POST /api/v1/bookings/:id/no-show
```

### Request Headers
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {token}"
}
```

### Request Body
```json
{
  "reason": "Guest did not arrive",
  "chargeAmount": 125.50
}
```

### Success Response
```json
{
  "success": true,
  "data": {
    // Updated booking object
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message here"
}
```

---

## State Management

### Internal State
```tsx
const [formData, setFormData] = useState<NoShowFormData>({
  reason: '',
  chargeAmount: 0
});

const [errors, setErrors] = useState<Partial<NoShowFormData>>({});

const [showConfirmation, setShowConfirmation] = useState(false);
```

### React Query Integration
```tsx
const markAsNoShowMutation = useMutation({
  mutationFn: async (data: NoShowFormData) => { ... },
  onSuccess: (data) => {
    // Invalidate queries
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
    queryClient.invalidateQueries({ queryKey: ['booking-details', booking._id] });
  },
  onError: (error: Error) => { ... }
});
```

---

## UI Components Used

### From shadcn/ui:
```tsx
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
```

### Icons from lucide-react:
```tsx
import {
  X,
  AlertTriangle,
  DollarSign,
  FileText,
  Calendar,
  User,
  Clock,
  CheckCircle2,
  Percent,
  CreditCard,
  TrendingUp
} from 'lucide-react';
```

---

## Helper Functions

### Currency Formatting
```tsx
const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD'
  }).format(amount);
};

// Usage: formatCurrency(250.00, 'USD') => "$250.00"
```

### Date Formatting
```tsx
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Usage: formatDate('2025-01-15') => "Mon, Jan 15, 2025"
```

### Status Color Mapping
```tsx
const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    confirmed: 'info',
    pending: 'warning',
    cancelled: 'error',
    completed: 'success'
  };
  return colors[status.toLowerCase()] || 'default';
};
```

### Quick Amount Calculator
```tsx
const handleQuickAmount = (percentage: number) => {
  const amount = (booking.totalAmount * percentage) / 100;
  setFormData(prev => ({
    ...prev,
    chargeAmount: parseFloat(amount.toFixed(2))
  }));
};
```

---

## Event Handlers

### Form Submission
```tsx
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();

  if (!validateForm()) {
    return;
  }

  // Show confirmation step
  setShowConfirmation(true);
};
```

### Final Confirmation
```tsx
const handleConfirm = () => {
  setShowConfirmation(false);
  markAsNoShowMutation.mutate(formData);
};
```

### Modal Close
```tsx
const handleClose = () => {
  setFormData({ reason: '', chargeAmount: 0 });
  setErrors({});
  setShowConfirmation(false);
  localStorage.removeItem(`no-show-draft-${booking._id}`);
  onClose();
};
```

---

## Styling Classes

### Gradient Backgrounds
```tsx
// Step 1 header
className="bg-gradient-to-br from-red-500 via-red-600 to-orange-600"

// Step 2 header
className="bg-gradient-to-br from-orange-500 via-orange-600 to-red-600"

// Primary button
className="bg-gradient-to-r from-red-500 to-red-600
           hover:from-red-600 hover:to-red-700"
```

### Information Cards
```tsx
// Guest card (Blue)
className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200"

// Date card (Purple)
className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200"

// Amount card (Green)
className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200"

// Status card (Orange)
className="bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-200"
```

---

## Responsive Design

### Grid Layout
```tsx
// Desktop: 2 columns, Mobile: 1 column
className="grid grid-cols-1 md:grid-cols-2 gap-4"
```

### Modal Size
```tsx
// Responsive width with max constraint
className="max-w-3xl max-h-[90vh] overflow-y-auto"
```

### Button Spacing
```tsx
// Equal width buttons on all screen sizes
className="flex gap-3"
// Each button: className="flex-1 py-6"
```

---

## localStorage Integration

### Save Draft
```tsx
useEffect(() => {
  if (formData.reason) {
    localStorage.setItem(
      `no-show-draft-${booking._id}`,
      JSON.stringify(formData)
    );
  }
}, [formData, booking._id]);
```

### Load Draft
```tsx
useEffect(() => {
  if (isOpen) {
    const draft = localStorage.getItem(`no-show-draft-${booking._id}`);
    if (draft) {
      try {
        const savedData = JSON.parse(draft);
        setFormData(savedData);
      } catch (error) {
        console.error('Failed to load draft:', error);
      }
    }
  }
}, [isOpen, booking._id]);
```

### Clear Draft
```tsx
// On success or modal close
localStorage.removeItem(`no-show-draft-${booking._id}`);
```

---

## Testing Guide

### Manual Testing Checklist

#### Step 1: Enter Details
- [ ] Open modal - verify gradient header displays
- [ ] Click each quick reason button - verify text fills textarea
- [ ] Type in reason field - verify character counter updates
- [ ] Type over 400 characters - verify counter turns orange
- [ ] Type over 450 characters - verify counter turns red
- [ ] Type over 500 characters - verify validation error
- [ ] Click 0% button - verify charge amount = 0
- [ ] Click 25% button - verify charge amount = 25% of total
- [ ] Click 50% button - verify charge amount = 50% of total
- [ ] Click 75% button - verify charge amount = 75% of total
- [ ] Click 100% button - verify charge amount = 100% of total
- [ ] Manually enter amount - verify percentage updates
- [ ] Enter negative amount - verify validation error
- [ ] Enter amount > total - verify validation error
- [ ] Click "Continue to Review" - verify Step 2 displays

#### Step 2: Review & Confirm
- [ ] Verify header gradient changes (orange-red)
- [ ] Verify all entered data displays correctly
- [ ] Verify charge amount and percentage show
- [ ] Click "Go Back" - verify return to Step 1 with data intact
- [ ] Click "Confirm No-Show" - verify loading spinner shows
- [ ] Verify success toast appears
- [ ] Verify modal closes
- [ ] Verify queries invalidated (data refreshes)

#### Draft Auto-save
- [ ] Enter data in form
- [ ] Close modal without submitting
- [ ] Reopen modal
- [ ] Verify data was restored from draft
- [ ] Submit successfully
- [ ] Reopen modal
- [ ] Verify draft was cleared (fresh form)

#### Responsive Design
- [ ] Test on mobile viewport (< 768px)
- [ ] Test on tablet viewport (768px - 1024px)
- [ ] Test on desktop viewport (> 1024px)
- [ ] Verify all buttons are touch-friendly
- [ ] Verify grid changes from 2-col to 1-col on mobile

#### Accessibility
- [ ] Tab through all elements - verify focus states
- [ ] Press ESC - verify modal closes
- [ ] Use screen reader - verify all labels read correctly
- [ ] Verify high contrast mode works
- [ ] Check all color combinations for WCAG AA compliance

---

## Common Customizations

### Change Quick Reason Options
```tsx
const [recentReasons] = useState([
  'Custom reason 1',
  'Custom reason 2',
  'Custom reason 3',
  'Custom reason 4'
]);
```

### Change Quick Amount Percentages
```tsx
// In the render, change:
{[0, 25, 50, 75, 100].map((percentage) => ...)}

// To your custom percentages:
{[0, 10, 20, 50, 100].map((percentage) => ...)}
```

### Change Character Limit
```tsx
// Update validation:
else if (formData.reason.length > 1000) {  // Changed from 500
  newErrors.reason = 'Reason must be less than 1000 characters';
}

// Update display:
{formData.reason.length}/1000  // Changed from 500
```

### Change Color Scheme
```tsx
// Update gradients in className props:
// Header: from-blue-500 via-blue-600 to-purple-600
// Cards: from-teal-50 to-teal-100/50
// Buttons: from-blue-500 to-blue-600
```

---

## Troubleshooting

### Issue: Modal doesn't open
**Solution**: Verify `isOpen` prop is set to `true`

### Issue: Draft not loading
**Solution**: Check localStorage is enabled and booking._id is valid

### Issue: API call fails
**Solution**: Verify token in localStorage and endpoint is correct

### Issue: Validation errors not showing
**Solution**: Check error state is properly set in validateForm()

### Issue: Styles not applying
**Solution**: Ensure Tailwind CSS is properly configured

### Issue: Icons not displaying
**Solution**: Verify lucide-react is installed: `npm install lucide-react`

---

## Performance Tips

1. **Memoize formatters** if used in large lists:
```tsx
const memoizedFormatCurrency = useMemo(
  () => formatCurrency(booking.totalAmount, booking.currency),
  [booking.totalAmount, booking.currency]
);
```

2. **Debounce auto-save** for better performance:
```tsx
import { debounce } from 'lodash';

const debouncedSave = useMemo(
  () => debounce((data) => {
    localStorage.setItem(`no-show-draft-${booking._id}`, JSON.stringify(data));
  }, 500),
  [booking._id]
);
```

3. **Lazy load if not immediately needed**:
```tsx
const NoShowModal = lazy(() => import('@/components/admin/NoShowModal'));

// Use with Suspense
<Suspense fallback={<LoadingSpinner />}>
  <NoShowModal {...props} />
</Suspense>
```

---

## Dependencies

### Required:
- React 18+
- TypeScript 4.5+
- @tanstack/react-query
- react-hot-toast
- lucide-react
- Tailwind CSS

### Optional:
- lodash (for debounce)

---

## Version History

### v2.0.0 (2025-10-18) - Complete Redesign
- Added two-step confirmation process
- Added quick select buttons
- Added auto-save draft functionality
- Redesigned UI with gradients and modern design
- Improved accessibility
- Enhanced validation feedback
- Added progress indicator
- Improved responsive design

### v1.0.0 (Original)
- Basic modal functionality
- Simple form with reason and charge amount
- Basic validation
- API integration

---

## Support & Maintenance

### When to Update:
- When UI components are updated
- When API endpoint changes
- When validation rules change
- When new features are requested

### Where to Get Help:
- Check this guide first
- Review the full redesign report in `.claude/context/`
- Check UI component documentation
- Review API documentation

---

**Last Updated**: 2025-10-18
**Maintained By**: Development Team
**Status**: Production Ready ✅
