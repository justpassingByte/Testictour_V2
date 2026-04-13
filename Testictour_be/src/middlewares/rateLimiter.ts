import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * Rate limiter for POST /api/auth/forgot-password
 * 3 requests per email per hour.
 * Keyed on the email in the request body.
 */
export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  keyGenerator: (req: Request) => {
    // Key by email to prevent per-email abuse
    return req.body?.email ? String(req.body.email).toLowerCase() : 'unknown';
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many reset requests. Please try again later.',
  },
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many reset requests. Please try again later.',
    });
  },
});

/**
 * Rate limiter for POST /api/auth/reset-password
 * 5 requests per IP per 15 minutes.
 */
export const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many attempts. Please try again later.',
  },
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many attempts. Please try again later.',
    });
  },
});
