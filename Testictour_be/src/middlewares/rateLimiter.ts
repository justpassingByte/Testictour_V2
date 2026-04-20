import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/* ------------------------------------------------------------------ */
/*  LOGIN RATE LIMITER                                                 */
/*  Dual-key strategy: limits by IP AND by login identifier            */
/*  Prevents both distributed brute-force and targeted account attacks */
/* ------------------------------------------------------------------ */

/**
 * Per-IP login limiter: 10 attempts per 15 minutes.
 * Catches broad brute-force from a single IP.
 */
export const loginLimiterByIp = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // only count failed logins (non-2xx)
  handler: (_req: Request, res: Response) => {
    const retryAfter = Math.ceil(res.getHeader('Retry-After') as number) || 900;
    res.status(429).json({
      message: 'Too many login attempts from this IP. Please try again later.',
      retryAfter,
      code: 'LOGIN_RATE_LIMITED',
    });
  },
});

/**
 * Per-account login limiter: 5 attempts per 15 minutes per login identifier.
 * Prevents targeted brute-force on a single account.
 */
export const loginLimiterByAccount = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  keyGenerator: (req: Request) => {
    const login = req.body?.login;
    return login ? `account:${String(login).toLowerCase().trim()}` : req.ip || 'unknown';
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (_req: Request, res: Response) => {
    const retryAfter = Math.ceil(res.getHeader('Retry-After') as number) || 900;
    res.status(429).json({
      message: 'This account has been temporarily locked due to too many failed login attempts. Please try again later.',
      retryAfter,
      code: 'ACCOUNT_RATE_LIMITED',
    });
  },
});

/* ------------------------------------------------------------------ */
/*  REGISTER RATE LIMITER                                              */
/*  3 registrations per IP per hour to prevent mass account creation   */
/* ------------------------------------------------------------------ */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      message: 'Too many accounts created from this IP. Please try again later.',
      code: 'REGISTER_RATE_LIMITED',
    });
  },
});

/* ------------------------------------------------------------------ */
/*  FORGOT / RESET PASSWORD RATE LIMITERS (existing)                   */
/* ------------------------------------------------------------------ */

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
