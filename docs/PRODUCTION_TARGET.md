# Production Target

## Purpose
This document is the source-of-truth production target for the PMS backend.

It supersedes high-level audit claims that mark work as "done" when only a baseline or adapter exists.
An item is considered production-ready only when:
- the implementation exists,
- the implementation is the canonical path,
- the implementation is covered by automated verification,
- the implementation is observable in production, and
- the implementation has rollback-safe operational guidance.

## Current Read Of The Codebase
The system has strong baseline hardening in several areas:
- booking creation has transaction + overlap protection
- RBAC, validation, API versioning, Docker, Redis, and CI exist
- billing has invoice models, event logging, and reconciliation baseline

The system is not yet fully production-ready because:
- major backend domains are still large JavaScript route/controller files
- modularization is partial and still relies on legacy route adapters
- financial domain ownership is split across overlapping models and services
- critical PMS flows are not yet certified end-to-end
- operational readiness is only partially documented and not fully proven by tests

## Release Gates

### Gate A: Booking Integrity
Exit criteria:
- all booking create/update/cancel/check-in/check-out flows use canonical service-level rules
- all room assignment and overlap checks are concurrency-safe
- no known double-booking path remains
- critical booking flows have integration and concurrency coverage

Current status:
- partial

### Gate B: Billing And Revenue Integrity
Exit criteria:
- one canonical invoice/payment architecture
- backend-only tax and billing calculations
- immutable finalized invoices
- deterministic reconciliation for booking, invoice, settlement, refund flows
- end-to-end tests for issue/pay/refund/check-out settlement

Current status:
- partial

### Gate C: Authentication, RBAC, And Tenant Isolation
Exit criteria:
- all protected routes use canonical auth + policy middleware
- all tenant-scoped queries and mutations are hotel-scoped
- no IDOR-style cross-property access paths remain
- automated regression coverage for protected and tenant-scoped paths

Current status:
- strong baseline, not yet certified

### Gate D: Validation And API Contracts
Exit criteria:
- all mutation routes validated
- route contracts documented and versioned
- compatibility behavior is explicitly tested
- no silent payload shape drift on critical APIs

Current status:
- strong baseline

### Gate E: Architecture And Maintainability
Exit criteria:
- booking, billing, inventory, auth, guests, operations, reports, and integrations are module-owned
- route files are thin
- server bootstrap is composition-only
- deprecated duplicate services/models/routes are documented and scheduled for removal

Current status:
- partial

### Gate F: Type Safety
Exit criteria:
- backend TypeScript is enabled for critical domains with strict mode
- typed service contracts for booking, billing, auth, and event payloads
- no new critical-domain JS added after migration starts

Current status:
- not started for backend

### Gate G: Operational Readiness
Exit criteria:
- health, metrics, logging, alerts, queue telemetry, backup checks, and restore drills are operational
- production deploy and rollback procedures are tested
- API process and worker responsibilities are clearly separated

Current status:
- partial

### Gate H: PMS Functional Completeness
Exit criteria:
- night audit, no-show, folio, settlement, room status, housekeeping, OTA amendments, and daily operations are certified
- operational edge cases have acceptance criteria
- pilot signoff completed

Current status:
- partial / unclear

## Mandatory Production Workstreams
1. Correctness and revenue safety
2. Security and tenant isolation certification
3. Domain modularization
4. Backend TypeScript migration for critical domains
5. Operational maturity and worker hardening
6. PMS functional certification
7. Pilot rollout and go-live

## Non-Goals For Early Phases
- cosmetic endpoint cleanup without reducing risk
- broad feature expansion before critical path certification
- deep frontend redesign before backend production gates

## Success Definition
The backend is "100% production ready" only when all release gates above are green and the pilot rollout completes without Sev-1 or Sev-2 regressions.
