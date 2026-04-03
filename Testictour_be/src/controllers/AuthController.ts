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

const isProduction = process.env.NODE_ENV === 'production';

const productionCookieOptions = {
  httpOnly: true,
  secure: true,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  sameSite: 'none' as const,
  path: '/', // Accessible across the entire domain
};

const developmentCookieOptions = {
  httpOnly: true,
  secure: false, // Set to false for development (HTTP)
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  // sameSite omitted for development to allow cross-origin HTTP cookies
  path: '/', // Accessible across the entire domain
};

const cookieOptions = isProduction ? productionCookieOptions : developmentCookieOptions;

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
      console.log("[AuthController] Sending login response, user data:", user);
      res.json({ user });
    } catch (err) {
      next(err);
    }
  },

  async me(req: Request, res: Response) {
    res.json({ user: (req as any).user });
  },

  async logout(req: Request, res: Response) {
    res.cookie('authToken', '', { ...cookieOptions, expires: new Date(0), maxAge: undefined });
    res.status(200).json({ message: 'Logged out successfully' });
  }
}; 