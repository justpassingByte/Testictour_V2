import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

/**
 * Middleware to attach user information to the request if a valid JWT is present.
 * This does not protect the route; it only makes user info available if logged in.
 */
export default function attachUser(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.authToken;

  if (!token) {
    return next(); // No token, proceed without a user attached.
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('JWT_SECRET is not set. Cannot authenticate users.');
    return next(); // Server configuration error, but we proceed without user.
  }

  try {
    const payload = jwt.verify(token, jwtSecret) as JwtPayload;
    req.user = payload; // Attach user payload to the request object
  } catch (err) {
    // Token is invalid or expired.
    // We don't throw an error, just proceed without a user.
    console.warn('Invalid JWT token received, proceeding as guest.');
  }

  next();
} 