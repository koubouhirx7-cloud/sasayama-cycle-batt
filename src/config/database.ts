import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

export const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'stdout', level: 'error' },
    { emit: 'stdout', level: 'info' },
    { emit: 'stdout', level: 'warn' },
  ],
});

// クエリログの出力
prisma.$on('query' as any, (e: any) => {
  logger.info(`Query: ${e.query} - Params: ${e.params} - Duration: ${e.duration}ms`);
});
