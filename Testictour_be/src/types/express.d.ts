// This file extends the Express Request interface to include a user property.

interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

declare namespace Express {
  export interface Request {
    user?: JwtPayload;
  }
} 