import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import UserService from '../services/UserService';

const registerSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  gameName: z.string().optional(),
  tagName: z.string().optional(),
  referrer: z.string().optional()
});

const loginSchema = z.object({
  login: z.string(),
  password: z.string(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
  locale: z.string().max(5).optional(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8),
});

const isProduction = process.env.NODE_ENV === 'production';
// Detect if actually running behind HTTPS (check FRONTEND_URL for https://)
const isHttps = (process.env.FRONTEND_URL || '').startsWith('https://');

const cookieOptions = {
  httpOnly: true,
  secure: isHttps,                                    // Only true when actually using HTTPS
  maxAge: 7 * 24 * 60 * 60 * 1000,                   // 7 days
  sameSite: (isHttps ? 'none' : 'lax') as 'none' | 'lax',  // 'none' requires secure=true (HTTPS)
  path: '/',
};

export default {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const data = registerSchema.parse(req.body);
      const { user, token } = await UserService.register(data);
      res.cookie('authToken', token, cookieOptions);
      res.json({ user });
    } catch (err) {
      next(err);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { login, password } = loginSchema.parse(req.body);
      const { user, token } = await UserService.login({ login, password });
      res.cookie('authToken', token, cookieOptions);
      res.json({ user });
    } catch (err) {
      next(err);
    }
  },

  async me(req: Request, res: Response) {
    const jwtUser = (req as any).user;
    if (!jwtUser) {
      return res.status(401).json({ user: null });
    }

    const { prisma } = require('../services/prisma');
    const dbUser = await prisma.user.findUnique({
      where: { id: jwtUser.id },
      select: { 
        id: true, 
        username: true, 
        email: true, 
        role: true, 
        isActive: true,
        riotGameName: true,
        riotGameTag: true,
        puuid: true,
        region: true,
        discordId: true
      }
    });

    if (!dbUser || !dbUser.isActive) {
      res.cookie('authToken', '', { ...cookieOptions, expires: new Date(0), maxAge: undefined });
      return res.status(401).json({ user: null });
    }

    res.json({ user: dbUser });
  },

  async logout(req: Request, res: Response) {
    res.cookie('authToken', '', { ...cookieOptions, expires: new Date(0), maxAge: undefined });
    res.status(200).json({ message: 'Logged out successfully' });
  },

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, locale } = forgotPasswordSchema.parse(req.body);
      // Always returns 200 regardless of whether the email exists (prevents enumeration)
      await UserService.requestPasswordReset(email, locale);
      res.status(200).json({
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    } catch (err) {
      next(err);
    }
  },

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, newPassword } = resetPasswordSchema.parse(req.body);
      await UserService.resetPassword(token, newPassword);
      res.status(200).json({
        message: 'Password has been reset successfully. Please log in with your new password.',
      });
    } catch (err) {
      next(err);
    }
  }
}; 