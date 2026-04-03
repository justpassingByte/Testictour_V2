---
phase: testing
title: Admin Dashboard Settings — Testing Strategy
feature: admin-dashboard-settings
description: Test plan for push notifications, platform settings, feature flags, and maintenance mode
---

# Testing Strategy

## Test Coverage Goals

- Unit tests: 100% of service logic (`notification.service.ts`, `fcm.service.ts`, `adminSettings.controller.ts`)
- Integration tests: All admin API endpoints (happy path + auth/role enforcement + error cases)
- E2E tests: Critical admin flows via browser (send notification, toggle maintenance mode, update setting)
- Manual tests: Actual push notification delivery on a test device

---

## Unit Tests

### `notification.service.ts`
- [ ] `resolveTargetTokens("all")` — returns tokens for both players and partners
- [ ] `resolveTargetTokens("players")` — returns only player device tokens
- [ ] `resolveTargetTokens("partners")` — returns only partner device tokens
- [ ] `resolveTargetTokens("tier:PRO")` — returns only tokens for PRO-tier partners
- [ ] `resolveTargetTokens("tier:ENTERPRISE")` — returns empty array when no ENTERPRISE partners
- [ ] Fan-out batching — 1200 tokens produces 3 FCM batch calls (500/500/200)
- [ ] `NotificationLog` entry is created with correct `status: "sent"` after successful send
- [ ] `NotificationLog` entry records `failureCount` when some FCM tokens fail

### `fcm.service.ts`
- [ ] `sendToTokens([])` — returns early without calling Firebase (empty token list)
- [ ] `sendToTokens(tokens, title, body)` — calls `firebase-admin.messaging().sendEachForMulticast()` correctly
- [ ] Invalid tokens are filtered and counted as `failureCount`

### `adminSettings.controller.ts`
- [ ] `GET /admin/settings` — returns settings grouped by `group`
- [ ] `PUT /admin/settings/maintenance_mode` — parses boolean string `"true"` → `true`
- [ ] `PUT /admin/settings/platform_fee_pct` — validates value is a number between 0 and 100
- [ ] `PUT /admin/settings/platform_fee_pct` — rejects `"abc"` with 400 error

### `adminNotifications.controller.ts`
- [ ] `POST /admin/notifications/send` with `scheduledAt: null` — sends immediately, does not enqueue job
- [ ] `POST /admin/notifications/send` with future `scheduledAt` — enqueues BullMQ job, does not send immediately
- [ ] `DELETE /admin/notifications/:id/cancel` — removes BullMQ job and sets log status to `"cancelled"`
- [ ] Returns 404 if notification log ID does not exist

---

## Integration Tests

- [ ] `POST /admin/notifications/send` — authenticated as ADMIN, succeeds
- [ ] `POST /admin/notifications/send` — unauthenticated (no JWT), returns 401
- [ ] `POST /admin/notifications/send` — authenticated as PLAYER (wrong role), returns 403
- [ ] `GET /admin/notifications/history` — returns paginated results with correct shape
- [ ] `GET /admin/settings` — returns all seeded platform settings
- [ ] `PUT /admin/settings/maintenance_mode` — updates value and records `updatedBy` in DB
- [ ] `GET /admin/feature-flags` — returns feature flag list
- [ ] `PUT /admin/feature-flags/enable_mini_tours` — authenticated as SUPER_ADMIN, succeeds
- [ ] `PUT /admin/feature-flags/enable_mini_tours` — authenticated as ADMIN (not super), returns 403

---

## End-to-End Tests

> Run with: `npx playwright test` (if Playwright is set up) or manual browser testing

- [ ] **E2E-1:** Admin logs in → navigates to Admin Dashboard → Settings tab → Notifications sub-tab is visible
- [ ] **E2E-2:** Admin fills in notification title/body, selects "All Players", clicks Send → success toast appears, history table shows new entry
- [ ] **E2E-3:** Admin selects a notification template — title and body fields are pre-filled
- [ ] **E2E-4:** Admin toggles maintenance mode ON → confirmation dialog appears → confirms → toggle shows ON state
- [ ] **E2E-5:** Admin changes `platform_fee_pct` to 15 → confirmation dialog appears → saves → value persists on page refresh
- [ ] **E2E-6:** Admin (non-super) sees Feature Flags tab is hidden or disabled

---

## Manual Testing

### Push Notification Delivery

**Prerequisites:**
1. Have a test device (phone/browser) logged in to the TesTicTour app with notification permissions granted
2. Ensure the device token is registered (login triggers `POST /auth/device-token`)

**Steps:**
1. Log in as admin at `/[locale]/dashboard/admin`
2. Go to Settings tab → Notifications section
3. Title: "Test Notification", Body: "This is a test"
4. Target: "All Players"
5. Click "Preview" — verify preview modal shows correct content
6. Click "Send"
7. ✅ Verify: push notification appears on test device within 60 seconds
8. ✅ Verify: notification appears in History table with status "sent" and successCount ≥ 1

### Maintenance Mode

**Steps:**
1. Log in as admin
2. Go to Settings → Maintenance tab
3. Toggle Maintenance Mode ON, enter message "Scheduled maintenance until 8PM"
4. Save
5. Open a new browser tab as a non-admin user
6. ✅ Verify: user sees maintenance message instead of the normal app
7. Toggle Maintenance Mode OFF, save
8. ✅ Verify: normal app access restored

---

## Test Data

- Seed at least 3 users with `DeviceToken` entries (for notification targeting tests)
- Seed `PlatformSetting` rows: `maintenance_mode=false`, `platform_fee_pct=10`, `max_lobby_players=8`
- Seed `FeatureFlag` rows: `enable_mini_tours=true`, `enable_rewards=true`

---

## Performance Testing

- [ ] Send notification to 500 test tokens — verify all delivered within 60 seconds
- [ ] Verify `GET /admin/settings` responds in < 200ms (use `k6` or Postman)
- [ ] Verify history table with 1000 rows paginates correctly without timeout

---

## Bug Tracking

- Severity: P1 = notification not delivered to any user | P2 = partial delivery | P3 = UI bug
- All P1 bugs must be fixed before M2 release
