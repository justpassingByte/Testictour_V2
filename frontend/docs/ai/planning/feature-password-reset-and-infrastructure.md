---
phase: planning
feature: password-reset-and-infrastructure
title: Password Reset & Infrastructure — Task Breakdown
description: Actionable task breakdown aligned with the updated design doc, ordered by dependency.
---

# Project Planning & Task Breakdown

## Milestones
- [x] **M1:** Backend foundation (schema, dependencies, EmailService)
- [x] **M2:** Backend password reset API (forgot-password + reset-password endpoints)
- [x] **M3:** Frontend pages (forgot-password + reset-password + login link)
- [ ] **M4:** Infrastructure & deployment (Cloudflare DNS, Resend domain verification, docker-compose env vars)
- [ ] **M5:** Integration testing & polish

---

## Task Breakdown

### Phase 1: Backend Foundation
> Dependencies: None. Can start immediately.

- [x] **Task 1.1 — Prisma schema migration** ✅
  - Add `resetToken String?` and `resetTokenExpiry DateTime?` to the `User` model in `schema.prisma`.
  - Run `npx prisma db push` and `npx prisma generate`.
  - **Files:** `prisma/schema.prisma`

- [x] **Task 1.2 — Install dependencies** ✅
  - `npm install resend express-rate-limit`
  - `npm install -D @types/express-rate-limit` (if needed)
  - **Files:** `package.json`

- [x] **Task 1.3 — Create EmailService** ✅
  - New file: `src/services/EmailService.ts`
  - Initialize Resend client with `RESEND_API_KEY` env var.
  - Implement `sendPasswordReset({ to, username, token, locale })` method.
  - HTML email template with "Reset Password" button linking to `FRONTEND_URL/{locale}/reset-password?token={token}`.
  - Bilingual support: EN (default) and VI based on `locale` parameter.
  - Error handling: log failures but don't throw (endpoint must always return 200).
  - **Files:** `src/services/EmailService.ts`

- [x] **Task 1.4 — Create rate limit middleware** ✅
  - New file: `src/middlewares/rateLimiter.ts`
  - Export `forgotPasswordLimiter`: 3 requests per email per hour (keyed on `req.body.email`).
  - Export `resetPasswordLimiter`: 5 requests per IP per 15 minutes.
  - **Files:** `src/middlewares/rateLimiter.ts`

### Phase 2: Backend Password Reset API
> Dependencies: Phase 1 complete.

- [x] **Task 2.1 — Add UserService methods** ✅
  - `requestPasswordReset(email: string)`: find user by email (exclude admins), generate token via `crypto.randomBytes(32)`, SHA-256 hash it, store hash + expiry (30 min), call `EmailService.sendPasswordReset()`.
  - `resetPassword(token: string, newPassword: string)`: SHA-256 hash submitted token, find user by matching hash + valid expiry, bcrypt hash new password, update user, clear reset fields.
  - **Files:** `src/services/UserService.ts`

- [x] **Task 2.2 — Add AuthController handlers** ✅
  - `forgotPassword(req, res, next)`: Zod validation (`email: z.string().email()`), call `UserService.requestPasswordReset()`, always return 200 with generic message.
  - `resetPassword(req, res, next)`: Zod validation (`token: z.string().min(1)`, `newPassword: z.string().min(8)`), call `UserService.resetPassword()`, return success or error.
  - **Files:** `src/controllers/AuthController.ts`

- [x] **Task 2.3 — Add auth routes** ✅
  - `POST /forgot-password` → `forgotPasswordLimiter` → `AuthController.forgotPassword`
  - `POST /reset-password` → `resetPasswordLimiter` → `AuthController.resetPassword`
  - Both public (no auth middleware).
  - **Files:** `src/routes/auth.routes.ts`

### Phase 3: Frontend Pages
> Dependencies: Phase 2 complete (API endpoints must exist for integration).

- [x] **Task 3.1 — Forgot Password page** ✅
  - New file: `app/[locale]/forgot-password/page.tsx`
  - Email input form with states: IDLE → SUBMITTING → SUCCESS → ERROR.
  - On success: show "Check your email" confirmation with email icon.
  - On rate limit (429): show friendly error.
  - Style to match existing auth pages.
  - **Files:** `app/[locale]/forgot-password/page.tsx`

- [x] **Task 3.2 — Reset Password page** ✅
  - New file: `app/[locale]/reset-password/page.tsx`
  - Read `?token=` from URL search params.
  - Form: new password + confirm password (min 8 chars, must match).
  - States: IDLE → SUBMITTING → SUCCESS (redirect to login after 3s) → TOKEN_INVALID/TOKEN_EXPIRED (show error + "Request New Link" button).
  - **Files:** `app/[locale]/reset-password/page.tsx`

- [x] **Task 3.3 — Add "Forgot Password?" link to login** ✅
  - Updated `components/auth/AuthModal.tsx` — replaced dead `#` link with `Link` to `/forgot-password` that closes modal.
  - **Files:** `components/auth/AuthModal.tsx`

- [x] **Task 3.4 — i18n translations** ✅
  - Added `forgotPassword` and `resetPassword` nested keys to `auth` object in both EN and VI.
  - **Files:** `locales/en/common.json`, `locales/vi/common.json`

### Phase 4: Infrastructure & Deployment
> Dependencies: Can run in parallel with Phase 2/3 (DNS/Resend setup is independent).

- [x] **Task 4.1 — Update docker-compose.yml** ✅
  - Added `RESEND_API_KEY` and `EMAIL_FROM_ADDRESS` to backend `environment` section.
  - **Files:** `docker-compose.yml`

- [ ] **Task 4.2 — Update .env**
  - Add `RESEND_API_KEY=re_xxxxx`
  - Add `EMAIL_FROM_ADDRESS=noreply@testictour.com`
  - **Files:** `.env`

- [ ] **Task 4.3 — Cloudflare DNS & Resend domain verification**
  - Add A record pointing to VPS IP.
  - Add DKIM/SPF TXT records from Resend dashboard.
  - Enable Flexible SSL on Cloudflare.
  - **Note:** This is a manual ops task, not code.

- [ ] **Task 4.4 — Nginx config (prep only)**
  - Verify `nginx-vps.conf` includes `X-Forwarded-Proto`, `X-Real-IP`, `X-Forwarded-For` headers.
  - No activation — stays dormant until production cutover.
  - **Files:** `nginx-vps.conf`

### Phase 5: Integration Testing & Polish
> Dependencies: All phases complete.

- [ ] **Task 5.1 — End-to-end testing**
  - Test full flow: forgot-password → email received → click link → set new password → login with new password.
  - Test edge cases: expired token, reused token, non-existent email, rate limiting.
  - Test email rendering in Gmail and Outlook.

- [ ] **Task 5.2 — Error handling review**
  - Verify Resend API failure handling (graceful degradation).
  - Verify rate limit responses are user-friendly.
  - Verify i18n works for both EN and VI.

---

## Dependencies
| Dependency | Required By | Status |
|---|---|---|
| Resend API key | Task 1.3 | ❓ Need to obtain from Resend dashboard |
| Cloudflare access | Task 4.3 | ❓ Need domain registrar + Cloudflare account |
| Resend domain verification | Task 5.1 | ❓ Blocked by Task 4.3 (DNS records) |
| Decision: email sender address | Task 1.3 | ❓ `noreply@` or `support@`? |

## Estimation
| Phase | Estimated Time |
|---|---|
| Phase 1: Backend Foundation | ~1 hour |
| Phase 2: Backend API | ~1 hour |
| Phase 3: Frontend Pages | ~2 hours |
| Phase 4: Infrastructure | ~1 hour (manual ops) |
| Phase 5: Testing | ~1 hour |
| **Total** | **~6 hours** |
