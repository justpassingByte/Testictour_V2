---
phase: testing
title: Escrow Payment System Testing Strategy
description: Define testing approach and quality assurance for tournament escrow functionality.
---

# Testing Strategy

## Unit Tests
### EscrowService
- [ ] Test case 1: `escrowCommunityThresholdUsd` is read from admin settings and snapshotted onto new tournaments.
- [ ] Test case 2: Attempting to start a tournament lacking valid `funded` status throws an escrow validation error.
- [ ] Test case 3: Tournaments below the configured threshold correctly instantiate with `isCommunityMode` and bypass escrow gates.
- [ ] Test case 4: Escrow status automatically swaps to `locked` when the tournament enters the start flow.
- [ ] Test case 5: `disputed` state blocks payout release and freezes further escrow transitions.

### Webhook Reconciliation
- [ ] Test case 1: Funding webhook updates the escrow-linked transaction and marks escrow `funded` on success.
- [ ] Test case 2: Payout webhook updates payout transactions and winner payout status on success.
- [ ] Test case 3: Reprocessing the same provider event does not double-apply funding or payouts.
- [ ] Test case 4: Invalid webhook signatures are rejected immediately.

### Settlement Reporting
- [ ] Test case 1: Settlement report totals reconcile organizer funding, participant fees, payouts, refunds, and fees correctly.
- [ ] Test case 2: Participant entry fees remain separate from guaranteed organizer escrow in the report output.

## Integration Tests
- [ ] E2E flow: Admin sets the escrow threshold -> organizer creates tournament -> organizer funds escrow -> funding webhook marks escrow `funded` -> tournament is allowed to start -> escrow locks -> organizer requests payout release -> admin approves -> payout webhook reconciles winner payouts -> settlement report matches transaction history.
- [ ] Attempting to join an escrow-backed tournament without the required participant payment confirmation should fail.
- [ ] Community mode flow should allow join behavior appropriate to the configured threshold and show warning state correctly.
- [ ] Cancelling an unlocked escrow-backed tournament should refund participant fees and return organizer funding according to policy.
- [ ] Cancelling or disputing a locked tournament should freeze release and keep settlement report status unresolved.

## Manual Testing
- Admin settings UI correctly updates the community-mode threshold.
- Admin dashboards display pending proofs, unreconciled webhook events, payout releases, and disputes clearly.
- Organizer settlement report is understandable, exportable, and matches the visible transaction history.
- Community-mode warning banners and escrow-backed guarantee labels are clear on tournament detail and join screens.
