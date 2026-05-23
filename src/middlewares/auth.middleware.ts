import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = req.header('X-Device-API-Key');
  const expectedApiKey = process.env.API_KEY || 'test-api-key';

  if (!apiKey || apiKey !== expectedApiKey) {
    logger.warn(`Unauthorized access attempt from IP: ${req.ip}. Provided key: ${apiKey}`);
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or missing API key in X-Device-API-Key header.'
    });
    return;
  }

  next();
};
