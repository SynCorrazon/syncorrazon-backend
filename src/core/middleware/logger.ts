import type { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger.js';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    const message = `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`;

    if (res.statusCode >= 400) {
      logger.warn(message, {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });
    } else {
      logger.info(message, {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration,
      });
    }
  });

  next();
};
