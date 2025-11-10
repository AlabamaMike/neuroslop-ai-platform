/**
 * Error Handling Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { APIError } from '../../signals/types.js';

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: Record<string, any>;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: Record<string, any>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    const apiError: APIError = {
      code: err.code,
      message: err.message,
      details: err.details,
      timestamp: new Date(),
    };

    return res.status(err.statusCode).json({
      success: false,
      error: apiError,
    });
  }

  // Unhandled errors
  console.error('Unhandled error:', err);

  const apiError: APIError = {
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
    timestamp: new Date(),
  };

  return res.status(500).json({
    success: false,
    error: apiError,
  });
};

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  throw new AppError(
    `Route ${req.method} ${req.path} not found`,
    404,
    'NOT_FOUND'
  );
};

export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
