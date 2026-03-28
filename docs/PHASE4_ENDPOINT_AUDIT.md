# Phase 4 — Backend endpoint audit

**Purpose:** For each API surface used by the frontend (and critical integrations), verify **mount path**, **middleware** (auth, tenant, property, RBAC, validation), **idempotency** where required, and **response-shape** compatibility with the client.

**Source of truth for routing:** `backend/src/app/registerApiRoutes.js` (what is mounted under `/api/v1/...`).

**Global stack (applies before route handlers):** `backend/src/server.js` — order matters for anything under `/api/v1`:

| Layer | Notes |
| --- | --- |
| `helmet`, `cookieParser`, `cors` | Security / cookies / CORS |
| Rate limit | `/api/` |
| `apiVersioning` | `/api` |
| `express.json` / `urlencoded`, `mongoSanitize`, `hpp` | Body parsing + sanitization |
| `requestTracing`, `compression`, loggers | Observability |
| `apiMetricsMiddleware` | `/api/v1` |
| **`csrfProtection`** | **`/api/v1`** — double-submit cookie when `accessToken` cookie present |
| `paginationBounds` | Caps page/limit |
| Optional `enhancedAuditLogger`, `piiAccessLogger` | Audit / PII |
| Path-specific `piiResponseFilter` | e.g. `/api/v1/guests`, guest-services, etc. |
| `maintenanceMode` | Global gate |

**Per-route verification checklist (copy row for each endpoint):**

| Endpoint | Method | Router file | Auth | Tenant | Property | RBAC (`authorizePolicy`) | Validate (Joi) | Idempotency | Response shape vs client | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

**Status:** `verified` · `gap` · `deferred`

---

## Batch A — Auth (`/api/v1/auth`) — *core routes documented*

| Endpoint | Method | Middleware chain (high level) | Validation | Idempotency | Client notes |
| --- | --- | --- | --- | --- | --- |
| `/auth/register` | POST | `authLimiter`, `validate(schemas.register)` | `schemas.register` (role forced to `guest` in handler) | N/A | Sets httpOnly cookies + CSRF cookie; **no** `authenticate` (pre-login) |
| `/auth/login` | POST | `authLimiter`, `strictAuthLimiter`, `validate(schemas.login)` | `schemas.login` | N/A | Cookie session + CSRF |
| `/auth/me` | GET | `authenticate`, `authorizePolicy('auth','baseAccess')` | — | N/A | Returns `{ status, user }` — normalize with `authService` / `PropertyContext` (`data.user` vs nested `data.data.user`) |
| `/auth/switch-hotel` | POST | `authenticate`, `authorizePolicy('auth','baseAccess')`, `validate(schemas.switchHotel)` | `schemas.switchHotel` (`hotelId` ObjectId) | N/A | Staff roles only; updates `User.hotelId`, reissues JWT + cookies; **Bearer** skips CSRF (cookie session still needs `X-CSRF-Token`). HTTP integration: `npm run test:integration:switch-hotel` |
| `/auth/profile` | PATCH | `authenticate`, `ensurePropertyAccess`, `authorizePolicy`, `validate(updateProfile)` | `schemas.updateProfile` | N/A | |
| `/auth/change-password` | PATCH | `authenticate`, `ensurePropertyAccess`, `authorizePolicy`, `validate(changePassword)` | `schemas.changePassword` | N/A | |
| `/auth/refresh` | POST | `validate(mutationBaselineSchema)` only — **no** `authenticate` | `mutationBaselineSchema` (open object) | N/A | Uses **refresh** cookie; issues new access+refresh+CSRF; replay protection on refresh tokens |
| `/auth/logout` | POST | `validate(mutationBaselineSchema)` only | `mutationBaselineSchema` | N/A | Clears cookies; invalidates refresh token **family** |

**CSRF:** Any mutating `POST` under `/api/v1` with `accessToken` cookie requires `X-CSRF-Token` matching `csrfToken` cookie (`csrfProtection` in `server.js`). Login/register/refresh set CSRF cookie for subsequent calls.

---

## Batch A — Bookings (`/api/v1/bookings` + `/api/v1/bookings/enhanced`)

**Mount order:** `registerApiRoutes.js` mounts `noShowRoutes` then `bookingRoutes` on the same path prefix `/api/v1/bookings` — **first matching route wins**; ensure no path shadowing (verify in `routes/bookings.js` vs no-show router).

| Endpoint | Method | Middleware (representative) | Validation | Idempotency | Notes |
| --- | --- | --- | --- | --- | --- |
| `/bookings/` | POST | `authenticate`, `ensureTenantContext`, `authorizePolicy('bookings','create')`, `ensurePropertyAccess`, `bookingCompletionMiddleware`, `validate(createBooking)` | `schemas.createBooking` includes `idempotencyKey` | Body idempotency in `prepareBookingCreation` | **`reserveRoomsWithParentSession`** when physical rooms are assigned or **`primaryRoomTypeId`** hold; cancel calls **`releaseRooms`**; **`PATCH /:id`** resyncs calendar when stay/rooms/primary fields change |
| `/bookings/` | GET | `authenticate`, `ensureTenantContext`, `ensurePropertyAccess` | Query via handler | — | Guest: `query.userId = req.user._id` |
| `/bookings/enhanced/:id` | GET | See `routes/enhancedBookings.js` | — | — | Guest booking detail page uses this |

---

## Batch A — Payments (`/api/v1/payments`)

**Router-level:** `payments.js` applies `financialLimiter`, `authenticate`, `ensureTenantContext`, `ensurePropertyAccess` to **all** routes in the file.

| Endpoint | Method | Extra middleware | Validation | Idempotency |
| --- | --- | --- | --- | --- |
| `/payments/intent` | POST | `authorizePolicy('payments','createIntent')`, `enforceIdempotency` (as `idempotentFinancialMutation`), `validate(createPaymentIntent)` | Joi | **Yes** — Redis/memory namespace `payments` |

*Individual routes may repeat `authenticate` / tenant — redundant but harmless.*

---

## Batch B — Inventory, availability, rooms — *first pass*

**Mount paths:** `registerApiRoutes.js` — `/api/v1/inventory-management`, `/api/v1/availability`, `/api/v1/rooms` (rooms also uses `roomCacheMiddleware` where registered).

### B1 — Inventory management (`/api/v1/inventory-management`)

**File:** `routes/inventoryManagement.js`

Router applies `router.use(authenticate)` and `router.use(ensurePropertyAccess)` once; each route **also** repeats `authenticate` (redundant).

**Not applied on this router:** `ensureTenantContext` — `hotelId`/`tenant` scope relies on **JWT + property access** and controller logic; ties to **FAB-001** (client `hotelId` vs server enforcement) if query/body `hotelId` can diverge.

| Path | Method | RBAC | Validation | Notes |
| --- | --- | --- | --- | --- |
| `/` | GET | `authorizePolicy('inventoryManagement','readAccess')` | Query in controller | Calendar/admin inventory data |
| `/update` | POST | `manageAccess` | `mutationBaselineSchema` | Mutates `RoomAvailability` |
| `/bulk-update` | POST | `manageAccess` | `mutationBaselineSchema` | |
| `/stop-sell` | POST | `manageAccess` | `mutationBaselineSchema` | |
| `/calendar` | GET | `readAccess` | — | Aligns with admin `InventoryCalendar` UI |
| `/summary` | GET | `readAccess` | — | |
| `/create-range` | POST | `manageAccess` | `mutationBaselineSchema` | |

**FAB-004 linkage:** Inventory writes here; **`POST /bookings`** also reserves/releases via `availabilityService` when calendar rows exist (assigned rooms or catalog `roomTypeId` hold). Admin calendar edits remain a second write path — ops should keep hotel/date ranges consistent.

### B2 — Availability (`/api/v1/availability`)

**File:** `routes/availability.js`

| Path | Method | Auth | Notes |
| --- | --- | --- | --- |
| `/check` | GET | **None** on handler | Public-style availability check (booking funnel / APIs) |
| `/calendar` | GET | **None** on handler | Calendar |
| `/room-status` | GET | `authenticate`, `authorizePolicy('availability','staffAccess')`, `ensurePropertyAccess` | Staff |
| `/block`, `/unblock` | POST | `authenticate`, `manageAccess`, `ensurePropertyAccess`, `validate(mutationBaselineSchema)` | |
| `/occupancy` | GET | `authenticate`, `staffAccess`, `ensurePropertyAccess` | |
| `/alternatives` | GET | **None** on handler | |
| `/overbooking` | GET | `authenticate`, `staffAccess`, `ensurePropertyAccess` | Handler also requires **`hotelId` query** for service scoping |
| `/with-rates` | GET | **None** on handler | |
| `/search` | GET | **None** on handler | |

**Public `GET` scoping (verified 2026-03-27):** `availabilityController` requires **`hotelId` query** on `/check`, `/calendar`, `/alternatives`, `/with-rates`, `/search`, and **`/overbooking`** (legacy `availabilityService.checkAvailability` without `hotelId` previously queried rooms/bookings without a property filter — see **FAB-017**). Staff-only routes still pass `hotelId` from the client (`OverbookingConfiguration` + `availabilityService`).

### B3 — Rooms (`/api/v1/rooms`)

**File:** `routes/rooms.js`

| Path | Method | Middleware (representative) | Notes |
| --- | --- | --- | --- |
| `/` | GET | `authenticate`, `ensureTenantContext`, `ensurePropertyAccess` | Requires `hotelId` query (400 if missing) |
| *(other room routes)* | *varies* | Often `optionalAuth` / `authenticate` + tenant | See file for CRUD |

**Client alignment:** `bookingService.getRooms` calls `GET /rooms` with filters — must send `hotelId` (from `api.ts` / property context) or the handler returns **400** (`ApplicationError('Hotel ID is required')`).

---

## Batch C — Webhooks (Stripe + OTA) — *first pass*

**Mounts:** `registerApiRoutes.js` — `/api/v1/webhooks` (`webhooks.js`), `/api/v1/ota-webhooks` (`otaWebhooks.js`).

**Body parsing:** `server.js` applies `express.raw({ type: 'application/json' })` **only** to `/api/v1/webhooks` so Stripe signature verification sees the raw buffer. Other JSON routes use `express.json()`.

**CSRF:** `middleware/csrf.js` skips paths containing `/webhooks/` (Stripe). Paths under `/api/v1/ota-webhooks` do **not** match that substring; OTA calls typically have **no** `accessToken` cookie, so CSRF still no-ops (see `csrfProtection` “only if cookie session”). Bearer header also skips CSRF.

### C1 — Stripe (`POST /api/v1/webhooks/stripe`)

| Concern | Implementation |
| --- | --- |
| Auth | **None** (provider callback) |
| Signature | `stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET)` |
| Idempotency | **`StripeWebhookEvent`** — `eventId` from Stripe; `processed` / `processing` short-circuit; `failed` retries |
| Config | 503 if `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET` missing |

### C2 — OTA (`POST /api/v1/ota-webhooks/ota`)

| Middleware (order) | Role |
| --- | --- |
| `validate(mutationBaselineSchema)` | Permissive Joi |
| `verifyWebhookSignature` | HMAC-style verification per channel in **production**; non-prod allows unsigned with warning |
| `channelRateLimit` | Per-IP + channel |
| Handler | `reservation` / `modification` / `cancellation` / `rate_change` |

**Gap vs Stripe:** No persisted idempotency record in this file (unlike `StripeWebhookEvent`) — duplicate OTA deliveries may need channel-specific dedupe in handlers (verify in `handleReservation` etc.).

`GET /api/v1/ota-webhooks/health` — lightweight health check on OTA router.

---

## Batch D — Admin surfaces — *router-level pass*

**Mounts (representative):** `/api/v1/admin` → `routes/admin.js`; `/api/v1/admin-dashboard` → `routes/adminDashboard.js`; `/api/v1/admin/travel-dashboard`, `/api/v1/admin/hotel-services`, `/api/v1/admin/loyalty`, `/api/v1/admin/service-types`; `/api/v1/admin-bypass-management` (two routers: main + bypass financial analytics).

| Router file | Router-wide middleware | Pattern |
| --- | --- | --- |
| `adminDashboard.js` | `router.use(authenticate)`, `ensureTenantContext`, `ensurePropertyAccess` | All dashboard routes get tenant + property; per-route may add `authorize` / `authorizePolicy` |
| `admin.js` | **None** at `router.use` | **Per-route** — e.g. `GET /hotels` uses `authenticate`, `ensureTenantContext`, `ensurePropertyAccess`, `authorize(['admin','staff','frontdesk'])` |

**Verification note:** When extending `admin.js`, ensure new routes include **`ensureTenantContext`** where multi-tenant data is touched (first route already does); inconsistent omission would match **FAB-001** risk class.

**Batch E** — remaining mounts in `registerApiRoutes.js` (see table below).

---

## Batch E — Remaining `/api/v1/*` mounts — *inventory*

**Method:** For each router, read **top-of-file** `router.use(...)` and first few `router.(get|post|...)` lines — same checklist as Phase 4 intro table.

| Category | Example prefixes (not line-audited in Batches A–D) |
| --- | --- |
| Bookings adjacent | `/extra-person-pricing`, `/settlements`, `/pos-settlements`, `/approvals`, `/bookings/enhanced` (see `enhancedBookings.js`) |
| Ops / staff | `/housekeeping`, `/staff-dashboard`, `/staff/alerts`, `/staff-meetups`, `/staff-tasks`, `/staff/services`, `/daily-inventory-checks`, `/inventory-notifications` |
| Guest & services | `/guests`, `/guest-services`, `/guest-lookup`, `/guest-management`, `/guest-import`, `/reviews`, `/loyalty`, `/hotel-services` |
| Inventory & rooms (non–Batch B) | `/inventory`, `/inventory/analytics`, `/checkout-inventory`, `/room-inventory`, `/room-blocks`, `/room-types`, `/tape-chart` |
| Financial / POS | `/invoices`, `/billing-history`, `/billing-sessions`, `/financial`, `/pos`, `/pos/reports`, `/revenue-management`, `/channel-manager` |
| CRM / comms | `/communications`, `/message-templates`, `/booking-conversations`, `/crm`, `/segmentation`, `/personalization`, `/email-campaigns` |
| Config / system | `/hotel-settings`, `/settings`, `/integrations`, `/workflow`, `/feature-flags`, `/api-management`, `/credentials`, `/roles` |
| Travel / external | `/travel-agents`, `/external`, `/ota`, `/ota-amendments`, `/channels`, `/booking-engine` |
| Compliance / security | `/gdpr`, `/data-privacy`, `/security-monitoring`, `/audit`, `/audit-log`, `/audit-trail`, `/login-activity` |
| Misc | `/upload`, `/photos`, `/documents`, `/ai`, `/test`, `/night-audit`, `/cancellations` (if route present), … |

**Status:** Inventory **complete** for Phase 4 “breadth” goal; **depth** (per-endpoint rows) remains optional for high-risk paths only (payments, bookings, inventory, auth — covered in A–C).

---

## Next batches (Phase 4 roadmap)

| Batch | Scope | Priority |
| --- | --- | --- |
| ~~B~~ | ~~`inventoryManagement`, `availability`, `rooms`~~ | **First pass done** (see above); deep controller review deferred |
| ~~C~~ | ~~`webhooks` (Stripe), `otaWebhookRoutes`~~ | **First pass done** (see above); OTA handler idempotency deep-dive deferred |
| ~~D~~ | ~~`admin` sub-routers~~ | **Router-level pass** (see above); per-endpoint admin matrix deferred |
| ~~E~~ | ~~Remaining `registerApiRoutes` entries~~ | **Prefix inventory** (see Batch E table); line-level audit deferred |

---

## Changelog

| Date | Change |
| --- | --- |
| 2026-03-27 | Phase 4 started: global stack + Batch A (auth, bookings, payments) scaffold. |
| 2026-03-27 | Phase 4 continued: Auth **refresh** + **logout**; **Batch B** inventory / availability / rooms tables + FAB-004/FAB-001 cross-references. |
| 2026-03-27 | **Batch C** Stripe + OTA webhooks (signature, Stripe idempotency, CSRF/raw-body notes, OTA idempotency gap). |
| 2026-03-27 | **Batch D** admin router-level patterns (`admin.js` vs `adminDashboard.js` + FAB-001 note). |
| 2026-03-27 | **Batch E** remaining `/api/v1` mount categories (breadth inventory; depth deferred). |
| 2026-03-27 | **Production readiness:** required `hotelId` on public availability reads + **`FAB-017` fixed**; frontend **`/availability/check`** path corrected. |
