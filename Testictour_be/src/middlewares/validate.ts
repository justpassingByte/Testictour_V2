import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import ApiError from '../utils/ApiError';

export default function validate(schema: any) {
  return async function (req: Request, _res: Response, next: NextFunction) {
    try {
      await schema.parseAsync(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(new ApiError(400, err.errors.map(e => e.message).join(', ')));
      }
      next(err);
    }
  };
} 