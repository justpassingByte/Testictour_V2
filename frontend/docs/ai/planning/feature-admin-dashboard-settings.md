---
phase: planning
title: Admin Dashboard Settings — Project Planning
feature: admin-dashboard-settings
description: Task breakdown, dependencies, estimates, and risks using Socket.io for in-app notifications
---

# Project Planning & Task Breakdown

## Milestones

- [ ] **M1 — Foundation:** DB schema migrations, socket room setup, base routes, UI shell refactor
- [ ] **M2 — In-App Notifications:** Socket.io emit + client notification bell, history, templates
- [ ] **M3 — Platform Settings, Feature Flags & Subscription Plans:** Settings CRUD, feature flags, plan config, maintenance mode
- [ ] **M4 — Polish & Audit:** Confirmation dialogs, audit logging, error states, loading skeletons

---

## Task Breakdown

### Phase 1: Foundation

- [ ] **1.1** Add Prisma migrations for: `Notification`, `PlatformSetting`, `FeatureFlag`, `NotificationTemplate`, `SubscriptionPlanConfig`
- [ ] **1.2** Seed initial rows:
  - `PlatformSetting`: `maintenance_mode=false`, `platform_fee_pct=10`, `max_lobby_players=8`
  - `FeatureFlag`: `enable_mini_tours=true`, `enable_rewards=true`
  - `SubscriptionPlanConfig`: FREE / PRO / ENTERPRISE with default prices + limits
- [ ] **1.3** Create `sockets/notifications.ts` — handle `join_role_room` event so clients join `role:player` or `role:partner` on connect; register in `app.ts`
- [ ] **1.4** Create admin routes scaffolding: `adminSettings.routes.ts`, `adminNotifications.routes.ts`; register in `routes/index`
- [ ] **1.5** Refactor `SettingsTab.tsx` to render inner sub-tabs: `Notifications | Platform | Feature Flags | Maintenance | Plans`
- [ ] **1.6** Add `socket.io-client` to frontend (`npm install socket.io-client`)
- [ ] **1.7** Create `components/SocketProvider.tsx` — wraps app, connects to socket server, emits `join_role_room` with current user's role on connect
- [ ] **1.8** Wrap app layout with `SocketProvider` (and `NotificationProvider` once built)

### Phase 2: In-App Notifications

- [ ] **2.1** Implement `notification.service.ts`:
  - `resolveTargetRoom(targetType)` → returns socket room string (`role:player`, `role:partner`, `tier:PRO`, `role:all`)
  - Emit `admin_notification` event via `(global as any).io.to(room).emit(...)`
  - Save `Notification` record to DB on send
- [ ] **2.2** Implement `adminNotifications.controller.ts`:
  - `POST /api/admin/notifications/send` — calls service, emits socket event, saves to DB
  - `GET /api/admin/notifications/history` — paginated notification log
  - `DELETE /api/admin/notifications/:id` — delete notification from log
  - `GET/POST/DELETE /api/admin/notifications/templates` — template CRUD
- [ ] **2.3** Create `components/NotificationProvider.tsx`:
  - React Context; holds `notifications[]` state
  - Listens for `admin_notification` socket event → appends to list + calls `toast()`
  - Persists to `localStorage` on change, restores on mount
  - Exposes `markAsRead(id)`, `markAllRead()`, `clearAll()`
- [ ] **2.4** Create `components/NotificationBell.tsx` — bell icon with unread count badge, opens `NotificationDrawer`
- [ ] **2.5** Create `components/NotificationDrawer.tsx` — slide-out panel listing all notifications; mark-as-read controls; clear all
- [ ] **2.6** Add `NotificationBell` to the navbar/header for player and partner views
- [ ] **2.7** Build `PushNotificationsSection.tsx` (admin UI):
  - Compose form: title, body, audience selector, template picker
  - Preview modal before send
  - Notification history table: title, target, sent by, date. Delete button
- [ ] **2.8** Build `NotificationTemplatesSection.tsx` — CRUD: list, create, edit, delete templates

### Phase 3: Platform Settings, Feature Flags & Subscription Plans

- [ ] **3.1** Implement `adminSettings.controller.ts`:
  - `GET /api/admin/settings` — all settings grouped by `group`
  - `PUT /api/admin/settings/:key` — update setting value + set `updatedBy`
  - `GET/PUT /api/admin/feature-flags` — flag list and toggle
  - `GET/PUT /api/admin/subscription-plans/:plan` — plan config CRUD
- [ ] **3.2** Build `PlatformSettingsSection.tsx`:
  - Grouped cards (General, Financial, Limits); inline editable fields
  - Confirmation dialog for financial changes
  - Last updated timestamp display
- [ ] **3.3** Build `FeatureFlagsSection.tsx`:
  - Toggle list with description; optimistic update on toggle
- [ ] **3.4** Build `MaintenanceModeSection.tsx`:
  - Prominent on/off toggle; maintenance message textarea
  - On enable: emit `maintenance_mode` socket event to all connected clients
- [ ] **3.5** Build `SubscriptionPlanConfigSection.tsx`:
  - Side-by-side cards for FREE / PRO / ENTERPRISE
  - Editable: monthly price, annual price, `maxLobbies`, `maxPlayersPerLobby`, `maxTournamentsPerMonth`
  - Feature toggles per plan (e.g., custom branding, analytics export, priority support)
  - Save button per plan; replaces the hardcoded `priceMap` in `AdminPartnerSubscriptionTab.tsx`

### Phase 4: Polish & Audit

- [ ] **4.1** Add audit logging on all `PUT`/`POST`/`DELETE` admin settings routes — log `userId`, `action`, `before/after` value
- [ ] **4.2** Add loading skeletons to all sections
- [ ] **4.3** Add error toast + retry on API failures
- [ ] **4.4** Add role guard: only `ADMIN` role can access settings routes/UI

---

## Dependencies

```
1.1 (migrations) → 2.1, 3.1       schema before services
1.3 (socket room handler) → 2.1   need room logic before emitting
1.4 (routes) → 2.2, 3.1           routes before controllers
1.6 + 1.7 (SocketProvider) → 2.3  frontend socket before notification listener
1.5 (SettingsTab shell) → 2.7, 3.2, 3.3, 3.4, 3.5
2.1 (notification.service) → 2.2
2.2 (notification controller) → 2.7, 2.8
2.3 (NotificationProvider) → 2.4, 2.5, 2.6
3.1 (settings controller) → 3.2, 3.3, 3.4, 3.5
```

**External dependencies:**
- Socket.io already running in `app.ts` via `global.io` ✅ — no new infra needed
- Existing admin auth middleware ✅
- `socket.io-client` npm package (needs install on frontend)

---

## Timeline & Estimates

| Phase | Effort | Notes |
|-------|--------|-------|
| Phase 1: Foundation | 1 day | Schema + socket room setup + frontend socket provider |
| Phase 2: In-App Notifications | 2–3 days | Socket emit + NotificationProvider + bell/drawer UI + admin compose UI |
| Phase 3: Settings, Flags & Plans | 2–3 days | CRUD heavy but straightforward; plan config replaces hardcoded values |
| Phase 4: Polish | 1 day | Error handling, loading states, audit logging |
| **Total** | **6–8 days** | Significantly simpler than FCM approach |

---

## Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Client not connected when notification sent | Medium | Medium | Expected — in-app only; offline users miss it. Persist in `localStorage` for users already connected |
| Socket role room not joined on connect | Medium | High | `SocketProvider` must emit `join_role_room` after auth; add server-side log to verify room membership |
| Plan config change not reflected immediately for partners | Low | Medium | Backend reads `SubscriptionPlanConfig` on every relevant API call — no caching in MVP |
| Financial settings changed accidentally | Low | High | Confirmation dialog + audit log required before save |
| `localStorage` quota exceeded for notification history | Low | Low | Cap stored notifications at 50 max; prune oldest on overflow |
