---
phase: requirements
feature: password-reset-and-infrastructure
title: Password Reset & Email/Deployment Infrastructure
description: Secure password reset via email token link (Resend), Cloudflare DNS/SSL, Nginx reverse proxy, and Docker Compose production alignment
---

# Requirements & Problem Understanding

## Problem Statement
**What problem are we solving?**

- Currently, there is no password reset support for `player` and `partner` users, creating friction for users who lose access to their accounts.
- The `User` model in `schema.prisma` has no fields for reset tokens, token expiry, or password-change tracking — the feature requires schema additions.
- The project lacks a production-ready email infrastructure. No transactional email provider is integrated, so the platform cannot send any automated emails (password reset, notifications, etc.).
- Deployment infrastructure (Cloudflare DNS, Nginx reverse proxy, Docker Compose env vars) needs to be finalized for production readiness.

**Affected users:**
- Players and Partners who forget their passwords and cannot recover their accounts.
- Admins who need confidence that the deployment is production-grade and traffic is secured.

**Current workaround:** None — users who forget their password must contact support manually. There is no self-service recovery path.

---

## Goals & Objectives

### Primary Goals
- **Password Reset Flow:** Implement a secure, self-service password reset flow for Player and Partner roles:
  1. User clicks "Forgot Password" on the login page
  2. User enters their registered email
  3. Backend generates a secure, time-limited token and sends an email via Resend containing a **button/link** to reset the password
  4. User clicks the link → arrives at a "Set New Password" page with the token pre-loaded
  5. User submits a new password → backend validates token, updates password, invalidates existing sessions
  6. User is redirected to the Login page to sign in with the new password
- **Email Infrastructure:** Integrate **Resend** as the transactional email provider with verified sending domain (DNS TXT/DKIM records via Cloudflare).
- **Deployment Infrastructure:**
  - Configure Cloudflare DNS to point domain(s) to the VPS IP with Flexible SSL.
  - Prepare `nginx-vps.conf` for production use (reverse proxy for frontend + backend + API subdomains).
  - Update `docker-compose.yml` to include `RESEND_API_KEY` and any other new environment variables.

### Secondary Goals
- Build a reusable `EmailService` (using Resend SDK) that can be extended later for other transactional emails (welcome, tournament notifications, receipts).
- Support bilingual email templates (English + Vietnamese) matching the app's `[locale]` routing.
- Log password reset events (requested, completed, expired, failed) for admin audit visibility.

### Non-Goals
- ❌ SMS-based or OTP-based password reset — we use email token links only.
- ❌ Migrating to a different VPS provider (staying with Docker + Nginx stack).
- ❌ Admin password reset via this flow (admins use a separate internal process).
- ❌ OAuth/social login password reset (not applicable — platform uses email+password auth).
- ❌ Full Nginx production deployment in this phase — Nginx config will be prepared but not switched from the current Docker-direct port mapping until production cutover.

---

## User Stories & Use Cases

### Password Reset — User Side
- **As a player/partner**, I want to click "Forgot Password" on the login page so that I can start the recovery process.
- **As a player/partner**, I want to enter my email and receive a password reset email with a clear **"Reset Password" button** so that I can easily navigate to the reset form.
- **As a player/partner**, I want to see a confirmation message ("Check your email") after submitting, regardless of whether the email exists in the system, so that attackers cannot enumerate valid emails.
- **As a player/partner**, I want to click the reset link, land on a "Set New Password" page, enter and confirm my new password, and see a success message before being redirected to Login.
- **As a player/partner**, I want to see a clear error if my reset link has expired or was already used, with an option to request a new one.

### Password Reset — System Side
- **As the backend**, I want to generate a cryptographically secure token (e.g., `crypto.randomBytes(32).toString('hex')`) with a 30-minute expiry so that reset links are time-limited and secure.
- **As the backend**, I want to rate-limit the forgot-password endpoint (max **3 requests per email per hour**) so that the endpoint cannot be abused for email bombing.
- **As the backend**, I want to invalidate the reset token after successful use (single-use) so that the same link cannot be reused.
- **As the backend**, I want to hash the reset token before storing it in the database so that a database leak does not expose valid reset links.
- **As the backend**, I want to dispatch the reset email via the Resend API with proper sender domain authentication so that emails do not land in spam.

### Infrastructure — Admin/Ops Side
- **As an admin**, I want Cloudflare DNS correctly configured so that the domain resolves to our VPS with SSL termination at the Cloudflare edge.
- **As an admin**, I want `nginx-vps.conf` prepared for production so that when we switch from Docker-direct port mapping, the reverse proxy is ready.
- **As an admin**, I want `docker-compose.yml` to include all necessary env vars (`RESEND_API_KEY`, `FRONTEND_URL` for reset link generation) so that deployment is a single `docker-compose up`.

### Edge Cases
- **Expired token:** User clicks a link after 30 minutes → show "This link has expired" with a "Request New Link" button.
- **Already-used token:** User clicks the same link again after resetting → show "This link has already been used."
- **Non-existent email:** User enters an email not in the database → still show "Check your email" (no information leakage), but don't send an email.
- **Multiple requests:** User requests reset 3 times → only the latest token is valid, previous tokens are invalidated.
- **Different device/browser:** User requests on desktop, clicks link on mobile → must work (token is in the URL, not tied to a session).
- **Password same as current:** Allow it — we don't enforce password-history checks.

---

## Success Criteria
**How will we know when we're done?**

- [ ] Players and Partners can successfully reset their passwords end-to-end (request → email → click link → new password → login).
- [ ] Reset email is delivered within **10 seconds** of request submission.
- [ ] Reset token expires after **30 minutes** and is single-use.
- [ ] Rate limiting prevents more than 3 reset requests per email per hour.
- [ ] Resend API is integrated with a verified sending domain (DKIM + SPF records via Cloudflare).
- [ ] Email renders correctly in major clients (Gmail, Outlook) with the "Reset Password" button clearly visible.
- [ ] Email supports both English and Vietnamese based on the user's locale (or defaults to English).
- [ ] Existing user sessions (JWTs) are not auto-invalidated on password reset (user simply logs in again with new password from the Login page).
- [ ] Cloudflare DNS is correctly mapped to the VPS IP with Flexible SSL enabled.
- [ ] `nginx-vps.conf` is updated and validated (ready for production cutover, but not activated yet — current setup uses Docker direct port mapping on port 80).
- [ ] `docker-compose.yml` includes `RESEND_API_KEY` environment variable for the backend service.
- [ ] `User` model in `schema.prisma` includes `resetToken`, `resetTokenExpiry` fields.

---

## Constraints & Assumptions

### Technical Constraints
- Must use **Resend** as the email provider (already decided by the team).
- Must use **Cloudflare** for DNS management and SSL termination.
- Must integrate within the existing **Docker Compose + Nginx** architecture.
- The `User` model (`schema.prisma`) currently has no `resetToken` or `resetTokenExpiry` fields — a Prisma migration is required.
- Resend requires **domain verification** (DNS TXT + DKIM records) before emails can be sent from a custom domain. These records must be added via Cloudflare DNS.
- The reset link URL must include the frontend's base URL (`FRONTEND_URL` env var) — this differs between local dev (`localhost:3000`) and production (`testictour.com`).
- The frontend uses Next.js `[locale]` routing — the reset page must be at `/{locale}/reset-password?token=...`.

### Business Constraints
- Only `player` and `partner` roles are supported for self-service password reset. Admin accounts are excluded.
- No password complexity rules beyond a minimum length of **8 characters** (matching existing registration).
- Password history checks are not required (users can reuse old passwords).

### Assumptions
- The sending domain (e.g., `noreply@testictour.com`) will be verified on Resend before this feature ships.
- Port 80 is currently mapped directly from Docker (`80:3000` in `docker-compose.yml`) without Nginx. This is intentional for now — Nginx will be activated during the production cutover phase. There is **no port conflict** to resolve in this phase.
- Cloudflare Flexible SSL is acceptable: HTTPS between user ↔ Cloudflare, HTTP between Cloudflare ↔ origin. The team accepts that reset tokens travel in plaintext on the Cloudflare → VPS leg. This is mitigated by Cloudflare's trusted internal network, and can be upgraded to Full SSL later.
- JWT tokens are **not invalidated** on password reset. The user is redirected to Login to obtain a new JWT. Old JWTs will naturally expire.

---

## Questions & Decisions

### Decisions Made ✅
- **Reset Mechanism**: Gửi email qua Resend chứa **button link** (URL-based token). User click button → đến trang "Set New Password". Không dùng OTP.
- **Token Security**: Token được hash (SHA-256) trước khi lưu vào DB. Token gốc (plaintext) chỉ xuất hiện trong email link. Expiry: 30 phút, single-use.
- **Post-Reset Flow**: Sau khi đổi mật khẩu thành công, người dùng sẽ được điều hướng về trang Login để tự đăng nhập lại (không đăng nhập tự động).
- **SSL / HTTPS**: Sử dụng Cloudflare **Flexible SSL**. Cloudflare lo phần mã hoá (HTTPS) cho kết nối từ người dùng, và đẩy traffic về Server qua Nginx ở cổng 80 (HTTP).
- **Port 80 Strategy**: Hiện tại Docker map trực tiếp `80:3000` (chưa dùng Nginx). Nginx config được chuẩn bị sẵn nhưng chưa activate cho đến khi chuyển production.
- **Rate Limiting**: Tối đa 3 request/email/giờ để chống email bombing.
- **Email Enumeration Prevention**: Luôn trả về "Check your email" bất kể email có tồn tại hay không.
- **Admin Exclusion**: Admin không dùng flow này — dùng quy trình nội bộ riêng.

### Open Questions ❓
- [ ] **Email sender address**: Dùng `noreply@testictour.com` hay `support@testictour.com`?
- [ ] **Email template branding**: Có cần logo, brand colors trong email template không? Hay dùng plain text đơn giản?
- [ ] **Monitoring/alerting**: Có cần alert khi Resend API trả lỗi liên tiếp (email delivery failures)?
- [ ] **Future email use cases**: Có muốn reuse EmailService cho welcome email, tournament reminders trong tương lai gần không? (Ảnh hưởng đến cách thiết kế service).
