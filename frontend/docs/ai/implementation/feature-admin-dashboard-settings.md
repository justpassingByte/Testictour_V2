---
phase: implementation
title: Admin Dashboard Settings — Implementation Guide (Revised)
feature: admin-dashboard-settings
description: Code structure, patterns, and integration points using Socket.io for in-app notification delivery
---

# Implementation Guide

## Development Setup

### Prerequisites
- Socket.io already running in `app.ts` — no new services needed ✅
- Existing admin auth middleware ✅
- Prisma + PostgreSQL ✅

### Install (Frontend only)
```bash
# In TesTicTour (Next.js root)
npm install socket.io-client
```

> ❌ No `firebase-admin`. ❌ No FCM credentials. ❌ No device tokens. Just Socket.io.

---

## Code Structure

```
Testictour_be/src/
├── controllers/
│   ├── adminSettings.controller.ts        # Settings + feature flags + subscription plans CRUD
│   └── adminNotifications.controller.ts   # Send, history, templates, delete
├── routes/
│   ├── adminSettings.routes.ts            # /api/admin/settings, /feature-flags, /subscription-plans
│   └── adminNotifications.routes.ts       # /api/admin/notifications/*
├── services/
│   └── notification.service.ts            # Resolve socket room + emit + save DB record
└── sockets/
    └── notifications.ts                   # join_role_room handler → joins socket room

app/[locale]/
├── components/
│   ├── SocketProvider.tsx                 # Connects socket.io-client; emits join_role_room
│   ├── NotificationProvider.tsx           # Context: notification list, toast on event, localStorage
│   ├── NotificationBell.tsx              # Bell icon + unread badge → opens drawer
│   └── NotificationDrawer.tsx            # History panel: list, mark read, clear
└── dashboard/admin/components/
    ├── SettingsTab.tsx                    # Sub-tabs: Notifications | Platform | Flags | Maintenance | Plans
    ├── PushNotificationsSection.tsx       # Compose + send + history table + templates
    ├── NotificationTemplatesSection.tsx   # Template CRUD
    ├── PlatformSettingsSection.tsx        # Grouped key→value settings
    ├── FeatureFlagsSection.tsx            # Toggle list
    ├── MaintenanceModeSection.tsx         # On/off + message
    └── SubscriptionPlanConfigSection.tsx  # Side-by-side plan cards (FREE/PRO/ENTERPRISE)
```

---

## Implementation Notes

### 1. Socket Room Setup (`sockets/notifications.ts`)

Register alongside the existing tournament socket in `app.ts`:

```typescript
// sockets/notifications.ts
import { Server } from 'socket.io';

export default function registerNotificationSocket(io: Server) {
  io.on('connection', (socket) => {
    // Client emits this right after connecting, with their role
    socket.on('join_role_room', (role: string) => {
      // role = 'player' | 'partner' | 'admin'
      socket.join(`role:${role}`);
      // Also join tier room if partner (client should send tier too)
    });

    socket.on('join_tier_room', (tier: string) => {
      // tier = 'PRO' | 'ENTERPRISE' | 'FREE'
      socket.join(`tier:${tier}`);
    });
  });
}
```

```typescript
// app.ts — add alongside registerTournamentSocket
import registerNotificationSocket from './sockets/notifications';
registerNotificationSocket(io);
```

---

### 2. Notification Service (`services/notification.service.ts`)

```typescript
import { prisma } from './prisma';

function getSocketRoom(targetType: string): string {
  if (targetType === 'players')  return 'role:player';
  if (targetType === 'partners') return 'role:partner';
  if (targetType.startsWith('tier:')) return `tier:${targetType.split(':')[1]}`;
  return 'role:all'; // "all" — broadcast to every connected client
}

export async function sendNotification({
  title, body, targetType, sentBy,
}: {
  title: string; body: string; targetType: string; sentBy: string;
}) {
  // 1. Save to DB for admin history log
  const record = await prisma.notification.create({
    data: { title, body, targetType, sentBy, status: 'sent' },
  });

  // 2. Emit via Socket.io — reuse global.io from app.ts
  const io = (global as any).io;
  const room = getSocketRoom(targetType);

  if (room === 'role:all') {
    io.emit('admin_notification', { id: record.id, title, body, sentAt: record.sentAt });
  } else {
    io.to(room).emit('admin_notification', { id: record.id, title, body, sentAt: record.sentAt });
  }

  return record;
}
```

---

### 3. Frontend — SocketProvider (`components/SocketProvider.tsx`)

```typescript
'use client';
import { createContext, useContext, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react'; // or your auth hook

const SocketContext = createContext<Socket | null>(null);
export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const { data: session } = useSession();

  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_API_URL!, {
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      const role = session?.user?.role; // 'player' | 'partner' | 'admin'
      if (role) {
        socket.emit('join_role_room', role);
        // Also join tier room for partners
        const tier = (session?.user as any)?.subscriptionPlan;
        if (role === 'partner' && tier) {
          socket.emit('join_tier_room', tier);
        }
      }
    });

    return () => { socket.disconnect(); };
  }, [session]);

  return (
    <SocketContext.Provider value={socketRef.current}>
      {children}
    </SocketContext.Provider>
  );
}
```

---

### 4. Frontend — NotificationProvider (`components/NotificationProvider.tsx`)

```typescript
'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSocket } from './SocketProvider';
import { toast } from '@/components/ui/use-toast'; // existing shadcn toast

export interface AppNotification {
  id: string; title: string; body: string;
  sentAt: string; read: boolean;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);
export const useNotifications = () => useContext(NotificationContext)!;

const STORAGE_KEY = 'app_notifications';
const MAX_STORED = 50;

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const socket = useSocket();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Restore from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setNotifications(JSON.parse(stored));
  }, []);

  // Persist to localStorage on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, MAX_STORED)));
  }, [notifications]);

  // Listen for incoming socket events
  useEffect(() => {
    if (!socket) return;
    const handler = (data: Omit<AppNotification, 'read'>) => {
      const newNotif: AppNotification = { ...data, read: false };
      setNotifications(prev => [newNotif, ...prev].slice(0, MAX_STORED));
      toast({ title: data.title, description: data.body });
    };
    socket.on('admin_notification', handler);
    return () => { socket.off('admin_notification', handler); };
  }, [socket]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);
  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);
  const clearAll = useCallback(() => setNotifications([]), []);
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllRead, clearAll }}>
      {children}
    </NotificationContext.Provider>
  );
}
```

---

### 5. Platform Settings — Type Parsing

Settings stored as strings in DB. Parse on read:
```typescript
function parseSettingValue(value: string, type: string): boolean | number | string {
  if (type === 'boolean') return value === 'true';
  if (type === 'number') return parseFloat(value);
  return value;
}
```

---

### 6. SubscriptionPlanConfig — Replacing Hardcoded Values

The existing `AdminPartnerSubscriptionTab.tsx` has a hardcoded `priceMap`:
```typescript
// BEFORE (hardcoded — remove this):
const priceMap: Record<string, number> = {
  'FREE': 0, 'PRO': 29.99, 'ENTERPRISE': 99.99
}
```

After migration, the backend should read from `SubscriptionPlanConfig`:
```typescript
// In subscription update controller:
const planConfig = await prisma.subscriptionPlanConfig.findUnique({
  where: { plan: selectedPlan }
});
// Use planConfig.monthlyPrice, planConfig.maxLobbies, etc.
```

---

### 7. SettingsTab Sub-tabs Structure

```tsx
// SettingsTab.tsx
<Tabs defaultValue="notifications">
  <TabsList>
    <TabsTrigger value="notifications"><Bell className="mr-2 h-4 w-4" /> Notifications</TabsTrigger>
    <TabsTrigger value="platform"><Settings className="mr-2 h-4 w-4" /> Platform</TabsTrigger>
    <TabsTrigger value="flags"><Flag className="mr-2 h-4 w-4" /> Feature Flags</TabsTrigger>
    <TabsTrigger value="maintenance"><AlertTriangle className="mr-2 h-4 w-4" /> Maintenance</TabsTrigger>
    <TabsTrigger value="plans"><Crown className="mr-2 h-4 w-4" /> Plans</TabsTrigger>
  </TabsList>
  <TabsContent value="notifications"><PushNotificationsSection /></TabsContent>
  <TabsContent value="platform"><PlatformSettingsSection /></TabsContent>
  <TabsContent value="flags"><FeatureFlagsSection /></TabsContent>
  <TabsContent value="maintenance"><MaintenanceModeSection /></TabsContent>
  <TabsContent value="plans"><SubscriptionPlanConfigSection /></TabsContent>
</Tabs>
```

---

## Integration Points

| Point | Detail |
|-------|--------|
| **Socket.io server** | `(global as any).io` in `app.ts` — emit directly; same pattern as `lobby_update` |
| **Socket rooms** | `role:player`, `role:partner`, `tier:PRO`, `tier:ENTERPRISE`, `role:all` |
| **Admin auth middleware** | Reuse existing `auth('admin')` middleware on all `/api/admin/*` routes |
| **Prisma** | Run `npx prisma migrate dev --name add-admin-settings` after adding new models |
| **Navbar** | Add `<NotificationBell />` to the existing navbar component for player/partner views |
| **App layout** | Wrap with `<SocketProvider><NotificationProvider>` in `app/layout.tsx` or a shared layout |

---

## Error Handling

| Scenario | Handling |
|----------|---------|
| Socket not connected when notification sent | Server-side emit still works — just no client receives it. Log emit in server. |
| Setting value invalid type | Return 400 with field-level error message |
| `SubscriptionPlanConfig` not found for plan | Return 500 — seed data should always have all 3 plans |
| Notification send with empty title/body | Validate in controller, return 400 before emit |

---

## Security Notes

- All admin routes protected by existing `auth('admin')` JWT middleware
- Feature flag and subscription plan routes: `auth('admin')` (not SUPER_ADMIN — per user update)
- Financial setting changes (`platform_fee_pct`, plan prices) require confirmation dialog in UI
- `updatedBy` field records admin's userId for full audit trail
- Socket `join_role_room` is unauthenticated by default — to harden, validate the JWT in the socket `connection` middleware before allowing room joins
