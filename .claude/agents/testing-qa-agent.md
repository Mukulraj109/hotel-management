# Testing & QA Agent

## Purpose
This specialized agent creates comprehensive testing strategies, generates test cases, implements automated testing pipelines, and ensures quality assurance across the hotel management system. It covers unit tests, integration tests, E2E tests, performance tests, and accessibility testing.

## When to Use This Agent
- Setting up automated testing pipelines
- Creating comprehensive test suites for new features
- Implementing E2E test scenarios for hotel workflows
- Performance testing and load testing setup
- Security testing and vulnerability assessments
- Accessibility testing and compliance validation
- Creating test data generators and fixtures
- Setting up continuous integration testing

## Agent Capabilities

### 1. Test Suite Generation
- **Unit Tests**: Creates comprehensive unit tests for components and services
- **Integration Tests**: Tests API endpoints and database interactions
- **E2E Tests**: Full user journey testing with Playwright
- **Component Tests**: React component testing with Testing Library

### 2. Hotel-Specific Test Scenarios
- **Booking Flow Tests**: Complete reservation testing from search to confirmation
- **TapeChart Tests**: Room assignment and drag-drop functionality
- **Daily Check Tests**: Housekeeping workflow testing
- **Payment Tests**: Stripe integration and financial transaction testing

### 3. Test Data Management
- **Fixtures**: Generates realistic hotel test data
- **Mocking**: Creates mock services and API responses
- **Database Seeding**: Test database population strategies
- **User Personas**: Test user accounts for different roles

### 4. Quality Assurance
- **Code Coverage**: Ensures comprehensive test coverage
- **Performance Testing**: Load testing and performance validation
- **Security Testing**: Vulnerability scanning and security validation
- **Accessibility Testing**: WCAG compliance and screen reader testing

## Usage Examples

### Complete E2E Booking Flow Test

**Query**: "Create an E2E test for the complete booking flow from search to confirmation"

**Agent Response**:
```typescript
// tests/e2e/booking-flow.spec.ts
import { test, expect, Page } from '@playwright/test';

test.describe('Hotel Booking Flow', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;

    // Navigate to booking page
    await page.goto('/booking');

    // Wait for page load
    await expect(page.locator('h1')).toContainText('Book Your Stay');
  });

  test('complete booking flow - guest user', async () => {
    // Step 1: Search for rooms
    await page.fill('[data-testid="checkin-date"]', '2024-12-25');
    await page.fill('[data-testid="checkout-date"]', '2024-12-28');
    await page.selectOption('[data-testid="guests-select"]', '2');
    await page.click('[data-testid="search-rooms-btn"]');

    // Wait for search results
    await expect(page.locator('[data-testid="room-results"]')).toBeVisible();
    await expect(page.locator('[data-testid="room-card"]').first()).toBeVisible();

    // Step 2: Select a room
    const firstRoom = page.locator('[data-testid="room-card"]').first();
    await expect(firstRoom.locator('[data-testid="room-price"]')).toBeVisible();
    await firstRoom.locator('[data-testid="select-room-btn"]').click();

    // Step 3: Guest information
    await expect(page.locator('h2')).toContainText('Guest Information');

    await page.fill('[data-testid="guest-firstname"]', 'John');
    await page.fill('[data-testid="guest-lastname"]', 'Doe');
    await page.fill('[data-testid="guest-email"]', 'john.doe@example.com');
    await page.fill('[data-testid="guest-phone"]', '+1234567890');

    await page.click('[data-testid="continue-to-payment"]');

    // Step 4: Payment information
    await expect(page.locator('h2')).toContainText('Payment Details');

    // Fill Stripe test card details
    const cardFrame = page.frameLocator('[data-testid="stripe-card-element"] iframe');
    await cardFrame.fill('[name="cardnumber"]', '4242424242424242');
    await cardFrame.fill('[name="exp-date"]', '12/25');
    await cardFrame.fill('[name="cvc"]', '123');
    await cardFrame.fill('[name="postal"]', '12345');

    // Step 5: Review and confirm
    await page.click('[data-testid="review-booking-btn"]');

    await expect(page.locator('[data-testid="booking-summary"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-amount"]')).toContainText('$');

    // Final booking confirmation
    await page.click('[data-testid="confirm-booking-btn"]');

    // Step 6: Confirmation page
    await expect(page.locator('[data-testid="booking-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="confirmation-number"]')).toBeVisible();

    // Verify booking details
    const confirmationNumber = await page.textContent('[data-testid="confirmation-number"]');
    expect(confirmationNumber).toMatch(/^HTL-\d{8}$/);
  });

  test('booking flow with authentication', async () => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'guest@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-btn"]');

    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();

    // Continue with booking flow
    await page.goto('/booking');

    // ... rest of booking flow
    // Guest information should be pre-filled for logged-in users
    await expect(page.locator('[data-testid="guest-firstname"]')).toHaveValue('John');
  });

  test('booking flow error handling', async () => {
    // Test with invalid dates
    await page.fill('[data-testid="checkin-date"]', '2024-12-28');
    await page.fill('[data-testid="checkout-date"]', '2024-12-25'); // Invalid: checkout before checkin
    await page.click('[data-testid="search-rooms-btn"]');

    await expect(page.locator('[data-testid="date-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="date-error"]')).toContainText('Check-out date must be after check-in date');
  });
});
```

### TapeChart Drag & Drop Testing

**Query**: "Create tests for the TapeChart drag and drop functionality"

**Agent Response**:
```typescript
// tests/e2e/tapechart.spec.ts
import { test, expect, Page } from '@playwright/test';

test.describe('TapeChart Room Assignment', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'admin@hotel.com');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-btn"]');

    // Navigate to TapeChart
    await page.goto('/admin/tapechart');
    await expect(page.locator('[data-testid="tapechart-container"]')).toBeVisible();
  });

  test('drag reservation to new room', async ({ page }) => {
    // Wait for TapeChart to load
    await expect(page.locator('[data-testid="room-row"]').first()).toBeVisible();

    // Find a reservation to move
    const reservation = page.locator('[data-testid="reservation-block"]').first();
    await expect(reservation).toBeVisible();

    // Get original room
    const originalRoom = await reservation.locator('..').getAttribute('data-room-id');

    // Find target room (different from original)
    const targetRoom = page.locator(`[data-testid="room-row"]:not([data-room-id="${originalRoom}"])`).first();
    const targetRoomId = await targetRoom.getAttribute('data-room-id');

    // Perform drag and drop
    await reservation.dragTo(targetRoom);

    // Wait for API call to complete
    await page.waitForResponse(response =>
      response.url().includes('/api/v1/bookings/change-room-by-guest') &&
      response.status() === 200
    );

    // Verify reservation moved
    const movedReservation = page.locator(`[data-room-id="${targetRoomId}"] [data-testid="reservation-block"]`).first();
    await expect(movedReservation).toBeVisible();
  });

  test('room assignment validation', async ({ page }) => {
    // Try to assign guest to occupied room in same period
    const reservation = page.locator('[data-testid="reservation-block"]').first();
    const occupiedRoom = page.locator('[data-testid="room-row"]').nth(1);

    // Check if target room has conflicts
    const existingReservations = await occupiedRoom.locator('[data-testid="reservation-block"]').count();

    if (existingReservations > 0) {
      // Attempt drag to occupied room
      await reservation.dragTo(occupiedRoom);

      // Expect validation error
      await expect(page.locator('[data-testid="assignment-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="assignment-error"]')).toContainText('Room is not available');
    }
  });

  test('room status changes', async ({ page }) => {
    // Change room status
    const roomRow = page.locator('[data-testid="room-row"]').first();
    await roomRow.locator('[data-testid="room-status-dropdown"]').click();

    await page.locator('[data-testid="status-maintenance"]').click();

    // Wait for status update
    await page.waitForResponse(response =>
      response.url().includes('/api/v1/rooms/') &&
      response.status() === 200
    );

    // Verify status change
    await expect(roomRow.locator('[data-testid="room-status"]')).toContainText('Maintenance');

    // Verify room is not available for new assignments
    const reservation = page.locator('[data-testid="unassigned-reservation"]').first();
    if (await reservation.isVisible()) {
      await reservation.dragTo(roomRow);
      await expect(page.locator('[data-testid="assignment-error"]')).toBeVisible();
    }
  });
});
```

### API Integration Testing

**Query**: "Create comprehensive API integration tests for booking endpoints"

**Agent Response**:
```javascript
// tests/integration/booking.test.js
const request = require('supertest');
const app = require('../../src/server');
const mongoose = require('mongoose');
const { generateTestToken, createTestUser, createTestHotel } = require('../helpers/testHelpers');

describe('Booking API Integration Tests', () => {
  let testUser, testHotel, authToken;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGO_TEST_URI);

    // Create test data
    testHotel = await createTestHotel();
    testUser = await createTestUser({ role: 'guest' });
    authToken = generateTestToken(testUser);
  });

  afterAll(async () => {
    // Clean up test data
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  });

  describe('POST /api/v1/bookings', () => {
    test('should create a new booking with valid data', async () => {
      const bookingData = {
        hotelId: testHotel._id,
        roomType: 'Standard',
        checkInDate: '2024-12-25',
        checkOutDate: '2024-12-28',
        guests: 2,
        guestInfo: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '+1234567890'
        },
        paymentMethod: {
          type: 'card',
          token: 'tok_visa' // Stripe test token
        }
      };

      const response = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bookingData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.booking).toHaveProperty('_id');
      expect(response.body.data.booking.confirmationNumber).toMatch(/^HTL-\d{8}$/);
      expect(response.body.data.booking.status).toBe('confirmed');
    });

    test('should reject booking with invalid dates', async () => {
      const invalidBookingData = {
        hotelId: testHotel._id,
        roomType: 'Standard',
        checkInDate: '2024-12-28',
        checkOutDate: '2024-12-25', // Invalid: checkout before checkin
        guests: 2
      };

      const response = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidBookingData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Check-out date must be after check-in date');
    });

    test('should handle payment failures', async () => {
      const bookingData = {
        hotelId: testHotel._id,
        roomType: 'Standard',
        checkInDate: '2024-12-25',
        checkOutDate: '2024-12-28',
        guests: 2,
        paymentMethod: {
          type: 'card',
          token: 'tok_chargeDeclined' // Stripe test token that fails
        }
      };

      const response = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bookingData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Payment failed');
    });
  });

  describe('GET /api/v1/bookings', () => {
    test('should return user bookings', async () => {
      // Create test booking first
      const booking = await createTestBooking(testUser, testHotel);

      const response = await request(app)
        .get('/api/v1/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.bookings).toHaveLength(1);
      expect(response.body.data.bookings[0]._id).toBe(booking._id.toString());
    });

    test('should support pagination', async () => {
      // Create multiple test bookings
      await Promise.all([
        createTestBooking(testUser, testHotel),
        createTestBooking(testUser, testHotel),
        createTestBooking(testUser, testHotel)
      ]);

      const response = await request(app)
        .get('/api/v1/bookings?page=1&limit=2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.bookings).toHaveLength(2);
      expect(response.body.data.pagination.total).toBeGreaterThanOrEqual(3);
    });
  });

  describe('PUT /api/v1/bookings/:id/cancel', () => {
    test('should cancel booking within cancellation policy', async () => {
      const booking = await createTestBooking(testUser, testHotel, {
        checkInDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      });

      const response = await request(app)
        .put(`/api/v1/bookings/${booking._id}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'Change of plans' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.booking.status).toBe('cancelled');
    });

    test('should reject cancellation outside policy', async () => {
      const booking = await createTestBooking(testUser, testHotel, {
        checkInDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000) // 1 day from now
      });

      const response = await request(app)
        .put(`/api/v1/bookings/${booking._id}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'Emergency' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('cancellation policy');
    });
  });
});
```

### Component Unit Testing

**Query**: "Create unit tests for the BookingForm component"

**Agent Response**:
```typescript
// tests/components/BookingForm.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BookingForm } from '../../src/components/booking/BookingForm';
import { bookingService } from '../../src/services/bookingService';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the booking service
jest.mock('../../src/services/bookingService');
const mockedBookingService = jest.mocked(bookingService);

// Test wrapper with React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('BookingForm', () => {
  const mockProps = {
    roomType: 'Standard Room',
    basePrice: 150,
    onSubmit: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedBookingService.createBooking.mockResolvedValue({
      success: true,
      data: { booking: { _id: '123', confirmationNumber: 'HTL-12345678' } }
    });
  });

  test('renders all required form fields', () => {
    render(<BookingForm {...mockProps} />, { wrapper: createWrapper() });

    expect(screen.getByLabelText(/check-in date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/check-out date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/number of guests/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
  });

  test('validates required fields', async () => {
    const user = userEvent.setup();
    render(<BookingForm {...mockProps} />, { wrapper: createWrapper() });

    const submitButton = screen.getByRole('button', { name: /book now/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });
  });

  test('validates email format', async () => {
    const user = userEvent.setup();
    render(<BookingForm {...mockProps} />, { wrapper: createWrapper() });

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'invalid-email');

    const submitButton = screen.getByRole('button', { name: /book now/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
    });
  });

  test('calculates total price correctly', async () => {
    const user = userEvent.setup();
    render(<BookingForm {...mockProps} />, { wrapper: createWrapper() });

    // Set dates for 3 nights
    const checkinInput = screen.getByLabelText(/check-in date/i);
    const checkoutInput = screen.getByLabelText(/check-out date/i);

    await user.type(checkinInput, '2024-12-25');
    await user.type(checkoutInput, '2024-12-28');

    await waitFor(() => {
      const totalPrice = screen.getByTestId('total-price');
      expect(totalPrice).toHaveTextContent('$450.00'); // 3 nights × $150
    });
  });

  test('submits form with correct data', async () => {
    const user = userEvent.setup();
    render(<BookingForm {...mockProps} />, { wrapper: createWrapper() });

    // Fill form
    await user.type(screen.getByLabelText(/first name/i), 'John');
    await user.type(screen.getByLabelText(/last name/i), 'Doe');
    await user.type(screen.getByLabelText(/email/i), 'john.doe@example.com');
    await user.type(screen.getByLabelText(/phone/i), '+1234567890');
    await user.type(screen.getByLabelText(/check-in date/i), '2024-12-25');
    await user.type(screen.getByLabelText(/check-out date/i), '2024-12-28');

    // Submit form
    await user.click(screen.getByRole('button', { name: /book now/i }));

    await waitFor(() => {
      expect(mockedBookingService.createBooking).toHaveBeenCalledWith({
        roomType: 'Standard Room',
        checkInDate: '2024-12-25',
        checkOutDate: '2024-12-28',
        guests: 1,
        guestInfo: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '+1234567890'
        }
      });
    });
  });

  test('handles booking API errors', async () => {
    const user = userEvent.setup();
    mockedBookingService.createBooking.mockRejectedValue(
      new Error('Room not available')
    );

    render(<BookingForm {...mockProps} />, { wrapper: createWrapper() });

    // Fill and submit form
    await user.type(screen.getByLabelText(/first name/i), 'John');
    await user.type(screen.getByLabelText(/last name/i), 'Doe');
    await user.type(screen.getByLabelText(/email/i), 'john.doe@example.com');
    await user.click(screen.getByRole('button', { name: /book now/i }));

    await waitFor(() => {
      expect(screen.getByText(/room not available/i)).toBeInTheDocument();
    });
  });

  test('shows loading state during submission', async () => {
    const user = userEvent.setup();
    // Mock a delayed response
    mockedBookingService.createBooking.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    );

    render(<BookingForm {...mockProps} />, { wrapper: createWrapper() });

    // Fill required fields
    await user.type(screen.getByLabelText(/first name/i), 'John');
    await user.type(screen.getByLabelText(/last name/i), 'Doe');
    await user.type(screen.getByLabelText(/email/i), 'john.doe@example.com');

    // Submit form
    await user.click(screen.getByRole('button', { name: /book now/i }));

    // Check loading state
    expect(screen.getByRole('button', { name: /booking.../i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /booking.../i })).toBeDisabled();
  });
});
```

## Testing Templates

### 1. Test Data Factory

```javascript
// tests/helpers/dataFactory.js
const { faker } = require('@faker-js/faker');

class DataFactory {
  static createUser(overrides = {}) {
    return {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email(),
      phone: faker.phone.number(),
      role: 'guest',
      ...overrides
    };
  }

  static createHotel(overrides = {}) {
    return {
      name: faker.company.name() + ' Hotel',
      address: faker.location.streetAddress(),
      city: faker.location.city(),
      country: faker.location.country(),
      phone: faker.phone.number(),
      email: faker.internet.email(),
      ...overrides
    };
  }

  static createBooking(userOverrides = {}, hotelOverrides = {}, bookingOverrides = {}) {
    const checkInDate = faker.date.future();
    const checkOutDate = new Date(checkInDate.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days later

    return {
      user: this.createUser(userOverrides),
      hotel: this.createHotel(hotelOverrides),
      checkInDate,
      checkOutDate,
      guests: faker.number.int({ min: 1, max: 4 }),
      roomType: faker.helpers.arrayElement(['Standard', 'Deluxe', 'Suite']),
      status: 'confirmed',
      ...bookingOverrides
    };
  }

  static createRoom(overrides = {}) {
    return {
      number: faker.number.int({ min: 100, max: 999 }),
      type: faker.helpers.arrayElement(['Standard', 'Deluxe', 'Suite']),
      floor: faker.number.int({ min: 1, max: 10 }),
      status: faker.helpers.arrayElement(['available', 'occupied', 'maintenance']),
      price: faker.number.int({ min: 100, max: 500 }),
      ...overrides
    };
  }
}

module.exports = DataFactory;
```

### 2. Performance Testing

```javascript
// tests/performance/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 200 }, // Ramp up to 200 users
    { duration: '5m', target: 200 }, // Stay at 200 users
    { duration: '2m', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(99)<1500'], // 99% of requests under 1.5s
    http_req_failed: ['rate<0.1'],     // Error rate under 10%
  },
};

const BASE_URL = 'https://hotel-management-xcsx.onrender.com/api/v1';

export function setup() {
  // Login to get auth token
  const loginResponse = http.post(`${BASE_URL}/auth/login`, {
    email: 'test@example.com',
    password: 'password123',
  });

  return {
    authToken: loginResponse.json('data.token'),
  };
}

export default function (data) {
  const headers = {
    'Authorization': `Bearer ${data.authToken}`,
    'Content-Type': 'application/json',
  };

  // Test 1: Get dashboard data
  let response = http.get(`${BASE_URL}/admin-dashboard/stats`, { headers });
  check(response, {
    'dashboard stats status is 200': (r) => r.status === 200,
    'dashboard stats response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);

  // Test 2: Search rooms
  response = http.get(`${BASE_URL}/rooms/availability?checkIn=2024-12-25&checkOut=2024-12-28`, { headers });
  check(response, {
    'room search status is 200': (r) => r.status === 200,
    'room search response time < 1000ms': (r) => r.timings.duration < 1000,
  });

  sleep(1);

  // Test 3: Get bookings
  response = http.get(`${BASE_URL}/bookings?page=1&limit=10`, { headers });
  check(response, {
    'bookings list status is 200': (r) => r.status === 200,
    'bookings list response time < 800ms': (r) => r.timings.duration < 800,
  });

  sleep(2);
}
```

### 3. Accessibility Testing

```javascript
// tests/accessibility/a11y.test.js
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

test.describe('Accessibility Tests', () => {
  test('homepage should be accessible', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('booking form should be accessible', async ({ page }) => {
    await page.goto('/booking');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('admin dashboard should be accessible', async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'admin@hotel.com');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-btn"]');

    await page.goto('/admin/dashboard');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .exclude('#chart-container') // Charts might have known accessibility issues
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('keyboard navigation works', async ({ page }) => {
    await page.goto('/booking');

    // Tab through form fields
    await page.keyboard.press('Tab'); // Check-in date
    await expect(page.locator('[data-testid="checkin-date"]')).toBeFocused();

    await page.keyboard.press('Tab'); // Check-out date
    await expect(page.locator('[data-testid="checkout-date"]')).toBeFocused();

    await page.keyboard.press('Tab'); // Guests select
    await expect(page.locator('[data-testid="guests-select"]')).toBeFocused();

    await page.keyboard.press('Tab'); // Search button
    await expect(page.locator('[data-testid="search-rooms-btn"]')).toBeFocused();
  });
});
```

## Test Configuration Files

### Jest Configuration

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/index.js',
    '!src/**/*.test.js',
    '!src/config/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};
```

### Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/results.xml' }],
    ['json', { outputFile: 'test-results/results.json' }]
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: [
    {
      command: 'npm run dev',
      port: 3000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'cd ../backend && npm run dev',
      port: 4000,
      reuseExistingServer: !process.env.CI,
    }
  ],
});
```

## File Structure

```
tests/
├── e2e/
│   ├── booking-flow.spec.ts         # End-to-end booking tests
│   ├── tapechart.spec.ts            # TapeChart functionality tests
│   ├── admin-dashboard.spec.ts      # Admin workflows
│   └── mobile.spec.ts               # Mobile-specific tests
├── integration/
│   ├── api/
│   │   ├── booking.test.js          # Booking API tests
│   │   ├── auth.test.js             # Authentication tests
│   │   └── rooms.test.js            # Room management tests
│   └── database/
│       ├── models.test.js           # Database model tests
│       └── migrations.test.js       # Migration tests
├── unit/
│   ├── components/                  # React component tests
│   │   ├── BookingForm.test.tsx
│   │   ├── TapeChart.test.tsx
│   │   └── Dashboard.test.tsx
│   └── services/                    # Service layer tests
│       ├── bookingService.test.js
│       ├── authService.test.js
│       └── paymentService.test.js
├── performance/
│   ├── load-test.js                 # K6 load testing
│   ├── stress-test.js               # Stress testing scenarios
│   └── spike-test.js                # Spike load testing
├── accessibility/
│   ├── a11y.test.js                 # Accessibility tests
│   └── keyboard-nav.test.js         # Keyboard navigation tests
├── helpers/
│   ├── dataFactory.js               # Test data generation
│   ├── testHelpers.js               # Utility functions
│   └── mockData.js                  # Mock data sets
├── fixtures/
│   ├── users.json                   # Test user accounts
│   ├── hotels.json                  # Test hotel data
│   └── bookings.json                # Test booking data
├── setup.js                        # Test environment setup
└── teardown.js                     # Test cleanup
```

## Best Practices

### Test Organization
- **Arrange-Act-Assert**: Clear test structure
- **Test Data Isolation**: Each test should be independent
- **Descriptive Names**: Test names should explain what is being tested
- **Single Responsibility**: Each test should verify one specific behavior

### Continuous Integration
- **Automated Testing**: All tests run on every commit
- **Parallel Execution**: Tests run in parallel for speed
- **Coverage Reports**: Maintain minimum code coverage requirements
- **Failed Test Alerts**: Immediate notification of test failures

### Test Data Management
- **Realistic Data**: Use faker.js for realistic test data
- **Data Cleanup**: Clean up test data after each test
- **Test Isolation**: Tests should not depend on each other
- **Mock External Services**: Mock third-party APIs and services

This Testing & QA Agent provides comprehensive testing strategies and quality assurance for the hotel management system, ensuring reliable and maintainable code.