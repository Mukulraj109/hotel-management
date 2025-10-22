# Guest Booking Detail Page - Visual Mockup

## Page Layout Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│ ← Back to My Bookings                                               │
│                                                                      │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │  🏠  Grand Hotel Mumbai                    [✓ Confirmed]        │ │
│ │      Booking #BKG123456789                 [💳 Paid]            │ │
│ │      📍 123 Marine Drive, Mumbai, Maharashtra                   │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ ┌──────────────────────┬──────────────────┐ ┌────────────────────┐ │
│ │ STAY DETAILS         │                  │ │ GUEST INFORMATION  │ │
│ │                      │                  │ │                    │ │
│ │ [Check-in Card]      │                  │ │ Name: John Doe     │ │
│ │ [Check-out Card]     │                  │ │ Email: john@...    │ │
│ │ [Duration Card]      │                  │ │ Phone: +91...      │ │
│ │                      │                  │ │ Guests: 2 Adults   │ │
│ ├──────────────────────┤                  │ ├────────────────────┤ │
│ │ PRICE INFORMATION ** │                  │ │ HOTEL CONTACT      │ │
│ │                      │                  │ │                    │ │
│ │ Current: ₹4,500      │                  │ │ 📞 Call Hotel      │ │
│ │ Original: ₹5,000     │                  │ │ 📧 Email Hotel     │ │
│ │ Discount: -₹500      │                  │ ├────────────────────┤ │
│ │                      │                  │ │ BOOKING TIMELINE   │ │
│ │ Reason: Loyalty...   │                  │ │                    │ │
│ │ Adjusted by: Admin   │                  │ │ Created: Jan 10... │ │
│ │                      │                  │ │ Updated: Jan 15... │ │
│ │ [View Price History] │                  │ └────────────────────┘ │
│ ├──────────────────────┤                  │                        │
│ │ ROOM DETAILS         │                  │                        │
│ │                      │                  │                        │
│ │ Room 101 - Deluxe... │                  │                        │ │
│ └──────────────────────┴──────────────────┘                        │
└─────────────────────────────────────────────────────────────────────┘
```

## Detailed Component Breakdown

### 1. Gradient Header (Full Width)
```
╔═══════════════════════════════════════════════════════════════════╗
║ ░░░░░░░░░░░░░░ GRADIENT: Yellow → Orange ░░░░░░░░░░░░░░░░░░░░░░░ ║
║ ░░░░░░░░░░░░░░ With Animated Blur Circles ░░░░░░░░░░░░░░░░░░░░░ ║
║                                                                    ║
║  ┌────┐                                                           ║
║  │ 🏠 │  Grand Hotel Mumbai              ┌──────────────────┐    ║
║  └────┘  Booking #BKG123456789           │ ✓ Confirmed      │    ║
║                                           └──────────────────┘    ║
║          📍 123 Marine Drive, Mumbai     ┌──────────────────┐    ║
║                                           │ 💳 Paid          │    ║
║                                           └──────────────────┘    ║
╚═══════════════════════════════════════════════════════════════════╝
```

### 2. Stay Details Card
```
┌─────────────────────────────────────────────────────────────┐
│ 📅 Stay Details                                             │
├─────────────────────────────────────────────────────────────┤
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│ │ 🔵 Check-in  │  │ 🟣 Check-out │  │ 🟢 Duration  │       │
│ │              │  │              │  │              │       │
│ │ Mon, Jan 15  │  │ Wed, Jan 17  │  │ 2 Nights     │       │
│ │ After 2PM    │  │ Before 11AM  │  │ Total stay   │       │
│ └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### 3. Price Information Card (NO Adjustments)
```
┌─────────────────────────────────────────────────────────────┐
│ 💰 Price Information                                        │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🟡 CURRENT PRICE                                        │ │
│ │                                                         │ │
│ │    ₹5,000                                               │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 4. Price Information Card (WITH Adjustments)
```
┌─────────────────────────────────────────────────────────────┐
│ 💰 Price Information                                        │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🟡 CURRENT PRICE           [✓ Price Adjusted]          │ │
│ │                                                         │ │
│ │    ₹4,500                                               │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Original Price             ₹̶5̶,̶0̶0̶0̶ (strikethrough)    │ │
│ │                                                         │ │
│ │ 🟢 Discount Applied                        -₹500       │ │
│ │                                                         │ │
│ │ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │ │
│ │                                                         │ │
│ │ ℹ️  ADJUSTMENT REASON                                   │ │
│ │     Loyalty discount for returning customer            │ │
│ │                                                         │ │
│ │ ┌────────────────────┐  ┌────────────────────┐         │ │
│ │ │ Adjusted By        │  │ Adjusted On        │         │ │
│ │ │ John Admin         │  │ Jan 15, 2025       │         │ │
│ │ │ Manager            │  │ 10:30 AM           │         │ │
│ │ └────────────────────┘  └────────────────────┘         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │         📜 View Full Price History                      │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 5. Price History Timeline (Expanded)
```
┌─────────────────────────────────────────────────────────────┐
│ 📜 Price Adjustment History                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┃ ┌──────────────────────────────────────────────┐         │
│ ┃ │ [DISCOUNT] 🟢                                │         │
│ ┃ │                                              │         │
│ ┃ │ ₹5,000 → ₹4,500  (-₹500)                    │         │
│ ┃ │                                              │         │
│ ┃ │ ┌──────────────────────────────────────────┐│         │
│ ┃ │ │ Loyalty discount for returning customer ││         │
│ ┃ │ └──────────────────────────────────────────┘│         │
│ ┃ │                                              │         │
│ ┃ │ 👤 John Admin (Manager)                     │         │
│ ┃ │ 🕐 Jan 15, 2025, 10:30 AM                   │         │
│ ┃ └──────────────────────────────────────────────┘         │
│                                                             │
│ ┃ ┌──────────────────────────────────────────────┐         │
│ ┃ │ [SURCHARGE] 🔴  [REVERSED]                  │         │
│ ┃ │                                              │         │
│ ┃ │ ₹4,500 → ₹4,700  (+₹200)                    │         │
│ ┃ │                                              │         │
│ ┃ │ ┌──────────────────────────────────────────┐│         │
│ ┃ │ │ Peak season surcharge                    ││         │
│ ┃ │ └──────────────────────────────────────────┘│         │
│ ┃ │                                              │         │
│ ┃ │ 👤 System Auto (System)                     │         │
│ ┃ │ 🕐 Jan 12, 2025, 09:15 AM                   │         │
│ ┃ └──────────────────────────────────────────────┘         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6. Room Details Card
```
┌─────────────────────────────────────────────────────────────┐
│ 🏠 Room Details (2)                                         │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Room 101 - Deluxe Suite              ₹2,000             │ │
│ │ 2 nights × ₹1,000/night                                 │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Room 102 - Standard Room             ₹1,200             │ │
│ │ 2 nights × ₹600/night                                   │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 7. Special Requests Card
```
┌─────────────────────────────────────────────────────────────┐
│ ℹ️  Special Requests                                        │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🔵 Late check-in requested (arriving after midnight).   │ │
│ │    Please arrange key pickup at reception. Also need    │ │
│ │    extra towels and hypoallergenic pillows.             │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 8. Guest Information Sidebar
```
┌──────────────────────────┐
│ 👤 Guest Information     │
├──────────────────────────┤
│ ┌──────────────────────┐ │
│ │ NAME                 │ │
│ │ John Doe             │ │
│ └──────────────────────┘ │
│                          │
│ ┌──────────────────────┐ │
│ │ 📧 EMAIL             │ │
│ │ john@example.com     │ │
│ └──────────────────────┘ │
│                          │
│ ┌──────────────────────┐ │
│ │ 📞 PHONE             │ │
│ │ +91 98765 43210      │ │
│ └──────────────────────┘ │
│                          │
│ ┌──────────────────────┐ │
│ │ 👥 GUESTS            │ │
│ │ 2 Adults             │ │
│ └──────────────────────┘ │
└──────────────────────────┘
```

### 9. Hotel Contact Sidebar
```
┌──────────────────────────┐
│ Hotel Contact            │
├──────────────────────────┤
│ ┌──────────────────────┐ │
│ │ 📞  PHONE            │ │
│ │                      │ │
│ │ +91 22 1234 5678     │ │
│ └──────────────────────┘ │
│                          │
│ ┌──────────────────────┐ │
│ │ 📧  EMAIL            │ │
│ │                      │ │
│ │ info@grandhotel.com  │ │
│ └──────────────────────┘ │
└──────────────────────────┘
```

### 10. Booking Timeline Sidebar
```
┌──────────────────────────┐
│ 🕐 Booking Timeline      │
├──────────────────────────┤
│ ┌──────────────────────┐ │
│ │ BOOKING CREATED      │ │
│ │ Jan 10, 2025, 3:45PM │ │
│ └──────────────────────┘ │
│                          │
│ ┌──────────────────────┐ │
│ │ LAST UPDATED         │ │
│ │ Jan 15, 2025, 10:30AM│ │
│ └──────────────────────┘ │
└──────────────────────────┘
```

## Color Legend

```
🟢 Green    = Discounts, Savings, Positive Actions
🔵 Blue     = Information, Check-in, Primary Info
🟣 Purple   = Check-out, Email, Secondary Actions
🟡 Yellow   = Current Info, Highlights, Primary CTAs
🔴 Red      = Surcharges, Errors, Warnings
⚪ Gray     = Historical Data, Neutral Info
```

## Responsive Behavior

### Desktop (1024px+)
```
┌─────────────────────────────────────────────────────────┐
│  [2/3 Main Content]     │  [1/3 Sidebar]                │
│  - Stay Details         │  - Guest Info                 │
│  - Price Info           │  - Hotel Contact              │
│  - Price History        │  - Timeline                   │
│  - Room Details         │                               │
│  - Special Requests     │                               │
└─────────────────────────────────────────────────────────┘
```

### Tablet (768px - 1023px)
```
┌─────────────────────────────────────────────────────────┐
│  [Full Width Main Content]                              │
│  - Stay Details                                         │
│  - Price Info                                           │
│  - Price History                                        │
│  - Room Details                                         │
│  - Special Requests                                     │
│  - Guest Info                                           │
│  - Hotel Contact                                        │
│  - Timeline                                             │
└─────────────────────────────────────────────────────────┘
```

### Mobile (< 768px)
```
┌──────────────────────┐
│ Header (Compact)     │
├──────────────────────┤
│ Stay Details         │
│ (Stacked Vertically) │
├──────────────────────┤
│ Price Info           │
├──────────────────────┤
│ Room Details         │
├──────────────────────┤
│ Special Requests     │
├──────────────────────┤
│ Guest Info           │
├──────────────────────┤
│ Hotel Contact        │
├──────────────────────┤
│ Timeline             │
└──────────────────────┘
```

## Interactive Elements

### Buttons
```
┌─────────────────────────┐
│ ← Back to My Bookings   │  (Ghost button, top left)
└─────────────────────────┘

┌─────────────────────────┐
│ 📜 View Full Price...   │  (Outline button, blue)
└─────────────────────────┘

┌─────────────────────────┐
│ 📞 Call Hotel           │  (Clickable link, opens tel:)
└─────────────────────────┘

┌─────────────────────────┐
│ 📧 Email Hotel          │  (Clickable link, opens mailto:)
└─────────────────────────┘
```

### Badges
```
[✓ Confirmed]      - Green badge
[⏱ Pending]        - Yellow badge
[❌ Cancelled]     - Red badge
[✓ Paid]           - Green badge
[⏱ Pending]        - Yellow badge
[❌ Failed]        - Red badge
[✓ Price Adjusted] - Green badge
```

## Loading States

### Initial Load
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                     ⟳ Loading...                        │
│                                                         │
│              Loading booking details...                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Price History Load
```
┌─────────────────────────────────────────────────────────┐
│ 📜 Price Adjustment History                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                     ⟳                                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Error States

### Booking Not Found
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                     ⚠️                                  │
│                                                         │
│             Error Loading Booking                       │
│                                                         │
│          Booking not found or access denied             │
│                                                         │
│        ┌─────────────────────────────┐                 │
│        │ ← Back to My Bookings       │                 │
│        └─────────────────────────────┘                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Animation Details

### Gradient Header
- Animated white blur circles moving slowly
- Subtle scale animation on icon badge on hover

### Cards
- Hover: Slight shadow increase + 1px lift
- Transition: 200ms ease-in-out

### Buttons
- Hover: Background color change + scale 1.02
- Active: Scale 0.98

### Price History Expand
- Smooth height transition
- Fade-in animation for items

## Accessibility Features

- ✅ Semantic HTML (h1, h2, section, article)
- ✅ ARIA labels on interactive elements
- ✅ Keyboard navigation support
- ✅ Focus indicators on all focusable elements
- ✅ Color contrast ratios meet WCAG AA
- ✅ Responsive font sizes (rem units)
- ✅ Screen reader friendly text

## Print/PDF Considerations

When implementing print styles:
- Hide navigation buttons
- Remove interactive elements
- Expand all collapsed sections
- Use black/white for price adjustments
- Add page breaks between major sections

---

**This visual mockup represents the actual implementation in the codebase.**
