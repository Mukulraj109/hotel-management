# End-to-End Testing Agent Prompt for THE PENTOUZ Hotel Management System

## System Context

You are an automated E2E testing agent using Playwright MCP (Model Context Protocol) to comprehensively test THE PENTOUZ Hotel Management System. This is a production-ready, multi-tenant hotel management platform with complex user flows, role-based access control, and real-time features.

## Testing Environment

### Application URLs
- **Frontend**: http://localhost:3000 (React + TypeScript + Vite)
- **Backend API**: http://localhost:4000/api/v1 (Node.js + Express + MongoDB)
- **API Documentation**: http://localhost:4000/docs

### Database Configuration
- **MongoDB Atlas**: mongodb+srv://mukulraj756:Zk8q2W4uDCaUWRh3@cluster0.thahvbk.mongodb.net/hotel-management
- **Test Data**: Use `npm run seed` in backend folder to populate test data

### Test User Credentials
```javascript
const testUsers = {
  admin: {
    email: 'admin@hotel.com',
    password: 'Admin@123',
    role: 'admin'
  },
  staff: {
    email: 'staff@hotel.com',
    password: 'Staff@123',
    role: 'staff'
  },
  guest: {
    email: 'john.doe@example.com',
    password: 'Guest@123',
    role: 'guest'
  },
  corporate: {
    email: 'corporate@company.com',
    password: 'Corp@123',
    role: 'guest',
    type: 'corporate'
  }
};
```

## Critical Test Scenarios

### 1. Authentication & Authorization Tests
```typescript
// Test Suite: Authentication Flow
- [ ] Guest registration with email verification
- [ ] Login with valid/invalid credentials
- [ ] JWT token expiration handling
- [ ] Password reset flow
- [ ] Multi-role access control (guest, staff, admin, manager)
- [ ] Session persistence across page refreshes
- [ ] Logout and session cleanup
- [ ] Protected route redirection for unauthorized users
```

### 2. Booking Engine Tests (Core Functionality)
```typescript
// Test Suite: Complete Booking Flow
- [ ] Search available rooms by date range
- [ ] Filter rooms by type, price, amenities
- [ ] Select room and verify availability
- [ ] Fill guest information form
- [ ] Apply promo codes and verify discount
- [ ] Complete payment via Stripe (test mode)
- [ ] Receive booking confirmation
- [ ] View booking in guest dashboard
- [ ] Modify booking dates
- [ ] Cancel booking and verify refund
- [ ] Group booking for multiple rooms
- [ ] Corporate booking with credit account
- [ ] Waiting list when no rooms available
```

### 3. TapeChart Management (Critical Feature)
```typescript
// Test Suite: Room Assignment System
- [ ] Drag and drop room assignment
- [ ] Room status changes (available, occupied, maintenance, cleaning)
- [ ] Conflict prevention for double bookings
- [ ] Real-time updates via WebSocket
- [ ] VIP guest priority assignment
- [ ] Room blocks for events/groups
- [ ] Assignment rules execution
- [ ] Special request tracking
- [ ] Upgrade processing
- [ ] Multi-user concurrent editing
- [ ] Audit trail for all changes
```

### 4. Daily Operations Tests
```typescript
// Test Suite: Staff Operations
- [ ] Daily routine check creation and assignment
- [ ] Room inspection workflow
- [ ] Housekeeping task management
- [ ] Maintenance request creation and tracking
- [ ] Inventory management and reordering
- [ ] Laundry tracking system
- [ ] Staff shift management
- [ ] Guest service requests
- [ ] Lost and found management
```

### 5. Financial Management Tests
```typescript
// Test Suite: Billing & Payments
- [ ] Invoice generation for bookings
- [ ] Payment processing via Stripe
- [ ] Refund processing
- [ ] GST calculation and reporting
- [ ] Corporate billing and credit limits
- [ ] Payment method management
- [ ] Billing history tracking
- [ ] Financial reporting
- [ ] POS integration for charges
- [ ] Split folio management
```

### 6. Guest Portal Tests
```typescript
// Test Suite: Guest Experience
- [ ] Digital key generation and access
- [ ] Service booking (spa, restaurant, etc.)
- [ ] Room service ordering
- [ ] Notification preferences
- [ ] Loyalty points tracking
- [ ] Favorite services management
- [ ] Feedback submission
- [ ] Meet-up requests with other guests
- [ ] Billing history access
- [ ] Profile management
```

### 7. Admin Dashboard Tests
```typescript
// Test Suite: Administrative Functions
- [ ] Room type configuration
- [ ] Rate management and dynamic pricing
- [ ] Staff user management and permissions
- [ ] Analytics dashboard data accuracy
- [ ] Report generation (revenue, occupancy, etc.)
- [ ] OTA integration management
- [ ] Corporate account management
- [ ] System settings configuration
- [ ] Audit log viewing
- [ ] Backup and restore operations
```

### 8. Integration Tests
```typescript
// Test Suite: Third-party Integrations
- [ ] Stripe payment webhook handling
- [ ] OTA (Booking.com) sync
- [ ] Email notification delivery
- [ ] SMS notification delivery
- [ ] WebSocket real-time updates
- [ ] File upload for documents/images
- [ ] Export functionality (CSV, PDF)
```

## Performance & Load Testing Requirements

```typescript
// Performance Benchmarks
const performanceTargets = {
  pageLoad: 3000, // ms
  apiResponse: 500, // ms
  searchResults: 1000, // ms
  dragDropLatency: 100, // ms
  concurrentUsers: 100,
  bookingsPerMinute: 50,
  realtimeUpdateDelay: 100 // ms
};
```

## Accessibility Testing

```typescript
// WCAG 2.1 AA Compliance
- [ ] Keyboard navigation for all interactive elements
- [ ] Screen reader compatibility
- [ ] Color contrast ratios (4.5:1 minimum)
- [ ] Focus indicators visible
- [ ] Form labels and error messages
- [ ] Alternative text for images
- [ ] Semantic HTML structure
```

## Security Testing

```typescript
// Security Vulnerabilities
- [ ] SQL injection prevention
- [ ] XSS attack prevention
- [ ] CSRF token validation
- [ ] Rate limiting enforcement
- [ ] Input sanitization
- [ ] File upload restrictions
- [ ] API authentication required
- [ ] Sensitive data encryption
- [ ] Session hijacking prevention
```

## Mobile Responsiveness Testing

```typescript
// Device Viewports
const devices = [
  { name: 'Mobile', width: 375, height: 667 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Desktop', width: 1920, height: 1080 }
];

// Test responsive features
- [ ] Navigation menu collapse/expand
- [ ] Touch gestures for drag-drop
- [ ] Form input optimization
- [ ] Table/grid responsive layouts
- [ ] Image optimization for mobile
```

## Error Handling & Recovery Tests

```typescript
// Error Scenarios
- [ ] Network failure during booking
- [ ] Payment gateway timeout
- [ ] Database connection loss
- [ ] Invalid data submission
- [ ] Session expiration during task
- [ ] WebSocket disconnection
- [ ] File upload failure
- [ ] API rate limit exceeded
```

## Data Validation Tests

```typescript
// Input Validation
- [ ] Email format validation
- [ ] Phone number format validation
- [ ] Date range logic (check-in before check-out)
- [ ] Credit card validation
- [ ] Required field enforcement
- [ ] Maximum length restrictions
- [ ] Special character handling
- [ ] Numeric field validation
```

## Playwright Test Configuration

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 2,
  workers: 4,
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 12'] }
    }
  ]
});
```

## Sample Test Implementation

```typescript
// e2e/booking-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Complete Booking Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Navigate to homepage
    await page.goto('/');

    // Login as guest
    await page.click('[data-testid="login-link"]');
    await page.fill('[data-testid="email-input"]', 'john.doe@example.com');
    await page.fill('[data-testid="password-input"]', 'Guest@123');
    await page.click('[data-testid="login-submit"]');
    await page.waitForURL('/guest/dashboard');
  });

  test('should complete a room booking', async ({ page }) => {
    // Navigate to booking page
    await page.click('[data-testid="book-room-btn"]');

    // Select dates
    await page.fill('[data-testid="checkin-date"]', '2025-02-01');
    await page.fill('[data-testid="checkout-date"]', '2025-02-05');

    // Search for rooms
    await page.click('[data-testid="search-rooms-btn"]');
    await page.waitForSelector('[data-testid="room-card"]');

    // Select first available room
    await page.click('[data-testid="room-card"]:first-child [data-testid="select-room-btn"]');

    // Fill guest details
    await page.fill('[data-testid="guest-name"]', 'John Doe');
    await page.fill('[data-testid="guest-email"]', 'john.doe@example.com');
    await page.fill('[data-testid="guest-phone"]', '+1234567890');

    // Process payment (test mode)
    await page.click('[data-testid="proceed-payment-btn"]');
    await page.waitForSelector('[data-testid="stripe-payment-form"]');

    // Use test card
    await page.fill('[data-testid="card-number"]', '4242424242424242');
    await page.fill('[data-testid="card-expiry"]', '12/25');
    await page.fill('[data-testid="card-cvc"]', '123');

    // Confirm booking
    await page.click('[data-testid="confirm-booking-btn"]');

    // Verify confirmation
    await page.waitForURL(/\/booking\/confirmation/);
    await expect(page.locator('[data-testid="booking-number"]')).toBeVisible();

    // Verify booking appears in dashboard
    await page.goto('/guest/bookings');
    await expect(page.locator('[data-testid="booking-list"]')).toContainText('John Doe');
  });
});
```

## Test Execution Commands

```bash
# Install Playwright
npm install -D @playwright/test

# Install browsers
npx playwright install

# Run all tests
npx playwright test

# Run specific test file
npx playwright test booking-flow.spec.ts

# Run tests in headed mode (see browser)
npx playwright test --headed

# Run tests in specific browser
npx playwright test --project=chromium

# Generate test report
npx playwright show-report

# Debug tests
npx playwright test --debug

# Record new tests
npx playwright codegen http://localhost:3000
```

## Continuous Integration Setup

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd backend && npm ci
          cd ../frontend && npm ci

      - name: Start backend
        run: |
          cd backend
          npm run start &
          npx wait-on http://localhost:4000/health

      - name: Start frontend
        run: |
          cd frontend
          npm run dev &
          npx wait-on http://localhost:3000

      - name: Seed database
        run: cd backend && npm run seed

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npx playwright test

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

## Test Reporting & Monitoring

### Key Metrics to Track
1. **Test Coverage**: Aim for >80% critical path coverage
2. **Test Execution Time**: Keep under 30 minutes for full suite
3. **Flaky Test Rate**: Maintain <5% flaky tests
4. **Bug Detection Rate**: Track bugs found by E2E vs production
5. **Test Maintenance Time**: Monitor time spent updating tests

### Reporting Dashboard Requirements
- Real-time test execution status
- Historical pass/fail trends
- Performance metrics over time
- Screenshot/video artifacts for failures
- Detailed error logs and stack traces
- Integration with Slack/Teams for notifications

## Test Data Management

```typescript
// test-data/seed-e2e.ts
export const testData = {
  hotels: [
    { name: 'Test Hotel 1', rooms: 50 },
    { name: 'Test Hotel 2', rooms: 100 }
  ],
  roomTypes: [
    { name: 'Standard', basePrice: 100 },
    { name: 'Deluxe', basePrice: 200 },
    { name: 'Suite', basePrice: 500 }
  ],
  testBookings: [
    { guestName: 'Test Guest 1', status: 'confirmed' },
    { guestName: 'Test Guest 2', status: 'pending' }
  ]
};

// Reset database to clean state before tests
async function resetTestDatabase() {
  // Implementation to reset test data
}
```

## Important Testing Considerations

1. **State Management**: Each test should be independent and not rely on the state from previous tests
2. **Test Isolation**: Use separate test database or clean up after each test
3. **Parallel Execution**: Design tests to run in parallel for faster execution
4. **Retry Logic**: Implement smart retry for transient failures
5. **Visual Testing**: Consider adding visual regression tests for UI consistency
6. **API Mocking**: Mock external services (Stripe, OTAs) for stable tests
7. **Test Documentation**: Maintain clear documentation of test scenarios and expected results
8. **Regular Maintenance**: Update tests when features change to prevent false failures

## Success Criteria

The E2E testing suite is considered successful when:
- ✅ All critical user journeys are covered
- ✅ Tests run reliably with <5% flakiness
- ✅ Execution time is under 30 minutes
- ✅ 0 critical bugs reach production
- ✅ Test reports are automatically generated
- ✅ Team can easily add new tests
- ✅ Tests catch regression issues before deployment

## Contact & Support

For issues or questions about the testing framework:
- GitHub Issues: https://github.com/anthropics/claude-code/issues
- Documentation: https://docs.anthropic.com/en/docs/claude-code/