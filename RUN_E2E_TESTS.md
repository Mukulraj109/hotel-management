# How to Run E2E Tests for THE PENTOUZ Hotel Management System

## Prerequisites

1. **Node.js 18+** installed
2. **MongoDB** running locally or accessible via connection string
3. **Backend and Frontend** services can be started

## Setup Instructions

### Step 1: Install Playwright Browsers

```bash
# Install Playwright browsers (this will download Chromium, Firefox, and WebKit)
npx playwright install

# Or install with system dependencies (recommended for CI/Linux)
npx playwright install --with-deps
```

### Step 2: Start Backend Services

In a terminal window:

```bash
cd backend
npm install
npm run dev
```

The backend should be running on http://localhost:4000

### Step 3: Start Frontend Services

In another terminal window:

```bash
cd frontend
npm install
npm run dev
```

The frontend should be running on http://localhost:3000

### Step 4: Seed Test Data

In a third terminal:

```bash
cd backend
npm run seed
```

This will populate the database with test users and sample data.

## Running the Tests

### Run All Tests

```bash
# From the project root directory
npm run test:e2e
```

### Run Tests with Visual Browser

```bash
# See the browser while tests run
npm run test:e2e:headed
```

### Run Specific Test Suites

```bash
# Authentication tests only
npm run test:e2e:auth

# Booking flow tests only
npm run test:e2e:booking

# TapeChart tests only
npm run test:e2e:tapechart
```

### Run Tests in Specific Browser

```bash
# Chrome/Chromium
npm run test:e2e:chrome

# Firefox
npm run test:e2e:firefox

# Safari/WebKit
npm run test:e2e:webkit

# Mobile browsers
npm run test:e2e:mobile
```

### Debug Tests Interactively

```bash
# Opens Playwright Inspector for debugging
npm run test:e2e:debug

# Opens Playwright UI Mode (recommended)
npm run test:e2e:ui
```

### Generate New Tests

```bash
# Opens Playwright Codegen to record new tests
npm run test:e2e:codegen
```

## View Test Reports

After tests run, view the HTML report:

```bash
npm run test:e2e:report
```

This opens an interactive HTML report showing:
- Pass/fail status for each test
- Screenshots of failures
- Test execution timeline
- Error details and stack traces

## Test Structure

```
project/
├── e2e-tests/
│   ├── tests/
│   │   ├── 01-authentication.spec.ts    # Login, registration, auth flows
│   │   ├── 02-booking-flow.spec.ts      # Complete booking process
│   │   └── 03-tapechart.spec.ts         # TapeChart room management
│   ├── helpers/
│   │   ├── auth-helper.ts               # Authentication utilities
│   │   ├── booking-helper.ts            # Booking flow utilities
│   │   └── test-setup.ts                # Test configuration
│   ├── fixtures/
│   │   └── test-users.ts                # Test user data
│   └── reports/                         # Test execution reports
```

## Test Credentials

The following test users are available:

```javascript
// Admin User
email: admin@hotel.com
password: Admin@123

// Staff User
email: staff@hotel.com
password: Staff@123

// Guest User
email: john.doe@example.com
password: Guest@123

// Corporate User
email: corporate@company.com
password: Corp@123
```

## Troubleshooting

### Tests failing with timeout errors

1. Ensure backend is running: `curl http://localhost:4000/health`
2. Ensure frontend is running: `curl http://localhost:3000`
3. Check MongoDB connection: `mongosh` or check backend logs
4. Increase timeout in playwright.config.ts if needed

### Browser not launching

```bash
# Reinstall browsers
npx playwright install --force

# Install with system dependencies
npx playwright install --with-deps
```

### Port conflicts

If ports 3000 or 4000 are in use:

1. Stop conflicting services
2. Or modify ports in `.env` files and `playwright.config.ts`

### Database issues

```bash
# Reset and reseed database
cd backend
npm run seed
```

## CI/CD Integration

The project includes GitHub Actions workflow for automated testing:

- **Location**: `.github/workflows/e2e-tests.yml`
- **Triggers**: Push to main/develop, Pull Requests
- **Browsers**: Tests run on Chromium, Firefox, and WebKit
- **Reports**: Automatically uploaded as artifacts

## Writing New Tests

1. Use the codegen tool to record interactions:
```bash
npm run test:e2e:codegen
```

2. Create new test file in `e2e-tests/tests/`

3. Use the helper classes for common operations:
```typescript
import { AuthHelper, BookingHelper } from '../helpers';
```

4. Follow the existing test patterns for consistency

## Best Practices

1. **Independent Tests**: Each test should be able to run independently
2. **Clean State**: Tests should not depend on state from other tests
3. **Descriptive Names**: Use clear test descriptions
4. **Wait for Elements**: Always wait for elements before interacting
5. **Use Data Attributes**: Prefer `data-testid` for element selection
6. **Handle Async**: Properly await all async operations
7. **Error Messages**: Include helpful error messages in assertions

## Performance Testing

To run performance-focused tests:

```bash
# Measure page load times and API response times
npm run test:e2e -- --grep "performance"
```

## Accessibility Testing

The tests include basic accessibility checks:

```bash
# Run accessibility-focused tests
npm run test:e2e -- --grep "accessibility"
```

## Support

For issues with the E2E testing framework:
- Check the test logs in `e2e-tests/reports/`
- Review screenshots in `screenshots/` (created on failures)
- Consult the Playwright documentation: https://playwright.dev
- Report issues: https://github.com/anthropics/claude-code/issues