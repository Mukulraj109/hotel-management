# Resilience Test Plan

## Goal

Define the next required resilience and certification tests beyond the current unit baseline.

## Priority 1

- concurrent booking attempts for the same room and dates
- duplicate payment webhook replay handling
- checkout settlement integration flow
- room block availability exclusion verification

## Priority 2

- housekeeping turnover integration flow
- OTA amendment approve/reject replay handling
- queue retry and dead-letter style behavior verification

## Priority 3

- backup and restore rehearsal automation
- production-like API plus worker rollout smoke automation

## Current Baseline

- module seam unit tests
- invoice lifecycle sync unit tests
- night audit no-show persistence test
- queue lifecycle resilience test

## Recommendation

Use this plan as the backlog for the deeper certification work if Phase 7 is reopened for full production signoff.
