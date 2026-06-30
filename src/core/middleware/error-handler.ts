import type { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger.js';
import { AppError } from '../errors/custom-errors.js';

export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error('Error occurred', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Handle known application errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
    });
  }

  // Handle Joi validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      details: err.message,
    });
  }

  // Handle Firebase errors
  if (err.name?.startsWith('Firebase')) {
    return res.status(500).json({
      success: false,
      message: 'Service unavailable',
    });
  }

  // Default error
  return res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
};
