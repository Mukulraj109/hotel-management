# Backup Restore Drill Report

## Purpose

This document records backup and restore drill evidence required for strict production signoff.

Without a completed drill, the system cannot be called fully production ready.

## Drill Metadata

- date:
- environment:
- operator:
- database version:
- backup artifact:
- restore target:

## Pre-Drill Checks

- backup artifact exists and is readable
- restore target environment is isolated and safe
- rollback path for the drill environment exists
- application and worker versions used for verification are recorded

## Backup Evidence

- backup command used:
- backup started at:
- backup completed at:
- backup size:
- integrity/hash check:
- storage location:

## Restore Evidence

- restore command used:
- restore started at:
- restore completed at:
- restore duration:
- restore result:

## Post-Restore Validation

- application can connect to restored database
- key collections exist
- critical booking records restored
- invoice/payment records restored
- queue-related records restored
- health endpoints return expected responses

## Critical Flow Validation After Restore

- booking lookup works
- booking mutation smoke test passes
- invoice/payment lookup works
- settlement lookup works
- queue health snapshot works

## Findings

| Severity | Finding | Status | Owner | Notes |
| --- | --- | --- | --- | --- |
| Example | Restore took too long | Open | Ops | Investigate storage throughput |

## Exit Decision

- drill passed:
- production signoff impact:
- follow-up actions:

## Current Status

- no completed backup/restore drill recorded yet
