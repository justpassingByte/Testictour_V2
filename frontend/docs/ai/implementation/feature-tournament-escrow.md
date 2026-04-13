---
phase: implementation
title: Escrow Payment System Implementation Guide
description: Technical implementation notes for the per-tournament escrow system.
---

# Implementation Guide

## Code Structure

### Backend (`Testictour_be/`)
- `prisma/schema.prisma`: Escrow model, Tournament escrow fields, Transaction escrow/webhook/retry fields, Participant paymentStatus.
- `src/services/EscrowService.ts`: Core escrow lifecycle — funding, locking, payout, dispute, retry, and health monitoring.
- `src/services/SettingsService.ts`: Platform settings for escrow thresholds, provider config, and alert timing.
- `src/services/SettlementReportService.ts`: Organizer/admin settlement report from tournament + escrow + transaction state.
- `src/services/StripeService.ts`: Stripe Checkout integration for escrow funding and subscription upgrades.
- `src/services/MomoService.ts`: MoMo payment integration for Vietnam market.
- `src/controllers/EscrowController.ts`: REST endpoints for all escrow operations.
- `src/controllers/PaymentWebhookController.ts`: Provider webhook signature verification and routing.
- `src/controllers/SettlementReportController.ts`: Settlement report endpoint.
- `src/routes/adminEscrow.routes.ts`: Admin-only escrow routes.
- `src/routes/escrow.routes.ts`: Organizer-facing escrow routes.
- `src/routes/webhook.routes.ts`: Payment provider webhook endpoints.

### Frontend (`frontend/`)
- `app/[locale]/dashboard/admin/escrow/page.tsx`: Admin escrow operations dashboard.
- `app/[locale]/dashboard/admin/components/AdminEscrowOperationsTab.tsx`: Pending proofs, reconciliation, disputes, payouts UI.
- `app/[locale]/dashboard/admin/components/EscrowSettingsSection.tsx`: Escrow platform settings UI.
- `app/[locale]/dashboard/partner/components/SettlementTab.tsx`: Partner settlement report view.
- `app/[locale]/tournaments/[id]/register/page.tsx`: Join-gating logic for community vs escrow-backed.

## Data Model

### Escrow Model
```
Escrow {
  id, tournamentId (unique), requiredAmount, fundedAmount, releasedAmount,
  status (not_funded | partially_funded | funded | locked | released | cancelled | disputed),
  reconciliationStatus (pending | success | failed | stale),
  lockedAt, releasedAt, cancelledAt, disputedAt,
  disputeReason, disputeResolvedAt, disputeResolution,
  latestWebhookEventId, lastReviewedById, lastReviewedAt,
  retryCount, lastRetryAt, nextRetryAt
}
```

### Tournament Escrow Fields
```
escrowStatus, isCommunityMode, escrowRequiredAmount, communityThresholdSnapshot
```

### Transaction Escrow Fields
```
tournamentId, escrowId, paymentMethod, externalRefId, providerEventId,
proofUrl, payoutDestination, reviewedById, reviewedAt, reviewNotes,
retryCount, lastRetryAt, failureReason
```

## API Reference

### Organizer Endpoints (auth: owner or admin)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/tournaments/:id/escrow` | Get escrow snapshot |
| POST | `/tournaments/:id/escrow/funding` | Submit funding (manual/gateway) |
| GET | `/tournaments/:id/escrow/transactions` | List escrow transactions |
| POST | `/tournaments/:id/payouts/request-release` | Request payout release |

### Admin Escrow Operations (auth: admin)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/escrow/queues` | Operational queues overview |
| GET | `/admin/escrow/health` | Reconciliation health report |
| POST | `/admin/escrow/transactions/:id/review` | Approve/reject manual proof |
| POST | `/admin/escrow/transactions/:id/retry` | Simple retry |
| POST | `/admin/escrow/transactions/:id/retry-backoff` | Retry with exponential backoff |
| POST | `/admin/escrow/bulk-retry` | Bulk retry all stale transactions |
| POST | `/admin/escrow/timeout-stale` | Mark critically stale as timed out |

### Admin Tournament Escrow (auth: admin)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/admin/tournaments/:id/payouts/release` | Approve payout release |
| POST | `/admin/tournaments/:id/dispute` | Mark escrow as disputed |
| POST | `/admin/tournaments/:id/dispute/resolve` | Resolve dispute (refund/release/custom) |
| POST | `/admin/tournaments/:id/escrow/freeze` | Freeze escrow for investigation |
| POST | `/admin/tournaments/:id/escrow/unfreeze` | Unfreeze disputed escrow |
| POST | `/admin/tournaments/:id/escrow/cancel` | Cancel pre-lock escrow |

### Admin Settings (auth: admin)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/settings/escrow` | Get escrow settings |
| PUT | `/admin/settings/escrow` | Update escrow settings |
| GET | `/admin/tournaments/:id/settlement-report` | Get settlement report |

## Implementation Notes

### Phase 1: Data Model Foundation
- Tournament creation reads `escrowCommunityThresholdUsd` from admin settings, classifies the tournament, and snapshots the threshold onto the tournament record.
- The `Escrow` model tracks funded/released amounts with double-entry via Transaction aggregation.

### Phase 2: Automated Escrow Flow
- Funding creates a pending `escrow_deposit` transaction, then redirects to Stripe/MoMo checkout.
- Provider webhooks validate signatures, match transactions by reference, and reconcile idempotently.
- Tournament start blocks unless `isCommunityMode` or `escrowStatus === 'funded'`, then locks the escrow.

### Phase 3: Community Mode & Settlement
- Community mode tournaments bypass escrow requirements with explicit UI warnings.
- Settlement reports reconcile funding, entry fees, refunds, fees, payouts, and unresolved items.

### Phase 4: Disputes & Monitoring
- **Freeze/Unfreeze**: Admin can freeze an escrow for investigation without full dispute. Unfreeze restores to previous state.
- **Dispute Resolution**: Four strategies — `refund_organizer` (full refund), `release_payouts` (force-release pending payouts), `partial_refund`, `custom`.
- **Retry with Backoff**: Failed transactions retry with exponential backoff (2, 4, 8, 16, 32 min). Max 5 retries.
- **Health Monitoring**: Reconciliation health score (0-100) with status levels (healthy/warning/critical). Tracks stale transactions, critical pending, disputed escrows.
- **Bulk Operations**: Admin can bulk-retry stale or bulk-timeout critically stuck transactions.

## Security & Error Handling
- Payouts never exceed escrow-backed amount via `ensurePayoutCapacity()`.
- Only admins can execute dispute overrides, payout release, and escrow policy changes.
- Webhooks validate signatures, track processed event IDs, and behave idempotently.
- Community mode tournaments have clear UI warnings — prizes are not platform-backed.
- All financial mutations are wrapped in Prisma `$transaction` for atomicity.
- Retry tracking prevents infinite loops with max retry count and exponential backoff.
