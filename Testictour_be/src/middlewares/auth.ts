import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import ApiError from '../utils/ApiError';

interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

export default function auth(...requiredRoles: string[]) {
  return function (req: Request, _res: Response, next: NextFunction) {
    const token = req.cookies?.authToken;
    
    if (!token) {
      return next(new ApiError(401, 'Missing authorization token'));
    }

    // Đảm bảo JWT_SECRET tồn tại
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET is not set in environment variables');
      return next(new ApiError(500, 'Server configuration error'));
    }

    try {
      const payload = jwt.verify(token, jwtSecret) as JwtPayload;
      
      // Normalize the role from the JWT payload
      const userRole = payload.role.trim().replace(/^"|"$/g, '');
      (req as any).user = { ...payload, role: userRole };

      // Normalize the required roles by removing all quotes and trimming whitespace
      const normalizedRequiredRoles = requiredRoles.map(role => role.replace(/['"]/g, '').trim());

      // Check if the user's role is included in the requiredRoles
      if (normalizedRequiredRoles.length > 0 && !normalizedRequiredRoles.includes(userRole)) {
        return next(new ApiError(403, 'Forbidden'));
      }
      next();
    } catch (err) {
      console.error('JWT verification failed:', err);
      next(new ApiError(401, 'Invalid token'));
    }
  };
} 