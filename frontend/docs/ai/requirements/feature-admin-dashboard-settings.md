---
phase: requirements
title: Admin Dashboard Settings
feature: admin-dashboard-settings
description: Centralized settings panel in the admin dashboard — push notifications (in-app), platform config, and operational controls
---

# Requirements & Problem Understanding

## Problem Statement

The Admin Settings tab in the admin dashboard is currently a placeholder (`"Settings interface will be displayed here."`). Admins have no UI to:
- Send **in-app notifications** to players or partners (pop-up + stored history)
- Configure global platform defaults (fees, limits, maintenance mode)
- Control feature flags

**Affected roles:** Platform admins
**Current workaround:** Direct backend/database manipulation or custom API calls

---

## Goals & Objectives

### Primary Goals
- Implement a fully functional Admin Settings tab with sub-sections
- Enable admins to send **in-app notifications** that appear as pop-up toasts on the client's screen in real time (via Socket.io — already in the backend)
- Store received notifications in a client-side notification history panel (bell icon that opens a dropdown/drawer listing past notifications)
- Enable admins to manage platform-wide operational settings

### Secondary Goals
- Support segmented notifications (target all users, only players, only partners, by subscription tier)
- Allow scheduling of notifications
- Notification history persists in local storage / DB so it survives page refreshes
- Allow admin to manage notification templates (pre-written messages)

### What This Is NOT (Non-Goals)
- ❌ No Firebase/FCM push notifications (mobile/browser OS-level) — those are out of scope
- ❌ No email campaigns
- ❌ No per-user chat or direct messaging
- ❌ No service workers or background delivery — notifications only appear when the client app is open

---

## User Stories & Use Cases

### In-App Notification Sending (Admin Side)

- **As an admin**, I want to compose a notification (title + message) and target it at all players, all partners, or a specific tier, and send it. I want to see a list of all notifications that have been sent and their status. I want to be able to delete notifications. I want to be able to edit notifications.I want select provided templates to send notifications.
- **As an admin**, I want to see a log of sent notifications (title, target audience, sent by, timestamp) to audit past broadcasts.
- **As an admin**, I want to preview a notification before sending to catch errors.
- **As an admin**, I want to schedule a notification for a future time.

### In-App Notification Receiving (Client Side — All Users)

- **As a player or partner**, when the admin sends a notification targeting me, I want to see a **pop-up toast** appear in the corner of my screen in real time.
- **As a player or partner**, I want to click a **bell icon** (in the navbar or header) to open a notification panel that shows all my previous notifications, including unread count.
- **As a player or partner**, I want to mark notifications as read (individually or all at once).
- **As a player or partner**, my notification history should persist even if I navigate between pages (stored in state/local storage or DB).

### Platform Settings

- **As an admin**, I want to toggle maintenance mode on/off and set a maintenance message.
- **As an admin**, I want to configure platform-wide defaults (fee %, max lobby players) without a code redeployment.
- **As an admin**, I want to manage feature flags (enable/disable features).

### Subscription Plan Management *(new)*

- **As an admin**, I want to define what features are included in each plan (FREE / PRO / ENTERPRISE) so that I can control what partners get access to without a code redeployment.
- **As an admin**, I want to set numeric limits per plan (e.g., `maxLobbies`, `maxPlayersPerLobby`, `maxTournamentsPerMonth`) so that I can tune plan tiers over time.
- **As an admin**, I want to move a feature from one plan to another (e.g., custom branding was PRO → now ENTERPRISE) by editing the plan definition — and have that reflected immediately for all partners on those plans.
- **As an admin**, I want to set the monthly/annual price for each plan so that pricing is configurable without a code deploy.
- **As an admin**, I want to see a clear side-by-side comparison of all plan tiers (features + limits + price) so that I can spot inconsistencies easily.

---

## Success Criteria

- Admin sends a notification → it appears on all matching connected clients' screens as a toast within 2 seconds
- Notification count badge on the bell icon increments for every unread notification
- Notification history persists across page navigations (local storage or DB-backed)
- Platform settings changes take effect within 60 seconds (or immediate with optimistic UI)
- All sent notifications are logged and viewable in the admin settings panel

---

## Technical Approach (Delivery Mechanism)

Notifications are delivered via **Socket.io**, which is already set up in the backend (`app.ts` exposes `global.io`). The pattern mirrors the existing tournament `lobby_update` event.

**Flow:**
1. Admin submits notification via `POST /admin/notifications/send`
2. Backend resolves target users' socket IDs (or emits to a room like `role:player`)
3. Backend emits a `admin_notification` socket event to the target room
4. Frontend `NotificationProvider` listens on this event, shows a toast, and appends to notification history state

**Client notification state is stored in:**
- React Context (`NotificationContext`) for in-memory state during session
- `localStorage` for persistence across page refreshes (or Prisma `Notification` table if persistence is needed on the server side)

---

## Constraints & Assumptions

### Technical Constraints
- Socket.io server is already running and accessible via `global.io` in the backend
- No Redis required for the basic notification feature (no FCM, no job queue for notifications)
- BullMQ/Redis would only be needed for scheduled notifications (deferred delivery)
- Frontend has no existing `socket.io-client` integration — needs to be added

### Business Constraints
- Financial settings (fee %) require a confirmation step before saving
- Feature flag changes are scoped to `ADMIN` role (updated from SUPER_ADMIN)

### Assumptions
- Socket.io rooms are organized by role: all connected players join `role:player` room, all partners join `role:partner` room on connection
- Notifications do NOT need to be delivered to users who are currently offline (no persistence to FCM)
- `localStorage` is sufficient for notification persistence for now

---

## Questions & Open Items

- [x] **FCM setup?** — ~~Not needed.~~ Changed to in-app only via Socket.io ✅
- [ ] **Offline delivery**: Should notifications be stored in DB and shown to users when they next log in? Or only for currently-connected users?
- [ ] **Scheduling**: Required in MVP? (Needs BullMQ/Redis which is currently disabled)
- [ ] **Socket rooms**: Do players/partners currently join role-based socket rooms on login? Or do we need to implement that join logic?
- [ ] **Notification persistence**: `localStorage` only, or store `Notification` records in the DB?
- [ ] **Maintenance mode**: Should maintenance mode redirect users or serve a static page?
