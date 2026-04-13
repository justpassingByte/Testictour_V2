---
phase: planning
title: Project Planning & Task Breakdown
description: Break down work into actionable tasks and estimate timeline
---

# Project Planning & Task Breakdown

## Milestones
- [ ] Milestone 1: Infrastructure Preparation (Cloudflare, Nginx, Docker)
- [ ] Milestone 2: Backend Authentication & Resend Integration
- [ ] Milestone 3: Frontend User Interface implementation
- [ ] Milestone 4: End-to-End System Testing in Production Environment

## Task Breakdown

### Phase 1: Infrastructure & Environment Setup
- [ ] Task 1.1: Configure Cloudflare DNS records for `testictour.com` and `api.testictour.com` to point to the VPS IP. Setup domain verification records for Resend.
- [ ] Task 1.2: Obtain `RESEND_API_KEY` and verify sending email domain.
- [ ] Task 1.3: Update `docker-compose.yml` to include Resend variables in the backend service.
- [ ] Task 1.4: Update `nginx-vps.conf` to configure Cloudflare IP resolution (`set_real_ip_from`) and support **Flexible SSL** (routing HTTPS on Cloudflare to HTTP on Nginx via `X-Forwarded-Proto`).

### Phase 2: Core Features (Backend)
- [ ] Task 2.1: Add `resetPasswordToken String?` and `resetPasswordExpires DateTime?` to the `User` model in `schema.prisma`. Chạy lệnh `npx prisma db push` và `npx prisma generate` để cập nhật Database.
- [ ] Task 2.2: Install the `resend` npm package.
- [ ] Task 2.3: Implement `MailService` using `Resend` to dispatch beautifully formatted HTML emails for password reset tokens.
- [ ] Task 2.4: Implement `POST /api/auth/forgot-password` and `POST /api/auth/reset-password`.

### Phase 3: Core Features (Frontend)
- [ ] Task 3.1: Create the `ForgotPassword` page component.
- [ ] Task 3.2: Create the `ResetPassword` page component to handle tokens from URL parameters.
- [ ] Task 3.3: Link authentication flows dynamically.

### Phase 4: Integration & Polish
- [ ] Task 4.1: Deploy updated Nginx and Docker configurations to VPS.
- [ ] Task 4.2: Add rate limiting to backend auth endpoints.

## Dependencies
- Cloudflare access and domain registrar access are needed to complete DNS and Resend verification.
- Environment configurations must be synced.
