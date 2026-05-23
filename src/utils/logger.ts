import dotenv from 'dotenv';
dotenv.config();

const getTimestamp = () => new Date().toISOString();

export const logger = {
  info: (message: string) => {
    console.log(`[${getTimestamp()}] [INFO] ${message}`);
  },
  warn: (message: string) => {
    console.warn(`[${getTimestamp()}] [WARN] ${message}`);
  },
  error: (message: string, error?: any) => {
    console.error(`[${getTimestamp()}] [ERROR] ${message}`, error || '');
  }
};
