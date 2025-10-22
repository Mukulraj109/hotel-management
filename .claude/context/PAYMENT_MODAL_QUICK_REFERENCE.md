# Payment Collection Modal - Quick Reference Guide

## 🚀 Quick Start

### Basic Usage
```tsx
import PaymentCollectionModal from '@/components/admin/PaymentCollectionModal';

<PaymentCollectionModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  onConfirm={handlePayment}
  totalAmount={5000}
  currency="USD"
  bookingNumber="BK-12345"
  mode="checkin"
/>
```

---

## 📋 Props Reference

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `isOpen` | boolean | ✅ | - | Controls modal visibility |
| `onClose` | function | ✅ | - | Called when modal closes |
| `onConfirm` | function | ✅ | - | Called with payment data or null |
| `totalAmount` | number | ✅ | - | Total booking amount |
| `currency` | string | ✅ | - | Currency code (USD, EUR, etc.) |
| `bookingNumber` | string | ✅ | - | Booking reference number |
| `mode` | 'checkin' \| 'checkout' | ❌ | 'checkin' | Modal mode |
| `onBypassCheckout` | function | ❌ | - | Bypass checkout callback |
| `paidAmount` | number | ❌ | 0 | Already paid amount |

---

## 🎨 Visual Features

### Mode-Specific Colors

**Check-in Mode (Blue):**
- Header: Blue to Indigo gradient
- Primary Button: Blue gradient
- Progress Bar: Blue gradient

**Checkout Mode (Green):**
- Header: Green to Emerald gradient
- Primary Button: Green gradient
- Progress Bar: Green gradient when complete

### Payment Methods
Each method has unique styling:
- 💵 **Cash** - Green
- 💳 **Card** - Blue
- 📱 **UPI** - Purple
- 🌐 **Online Portal** - Cyan
- 🏢 **Corporate** - Orange

---

## 💡 Key Features

### 1. Quick Amount Buttons
Click to auto-fill amount:
- **Full** (100%) - Complete balance
- **75%** - Three-quarters
- **50%** - Half payment
- **25%** - Quarter payment

### 2. Auto-Save Draft
- Automatically saves payment entries
- Restores on modal reopen
- Cleared on successful submission

### 3. Two-Step Flow
**Step 1:** Enter payment details
- Select payment method
- Enter amount & reference
- Add multiple payments

**Step 2:** Review & Confirm
- Preview all payments
- See total collecting
- Final confirmation

### 4. Progress Visualization
- Shows payment completion percentage
- Color changes at 100%
- Displays remaining balance

---

## 🔧 Usage Scenarios

### Scenario 1: Check-in with Full Payment
```tsx
<PaymentCollectionModal
  isOpen={true}
  onClose={handleClose}
  onConfirm={(data) => {
    if (data) {
      // Process payment
      await collectPayment(data.paymentMethods);
      await checkInGuest();
    }
  }}
  totalAmount={5000}
  currency="USD"
  bookingNumber="BK-001"
  mode="checkin"
  paidAmount={0}
/>
```

### Scenario 2: Check-in with Skip Payment
```tsx
onConfirm={(data) => {
  if (data === null) {
    // User clicked "Skip Payment & Check In"
    await checkInGuest();
  } else {
    // User collected payment
    await collectPayment(data.paymentMethods);
    await checkInGuest();
  }
}}
```

### Scenario 3: Checkout with Partial Payment
```tsx
<PaymentCollectionModal
  isOpen={true}
  onClose={handleClose}
  onConfirm={(data) => {
    if (data) {
      await collectPayment(data.paymentMethods);
      await checkOutGuest();
    }
  }}
  totalAmount={5000}
  currency="USD"
  bookingNumber="BK-001"
  mode="checkout"
  paidAmount={2000} // $2000 already paid
  onBypassCheckout={handleBypass}
/>
```

### Scenario 4: Bypass Checkout
```tsx
onBypassCheckout={() => {
  // User clicked "Bypass Checkout"
  await bypassCheckout(bookingId);
}}
```

---

## 📊 Payment Data Structure

### onConfirm Returns
```typescript
// Payment collected
{
  paymentMethods: [
    {
      method: 'cash' | 'card' | 'upi' | 'online_portal' | 'corporate',
      amount: number,
      reference?: string,
      notes?: string
    }
  ]
}

// Payment skipped
null
```

### Example Payment Data
```json
{
  "paymentMethods": [
    {
      "method": "cash",
      "amount": 2500.00,
      "reference": "CASH-001",
      "notes": "First installment"
    },
    {
      "method": "card",
      "amount": 2500.00,
      "reference": "CARD-4532-****-1234",
      "notes": "Visa ending in 1234"
    }
  ]
}
```

---

## 🎯 Common Patterns

### Pattern 1: Single Payment Method
```tsx
// User adds one payment for full amount
const handleConfirm = async (data) => {
  if (!data) return;

  const payment = data.paymentMethods[0];
  await processPayment({
    bookingId,
    method: payment.method,
    amount: payment.amount,
    reference: payment.reference
  });
};
```

### Pattern 2: Split Payment
```tsx
// User adds multiple payment methods
const handleConfirm = async (data) => {
  if (!data) return;

  for (const payment of data.paymentMethods) {
    await processPayment({
      bookingId,
      method: payment.method,
      amount: payment.amount,
      reference: payment.reference
    });
  }
};
```

### Pattern 3: Partial Payment
```tsx
// User pays less than total
const handleConfirm = async (data) => {
  if (!data) return;

  const totalPaid = data.paymentMethods.reduce(
    (sum, p) => sum + p.amount,
    0
  );

  const remaining = totalAmount - paidAmount - totalPaid;

  await updateBooking({
    paymentMethods: data.paymentMethods,
    remainingBalance: remaining
  });
};
```

---

## 🎬 User Workflow

### Check-in Flow
1. Open modal
2. Select payment method (or use quick amount)
3. Enter amount and reference
4. Click "Add Payment Method"
5. Review payment breakdown
6. Click "Review & Check In"
7. Review details
8. Click "Confirm & Check In"

**OR** click "Skip Payment & Check In" at any time

### Checkout Flow
1. Open modal
2. See already paid amount
3. See balance due
4. Add payment methods for balance
5. Click "Review & Checkout"
6. Review details
7. Click "Confirm & Checkout"

**OR** click "Bypass Checkout" to skip payment

---

## 🔍 Debugging Tips

### Check Draft Storage
```javascript
// View saved draft
const draft = localStorage.getItem('payment-draft-BK-12345');
console.log(JSON.parse(draft));

// Clear draft manually
localStorage.removeItem('payment-draft-BK-12345');
```

### Verify Payment Calculation
```javascript
const totalPaid = paymentMethods.reduce((sum, p) => sum + p.amount, 0);
const remaining = totalAmount - paidAmount - totalPaid;
const progress = ((paidAmount + totalPaid) / totalAmount) * 100;

console.log({
  totalAmount,
  paidAmount,
  totalPaid,
  remaining,
  progress: `${progress.toFixed(0)}%`
});
```

---

## ⚡ Performance Tips

### Optimization Opportunities
```tsx
// Memoize calculations
const balanceAmount = useMemo(
  () => totalAmount - paidAmount,
  [totalAmount, paidAmount]
);

const progressPercentage = useMemo(
  () => balanceAmount > 0 ? ((paidAmount + totalPaid) / totalAmount) * 100 : 0,
  [balanceAmount, paidAmount, totalPaid, totalAmount]
);

// Memoize handlers
const handleQuickAmount = useCallback((percentage: number) => {
  const amount = (balanceAmount * percentage) / 100;
  setCurrentAmount(amount.toFixed(2));
}, [balanceAmount]);
```

---

## 🐛 Common Issues & Solutions

### Issue 1: Draft Not Loading
**Problem:** Saved payments don't restore on reopen
**Solution:** Check localStorage key format: `payment-draft-${bookingNumber}`

### Issue 2: Progress Bar Not Updating
**Problem:** Progress bar doesn't reflect payments
**Solution:** Ensure `paidAmount` prop is passed correctly

### Issue 3: Button Disabled When It Shouldn't Be
**Problem:** "Review & Check In" button is disabled
**Solution:** Check that `totalPaid > 0` (at least one payment added)

### Issue 4: Modal Not Closing After Confirm
**Problem:** Modal stays open after confirmation
**Solution:** Ensure `onConfirm` is calling parent's close handler

---

## 📱 Responsive Breakpoints

```css
/* Mobile: < 640px */
- Single column layout
- Full width buttons
- Stacked payment summary

/* Tablet: 640px - 1024px */
- 2 column payment summary
- Side-by-side buttons

/* Desktop: > 1024px */
- 4 column payment summary
- 3 column payment methods
- 2 column form layout
```

---

## 🎨 Customization

### Change Mode Colors
```tsx
const getModeGradient = () => {
  if (mode === 'checkout') {
    return 'from-green-500 via-green-600 to-emerald-600';
  }
  return 'from-blue-500 via-blue-600 to-indigo-600';
};
```

### Add Payment Method
```tsx
const paymentMethodConfig = {
  // ... existing methods
  crypto: {
    icon: Bitcoin,
    label: 'Cryptocurrency',
    color: 'from-yellow-500 to-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-500',
    textColor: 'text-yellow-700'
  }
};
```

### Modify Quick Amounts
```tsx
const quickAmountTemplates = [
  { label: 'Full', percentage: 100, icon: CheckCircle2 },
  { label: '50%', percentage: 50, icon: Percent },
  { label: '25%', percentage: 25, icon: Percent },
  { label: '10%', percentage: 10, icon: Percent } // New
];
```

---

## 🔐 Security Considerations

1. **Validate amounts server-side**
   - Don't trust client-side calculations
   - Verify payment total matches balance

2. **Sanitize reference numbers**
   - Remove special characters
   - Limit length
   - Check for duplicates

3. **Audit logging**
   - Log all payment entries
   - Track who collected payment
   - Record timestamps

---

## 📞 Support

### Related Components
- `NoShowModal.tsx` - Similar design pattern
- `BookingEditModal.tsx` - Uses payment modal
- `AdminBookings.tsx` - Parent component

### Related Files
- `frontend/src/index.css` - Animation styles
- `utils/dashboardUtils.ts` - formatCurrency helper

---

## ✅ Testing Checklist

### Functional Tests
- [ ] Modal opens and closes
- [ ] Quick amounts populate correctly
- [ ] Multiple payments can be added
- [ ] Payments can be removed
- [ ] Running total updates
- [ ] Progress bar reflects status
- [ ] Draft saves and loads
- [ ] Confirmation shows all details
- [ ] Skip payment works
- [ ] Bypass checkout works (checkout mode)

### Visual Tests
- [ ] Gradient header displays
- [ ] Payment methods highlight on select
- [ ] Animations are smooth
- [ ] Colors match mode
- [ ] Responsive on mobile
- [ ] Icons display correctly

### Edge Cases
- [ ] Zero amount handling
- [ ] Overpayment prevention
- [ ] 100% payment completion
- [ ] Empty payment list
- [ ] Very large amounts
- [ ] Multiple same payment methods

---

**Last Updated:** 2025-10-18
**Component Version:** 2.0 (Redesigned)
**Status:** Production Ready
