import { Request, Response, NextFunction } from 'express';
import ApiError from '../utils/ApiError';

export default function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err instanceof Error) {
    // For generic Error objects, use their message
    message = err.message;
  } else {
    // Fallback for non-Error objects
    message = 'Internal Server Error';
  }

  // Log the full error object for debugging, but suppress 401 Missing auth tokens to avoid terminal spam
  if (statusCode !== 401) {
    console.error('Full Error Object in errorHandler:', err);
  }

  res.status(statusCode).json({
    message: message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : null,
  });
} 