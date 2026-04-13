---
phase: testing
title: Testing Strategy
description: Define testing approach, test cases, and quality assurance
---

# Testing Strategy

## Infrastructure Validation
- [ ] **DNS Testing:** Verify Cloudflare proxies traffic correctly by pinging `testictour.com` and receiving Cloudflare IPs.
- [ ] **Nginx Testing:** Run `sudo nginx -t` and verify configuration loads properly and forwards to Port 4000/3000 correctly.
- [ ] **Docker Testing:** Verify `docker-compose up -d` passes the new `RESEND_API_KEY` successfully using `docker exec -it testictour-backend env | grep RESEND`.

## Integration Tests
- [ ] **Email Delivery Delivery:** 
  - Trigger a Forgot Password request and verify within the Resend dashboard that the email was strictly accepted and dispatched without bounce.
- [ ] **API Security:** 
  - Ensure the `/api/auth/forgot-password` endpoint masks failures by always returning "Email sent if exists".
  - Attempt to reset with expired token.

## End-to-End Tests
- [ ] **End-User Flow:** User goes to `https://testictour.com/login`, clicks "Forgot Password", opens their real inbox, receives email, clicks URL with query parameters, enters a new password, and regains access.

## Manual Testing
- [ ] SSL Handshake verification via browser (Lock icon).
- [ ] Check Nginx access logs to ensure the actual origin client IPs are logged instead of Cloudflare IPs, verifying `set_real_ip_from` blocks.
