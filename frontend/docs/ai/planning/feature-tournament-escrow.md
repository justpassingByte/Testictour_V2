---
phase: planning
title: Escrow Payment System Task Breakdown
description: Tasks for replacing user wallets with tournament escrows.
---

# Project Planning & Task Breakdown

## Milestones
- [x] Milestone 1: Escrow data, settings, and migration foundation.
- [x] Milestone 2: Automated funding and payout reconciliation.
- [x] Milestone 3: Community mode, join gating, and settlement reporting.
- [x] Milestone 4: Admin controls, disputes, and operational hardening.

## Task Breakdown

### Phase 1: Data Model and Settings Foundation
- [x] Task 1.1: Remove tournament reliance on generic withdrawable fiat behavior in `Balance.amount` while preserving coins for non-withdrawable rewards.
- [x] Task 1.2: Define `Escrow` model and add `escrowStatus`, `isCommunityMode`, `escrowRequiredAmount`, and `communityThresholdSnapshot` to `Tournament`.
- [x] Task 1.3: Extend `Transaction` with `tournamentId`, `escrowId`, webhook metadata, payout metadata, and proof-review fields.
- [x] Task 1.4: Update `Participant` to include `paymentStatus` and compatibility handling for existing `paid`.
- [x] Task 1.5: Add escrow configuration keys to admin settings, including `escrowCommunityThresholdUsd`.

### Phase 2: Automated Escrow Flow & Payment Integrations
- [x] Task 2.1: Build organizer funding APIs that create escrow-linked funding transactions and initiate provider payment flows.
- [x] Task 2.2: Add payment webhook endpoints with signature validation, idempotent processing, and escrow reconciliation for funding events.
- [x] Task 2.3: Intercept tournament start logic to block start unless escrow is fully funded and transition escrow to `locked`.
- [x] Task 2.4: Build payout request and admin release APIs that create payout transactions and wait for webhook reconciliation before marking completion.
- [x] Task 2.5: Add fallback manual-proof review flows for funding and payout exceptions.
- [x] Task 2.6: Integrate Stripe (International) and MoMo (Vietnam) Checkout SDKs for Escrow Funding & Partner Subscription upgrades.

### Phase 3: Community Mode and Settlement Reporting
- [x] Task 3.1: Replace hardcoded threshold logic with admin-settings-driven community-mode classification and snapshot storage on tournament creation.
- [x] Task 3.2: Add UI warning banners and join gating behavior for community mode vs escrow-backed tournaments.
- [x] Task 3.3: Build organizer settlement report queries, APIs, and dashboard UI.
- [x] Task 3.4: Ensure participant entry fees are reported separately from organizer-funded escrow in reporting and reconciliation.

### Phase 4: Admin Controls and Hardening
- [x] Task 4.1: Add admin settings UI for escrow threshold and related policy values.
- [x] Task 4.2: Add admin dashboards for pending proofs, unreconciled webhooks, payout release, and dispute handling.
- [x] Task 4.3: Add dispute-state controls that freeze escrow and block payout release.
- [x] Task 4.4: Add monitoring, retry, and alerting support for failed or delayed webhook reconciliation.

## Dependencies
**What needs to happen in what order?**

- Schema and settings changes must land before tournament classification, escrow start validation, or settlement reporting can work.
- Payment provider credentials, webhook secrets, and reachable callback URLs must exist before automated funding or payout reconciliation can be tested end to end.
- Tournament and participant flows depend on escrow services being available before wallet-backed paths can be retired safely.
- Settlement report UI depends on the escrow and transaction reconciliation model being stable.

## Timeline & Estimates
**When will things be done?**

- Phase 1 (data model and settings foundation): Estimate 1-2 days
- Phase 2 (automated escrow flow and webhooks): Estimate 2-4 days
- Phase 3 (community mode and settlement reporting): Estimate 2-3 days
- Phase 4 (admin controls and hardening): Estimate 1-2 days

## Risks & Mitigation
**What could go wrong?**

- **Webhook delivery or signature mismatches**: Use idempotent event handling, structured logs, retry support, and provider CLI tooling in development.
- **Incorrect financial reconciliation**: Add strict transaction-linking rules and settlement-report verification tests.
- **Threshold changes causing inconsistent behavior**: Snapshot the threshold at tournament creation and audit settings changes.
- **Legacy wallet behavior leaking into escrow-backed tournaments**: Gate all tournament funding and payout transitions through `EscrowService`.
