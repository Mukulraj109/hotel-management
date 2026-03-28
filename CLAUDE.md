# Hotel Management System (PMS) — CLAUDE.md

## Project Overview
Enterprise-grade hotel management system. Node.js/Express backend, React/TypeScript frontend, MongoDB, Redis, Stripe payments, Socket.io real-time.

## Architecture
- **Backend:** `backend/src/` — MVC + Service Layer (168 routes, 108 controllers, 164 services, 176 models, 33 middleware)
- **Frontend:** `frontend/src/` — React 18 + TypeScript + Vite + Zustand + TanStack Query (200 pages, 423 components)
- **Tests:** `backend/src/tests/`, `e2e-tests/`, `frontend/src/**/*.test.*`
- **Agent System:** `agents/` — 18-agent autonomous code reviewer

## Code Reviewer Agent System
Located at `agents/`. Run with `node agents/index.js`.

### Available Agents (register as sub-agents when needed):

| Agent | File | Use When |
|-------|------|----------|
| CodebaseAnalyzerAgent | `agents/agents/CodebaseAnalyzerAgent.js` | Need to catalog files, models, routes, services |
| DataFlowAgent | `agents/agents/DataFlowAgent.js` | Tracing request lifecycle, finding broken chains |
| BugDetectionAgent | `agents/agents/BugDetectionAgent.js` | Finding async bugs, null safety, error swallowing |
| SecurityAuditAgent | `agents/agents/SecurityAuditAgent.js` | OWASP Top 10, auth issues, injection, data leakage |
| PerformanceAgent | `agents/agents/PerformanceAgent.js` | N+1 queries, missing indexes, unbounded queries |
| ArchitectureAgent | `agents/agents/ArchitectureAgent.js` | God files, circular deps, layer violations |
| ConcurrencyAgent | `agents/agents/ConcurrencyAgent.js` | Race conditions, missing transactions, double booking |
| BookingSystemAgent | `agents/agents/BookingSystemAgent.js` | Booking workflow, room assignment, rate calc |
| PaymentFlowAgent | `agents/agents/PaymentFlowAgent.js` | Stripe, webhooks, refunds, idempotency |
| MultiTenancyIsolationAgent | `agents/agents/MultiTenancyIsolationAgent.js` | Cross-hotel data leakage, missing hotelId filters |
| HotelOperationsAgent | `agents/agents/HotelOperationsAgent.js` | Housekeeping, maintenance, inventory, laundry |
| ComplianceAgent | `agents/agents/ComplianceAgent.js` | GDPR, PCI-DSS, data retention, audit trails |
| APIDesignAgent | `agents/agents/APIDesignAgent.js` | REST conventions, response consistency, docs |
| TestCoverageAgent | `agents/agents/TestCoverageAgent.js` | Untested critical paths, coverage gaps |
| FrontendQualityAgent | `agents/agents/FrontendQualityAgent.js` | React quality, accessibility, error boundaries |
| ErrorResilienceAgent | `agents/agents/ErrorResilienceAgent.js` | Graceful degradation, circuit breakers, fallbacks |
| BusinessLogicCompletenessAgent | `agents/agents/BusinessLogicCompletenessAgent.js` | Feature completeness, user journeys, KPIs |
| RefactorExecutionAgent | `agents/agents/RefactorExecutionAgent.js` | Fix plan generation, automated refactoring |

### Running Agents
```bash
cd agents
node index.js                      # Full 18-agent review
node index.js --agents=security    # Single agent
node index.js --mode=fix           # Apply auto-fixes
node index.js --parallel           # Parallel within phases
```

### Reports Output
Reports go to `agents/reports/` as JSON + Markdown.

## Key Conventions
- Backend uses CommonJS (`require`/`module.exports`)
- Frontend uses ESM (`import`/`export`)
- MongoDB with Mongoose ODM
- All tenant-scoped queries MUST filter by `hotelId`
- Authentication via JWT (middleware at `backend/src/middleware/auth.js`)
- Roles: admin, manager, frontdesk, staff, housekeeping, guest, travel_agent
- Error handling: `catchAsync` wrapper or `try/catch` in controllers

## Data Fetching — Server-Side Pagination & Protection (MANDATORY)
All list/collection endpoints and queries MUST use server-side pagination, sorting, and filtering so the system stays stable even with 10,000,000+ records. If you find code that fetches unbounded data, **auto-fix it** before moving on.

### Backend Rules
- **Never** use `.find({})` without `.limit()` — always default to `limit=20, maxLimit=100`
- Every list endpoint MUST accept `page`, `limit`, `sort`, `order` query params
- Use `.skip()` and `.limit()` (or cursor-based pagination for large offsets) on all Mongoose queries
- Add `.lean()` for read-only list queries to reduce memory
- Return pagination metadata: `{ data, page, limit, totalCount, totalPages }`
- Use `.countDocuments()` with the same filter for `totalCount`
- For search/filter endpoints, ensure indexes exist on filtered fields

### Frontend Rules
- **Never** fetch all records at once — always pass `page` & `limit` params
- Use TanStack Query with `keepPreviousData: true` for smooth pagination UX
- Implement paginated tables/lists with page controls (next/prev/page number)
- For infinite scroll, use `useInfiniteQuery` with cursor or page-based fetching
- Show loading/skeleton states during page transitions

### Auto-Fix Mandate
When working on any file, if you encounter an unbounded `.find()`, `Model.find({})` without limit, or a frontend fetch that loads all records without pagination — **fix it immediately** by adding proper server-side pagination. Do not leave unbounded queries in the codebase.

## Production Readiness Plan
See `PRODUCTION_READINESS_PLAN.md` for the full 12-week plan with 975 findings across 12 categories.

## Common Commands
```bash
# Backend
cd backend && npm run dev

# Frontend
cd frontend && npm run dev

# Tests
cd backend && npm test
npm run test:e2e

# Agent System
cd agents && node index.js
```
