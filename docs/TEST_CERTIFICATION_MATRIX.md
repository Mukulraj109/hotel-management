# Test Certification Matrix

## Purpose

This document maps critical production flows to current automated verification and identifies what still needs deeper certification.

Phase 7 is not complete because tests exist somewhere in the repo.
It is complete only when the highest-risk flows have explicit automated evidence.

## Current Automated Coverage

### Booking Baseline

Covered now:
- booking creation preparation and overlap-safe setup
- booking permission and transition guards
- settlement input validation

Evidence:
- `backend/src/tests/unit/bookingModuleService.test.js`

### Billing Baseline

Covered now:
- invoice status transition rules
- payment reconciliation behavior
- strict vs observe reconciliation policy

Evidence:
- `backend/src/tests/unit/billingModuleService.test.js`
- `backend/src/tests/unit/invoiceLifecycleSyncService.test.js`

### API Contract Baseline

Covered now:
- versioning middleware baseline

Evidence:
- `backend/src/tests/unit/apiVersioningMiddleware.test.js`

### Night Audit Resilience Baseline

Covered now:
- no-show processing during night audit uses mutable documents and persists changes safely

Evidence:
- `backend/src/tests/unit/nightAuditService.test.js`

### Queue Lifecycle Resilience Baseline

Covered now:
- queue processing does not start when Redis is unavailable
- queue shutdown clears both worker polling intervals cleanly

Evidence:
- `backend/src/tests/unit/queueService.test.js`

## Still Missing For Full Certification

### Concurrency

- simultaneous booking attempts for the same room/date window
- duplicate payment or refund replay handling
- room block vs booking race conditions

### Integration

- booking create to invoice to checkout settlement flow
- check-out to housekeeping to ready-to-sell flow
- OTA amendment approval/rejection with booking state sync

### Degraded Mode

- Redis unavailable during queue and cache-backed operations
- transient DB failure during critical booking or billing mutation
- webhook replay and retry behavior

### Operational Certification

- restore-drill backed evidence
- production-like worker/API deployment certification

## Exit Rule

Phase 7 is fully complete only when critical booking, billing, operational, and integration failure modes have direct automated evidence.
