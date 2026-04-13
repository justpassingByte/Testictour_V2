---
phase: requirements
title: Requirements & Problem Understanding
description: Clarify the problem space, gather requirements, and define success criteria for password reset and infrastructure setup
---

# Requirements & Problem Understanding

## Problem Statement
**What problem are we solving?**
- Currently, there is no password reset support for `player` and `partner` users, creating friction for users who lose their access.
- Additionally, the project lacks a robust production-ready email and deployment infrastructure. 
- We need to integrate an email service, configure domains, secure traffic via Cloudflare and Nginx, and ensure the deployment configuration is fully production-aligned.

## Goals & Objectives
**What do we want to achieve?**
- **Authentication:** Implement a secure password reset flow (request email, verify token/OTP, change password) for both Player and Partner roles.
- **Email Infrastructure:** Integrate `Resend` as the transactional email provider for delivering password reset emails securely and reliably.
- **Domain & Deployment Infrastructure:**
  - Configure Domain DNS and proxy settings via Cloudflare.
  - Update `nginx-vps.conf` to handle production traffic and SSL.
  - Update `docker-compose.yml` to support the new environment variables and deployment structure.

**Non-goals**
- SMS-based password reset authentication.
- Migrating to a different VPS provider (staying with the current Docker + Nginx stack).

## User Stories & Use Cases
**How will users interact with the solution?**
- As a player/partner, I want to click "Forgot Password" to receive a password reset link to my registered email inbox.
- As a backend system, I want to securely dispatch emails using the `Resend` API so that messages do not land in spam folders.
- As an administrator, I want HTTP traffic to be properly proxied and secured via Cloudflare and our Nginx reverse proxy so that user data is protected in transit.

## Success Criteria
**How will we know when we're done?**
- Players and Partners can successfully reset their passwords.
- `Resend` API is successfully integrated and tested for sending emails.
- Cloudflare DNS is correctly mapped to the VPS IP, with SSL enabled (Flexible or Full).
- `nginx-vps.conf` properly proxies incoming port 80/443 requests to the internal Docker containers.
- `docker-compose.yml` handles new environment variables (`RESEND_API_KEY`, etc.).

## Constraints & Assumptions
**What limitations do we need to work within?**
- Must use Cloudflare for DNS/SSL.
- Must use Resend for emails.
- Must integrate within the existing Docker Compose and Nginx architecture.

## Questions & Decisions
**Decisions made during requirements gathering:**
- **Post-Reset Flow**: Sau khi đổi mật khẩu thành công, người dùng sẽ được điều hướng về trang Login để tự đăng nhập lại (không đăng nhập tự động).
- **SSL / HTTPS**: Sử dụng cấu hình Cloudflare **Flexible SSL**. Cloudflare sẽ lo phần mã hoá (HTTPS) cho kết nối từ người dùng, và đẩy traffic về Server của chúng ta qua Nginx ở cổng 80 (HTTP). Điều này tiết kiệm thời gian cài đặt chứng chỉ SSL let's encrypt trên VPS của mình.
