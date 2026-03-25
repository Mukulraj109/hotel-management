# Open Risks And Deferrals

## Purpose

This document is the formal register of known remaining risks, deferred work, and signoff exceptions.

If a risk is not listed here, it should be assumed to be expected to be closed before final production approval.

## Current Open Risks

| Severity | Area | Risk | Required To Close | Current Status |
| --- | --- | --- | --- | --- |
| High | Pilot | No completed pilot run is logged yet | Execute pilot and log findings | Open |
| High | Recovery | No backup/restore drill evidence is recorded yet | Complete restore drill and document result | Open |
| High | Concurrency | No explicit booking collision certification exists yet | Add concurrency tests/evidence | Open |
| High | Replay Safety | No explicit duplicate payment/webhook replay certification exists yet | Add replay tests/evidence | Open |
| Medium | PMS Ops | Housekeeping turnover flow is not fully certified end to end | Add integration evidence and acceptance signoff | Open |
| Medium | PMS Ops | Room-block release and sellability alignment are not fully certified | Add integration evidence and acceptance signoff | Open |
| Medium | Integrations | OTA amendment conflict/replay handling is not fully certified | Add integration evidence and operator guidance | Open |
| Medium | Product | Group booking and corporate billing product signoff is not fully captured | Add product signoff and scenario evidence | Open |

## Allowed Deferrals

None should be treated as approved by default.

Any deferral must include:
- owner
- target date
- business impact
- technical risk
- mitigation

## Deferral Template

### Deferral Item

- area:
- description:
- owner:
- target date:
- business reason:
- risk:
- mitigation:
- approval:

## Exit Rule

This document must be empty or explicitly approved before unqualified production signoff is granted.
