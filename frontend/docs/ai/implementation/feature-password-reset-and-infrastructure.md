---
phase: implementation
title: Implementation Guide
description: Technical implementation notes, patterns, and code guidelines
---

# Implementation Guide

## Infrastructure Notes

### Nginx Configuration (`nginx-vps.conf`)
- When sitting behind Cloudflare, ensure Nginx captures the real IP:
```nginx
set_real_ip_from 103.21.244.0/22;
set_real_ip_from 103.22.200.0/22;
set_real_ip_from 103.31.4.0/22;
# (Add other Cloudflare IP ranges)
real_ip_header CF-Connecting-IP;
```
- Ensure Proxy headers are set properly: `proxy_set_header X-Forwarded-Proto $scheme;`

### Docker Compose (`docker-compose.yml`)
- Update backend environment to include:
```yaml
      - RESEND_API_KEY=${RESEND_API_KEY}
      - SYSTEM_EMAIL_ADDRESS=noreply@testictour.com
      - CLOUDFLARE_PROXY_ENABLED=true
```

## Backend Implementation

### Mail Service (Resend)
- `npm install resend`
- Instantiate inside `src/services/MailService.ts`:
```typescript
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

export const sendResetPasswordEmail = async (email: string, token: string) => {
  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  
  await resend.emails.send({
    from: process.env.SYSTEM_EMAIL_ADDRESS,
    to: email,
    subject: 'TesTicTour - Password Reset',
    html: `<p>Click <a href="${resetLink}">here</a> to reset your password. This link expires in 15 minutes.</p>`
  });
};
```

### Authentication Logic
- Handle `token` securely using `crypto.randomBytes(32).toString('hex')`.
- Ensure tokens expire within a realistic timeframe.
