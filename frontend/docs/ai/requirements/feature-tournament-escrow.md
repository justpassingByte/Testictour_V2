---
phase: requirements
title: Tournament Escrow Payment System
description: Replace generic wallet-backed tournament money flows with tournament-bound escrow, configurable community-mode rules, automated webhooks, and organizer settlement reporting.
---

# Requirements & Problem Understanding

## Problem Statement
**What problem are we solving?**

- The current tournament money flow still behaves like a generic wallet system: users can hold USD in `Balance.amount`, pay entry fees from that balance, and receive rewards back into the same balance.
- That model makes the platform look like it is holding arbitrary user funds instead of managing money for a specific tournament obligation, which increases fintech, legal, and reconciliation risk.
- Organizers need a credible way to guarantee prize pools before a tournament starts, and players need to know whether a tournament is platform-backed or community-run at their own risk.
- Affected users: organizers funding tournaments, players paying entry fees and expecting payouts, admins reviewing proofs, webhook exceptions, and disputes, and ops/compliance stakeholders.
- Current workaround: entry fees and payouts are routed through the shared wallet and transaction flow, while organizer funding proof, threshold control, payout reconciliation, and dispute handling require manual or ad hoc intervention outside a formal escrow lifecycle.

## Goals & Objectives
**What do we want to achieve?**

- Primary goals:
  - Replace generic wallet-like tournament money handling with a per-tournament escrow lifecycle.
  - Require full organizer funding confirmation for escrow-backed tournaments before they can start.
  - Make escrow status visible to organizers, admins, and players so prize-pool guarantees are explicit.
  - Make the community-mode threshold configurable from admin settings rather than hardcoded in the application.
  - Automate escrow funding approval and payout reconciliation through payment-gateway webhooks, while keeping manual proof handling only as an exception path.
  - Keep non-withdrawable platform coins and rewards separate from fiat or escrow-backed payouts.
- Secondary goals:
  - Give admins and organizers clear dashboards for funding progress, payout readiness, disputes, and reconciliation failures.
  - Provide a dedicated organizer settlement report for participant entry-fee revenue, organizer funding, fees, payouts, refunds, and final balances per tournament.
  - Preserve a tournament-scoped audit trail for deposits, approvals, lock events, payouts, refunds, disputes, webhook events, and overrides.
- Non-goals (what's explicitly out of scope):
  - No generic user fiat wallet with arbitrary deposits, stored balances, or cash-like withdrawals.
  - No conversion of platform coins into withdrawable money.
  - No use of player entry fees to satisfy the organizer's pre-start escrow requirement.
  - No platform payout guarantee for community-mode tournaments.

## User Stories & Use Cases
**How will users interact with the solution?**

- As an organizer, I want to create a tournament with a prize pool target and immediately see whether it is escrow-backed or community mode based on the current admin-configured threshold.
- As an organizer, I want to submit tournament funding through a payment gateway or an approved manual-proof fallback so the tournament can become funded and eligible to start.
- As a player, I want to see whether a tournament's prize pool is guaranteed by platform-managed escrow or is community mode so I can decide whether to join.
- As a player, I want any required entry fee for either escrow-backed or community-mode tournaments to be recorded against the specific tournament instead of relying on a generic stored fiat wallet balance.
- As a winner, I want to provide payout details and receive a tournament-linked payout that is reconciled against the gateway or approved payout proof.
- As an admin, I want to configure escrow policy values, review exceptions, resolve disputes, and be the final release authority for payouts.
- As an organizer, I want a settlement report that explains the tournament's financial outcome end to end.
- Key workflows and scenarios:
  - Tournament creation -> read `escrowCommunityThresholdUsd` from admin settings -> if the guaranteed prize pool is below the threshold, mark the tournament as community mode; otherwise mark it as escrow-backed.
  - Organizer funding submission -> create a pending tournament-linked funding record -> gateway webhook automatically confirms and updates escrow status, or an admin reviews manual proof when the automated path is unavailable.
  - Player registration -> participant entry fees, if any, are recorded as tournament-scoped transactions for both escrow-backed and community-mode tournaments -> community mode changes guarantee rules, not the accounting model -> participant fees remain separate from the organizer-funded guaranteed prize-pool escrow.
  - Tournament start -> escrow-backed tournaments are blocked unless the organizer-funded amount fully covers the guaranteed prize pool -> escrow locks on start.
  - Tournament completion -> results are approved -> organizer requests payout release -> admin approves final release -> payout initiation and gateway webhook reconciliation update payout status for each winner.
  - Tournament cancellation -> before lock, player fees are refunded and approved organizer funding can be returned after admin review -> once those reversals settle, the escrow moves to `cancelled`; after lock, the escrow moves to `disputed` and remains frozen until admin resolution.
  - Tournament closeout -> organizer and admins can view a settlement report summarizing funding, fees, refunds, payouts, and net outcome.
- Edge cases to consider:
  - Partial funding, duplicate proof submissions, organizer edits to prize pool after partial funding, player withdrawal before start, threshold changes after tournament creation, webhook retries, failed or partial payouts, cancellation before or after lock, disputed results, and unrecoverable gateway fees.

## Success Criteria
**How will we know when we're done?**

- Every tournament is classified at creation time as either community mode or escrow-backed using the current admin-configured threshold.
- Escrow-backed tournaments cannot move into the start flow unless the organizer-funded amount fully matches the guaranteed prize-pool requirement.
- Every escrow-related money movement is linked to a tournament-specific record and can be reviewed by admins.
- The escrow lifecycle supports the normal path `not_funded -> partially_funded -> funded -> locked -> released`, with `cancelled` as the terminal state for pre-lock cancellations after refunds and organizer returns settle, and `disputed` as an exception state that freezes release after lock or contested outcomes.
- Participant entry fees are stored as tournament-scoped transactions and do not reduce the organizer's escrow requirement.
- Webhooks automatically reconcile funding approval and winner payout completion whenever the payment provider supports it, with manual review only for exceptions.
- Only admins can execute final payout release, and winners cannot be marked paid without payout destination details plus successful gateway reconciliation or approved manual proof.
- A settlement report is available for each tournament and accurately reconciles organizer funding, participant fees, fees, refunds, payouts, and outstanding issues.
- Tournament money flows no longer depend on generic user fiat wallet balances as the source of truth for either escrow-backed or community-mode tournaments; community mode changes guarantee and start-gating rules, not payment record ownership.

## Constraints & Assumptions
**What limitations do we need to work within?**

- Technical constraints:
  - The current backend still uses `Balance.amount`, `TransactionService.entryFee/refund/payout`, `Participant.paid`, and tournament prize-pool calculations based on wallet-backed entry fees. The escrow rollout must replace or isolate that flow without breaking unrelated reward or coin logic.
  - Existing schemas do not yet include escrow-specific fields such as tournament funding status, threshold snapshots, webhook reconciliation metadata, tournament-scoped payout state, dispute-state tracking, or settlement-report views.
  - Payment webhooks must be treated as authoritative for automated funding confirmation and payout reconciliation, which requires signature validation, idempotency, and retry-safe processing.
  - Manual proof upload and admin review remain required fallback paths when automated gateway confirmation is unavailable or irrecoverably fails.
- Business constraints:
  - Community mode uses an admin-configurable threshold, with an initial default value of `$50`.
  - The advertised guaranteed prize pool for an escrow-backed tournament must be fully organizer-funded before start.
  - Player entry fees are separate tournament-linked transactions in both escrow-backed and community-mode tournaments. Any organizer reimbursement or revenue settlement derived from entry fees must appear in the settlement report and cannot silently mutate guaranteed escrow state.
  - Only admins can release payouts or resolve disputes.
  - Coins remain non-withdrawable rewards and are outside the fiat escrow scope.
- Assumptions we're making:
  - Organizers are responsible for pre-funding large tournaments before start.
  - Winners must provide payout destination details before payout release.
  - Gateway providers expose stable event identifiers so webhook reconciliation can be made idempotent.
  - If an escrow-backed tournament is cancelled before lock, participant entry fees are refunded first and organizer funding can be returned after admin review, minus any unrecoverable external fees, and escrow reaches `cancelled` after those reversals settle.
  - If an escrow-backed tournament is cancelled or contested after lock, escrow enters `disputed` and remains frozen until admin resolution.

## Questions & Open Items
**What do we still need to clarify?**

- Product-policy items still requiring explicit confirmation:
  - Whether organizers may edit the guaranteed prize pool after any organizer funding has been recorded. Working assumption: increases require additional funding before start, while reductions require admin review and may need cancellation/recreation instead of silent escrow rewrites.
  - Whether partial payout failures are resolved per winner or should force a tournament-level payout hold until all winner payouts reconcile.
  - Which admin resolution paths are allowed for locked or disputed tournaments, such as full refund, partial release, organizer return, or manual override, and what audit evidence each path requires.
  - How unrecoverable gateway fees are allocated between organizer, platform, and players during cancellation, payout failure, or dispute handling.
- Remaining implementation details belong in design and planning:
  - Exact admin settings keys and caching strategy for escrow configuration.
  - Webhook retry, alerting, and dead-letter handling for unreconciled events.
  - Settlement report export format and whether CSV/PDF delivery is required in the first release.
