import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { prisma } from './config/database';
import { redis } from './config/redis';
import { authMiddleware } from './middlewares/auth.middleware';

// サービスのインポート
import { TelemetryService } from './services/telemetry.service';
import { VehicleService } from './services/vehicle.service';
import { MaintenanceService } from './services/maintenance.service';

// コントローラーのインポート
import { TelemetryController } from './controllers/telemetry.controller';
import { VehicleController } from './controllers/vehicle.controller';
import { MaintenanceController } from './controllers/maintenance.controller';

// 環境変数のロード
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// ミドルウェア設定
app.use(cors());
app.use(express.json());

// 依存性注入 (DI)
const telemetryService = new TelemetryService(prisma, redis);
const vehicleService = new VehicleService(prisma, redis);
const maintenanceService = new MaintenanceService(prisma);

const telemetryController = new TelemetryController(telemetryService);
const vehicleController = new VehicleController(vehicleService);
const maintenanceController = new MaintenanceController(maintenanceService);

// 🔍 動作確認用のヘルスチェック
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 1. 車載端末からのデータ受信エンドポイント (POST /api/v1/telemetry)
// APIキー認証 (authMiddleware) を適用
app.post('/api/v1/telemetry', authMiddleware, telemetryController.receiveTelemetry);

// 2. 管理者・アプリ用データ取得エンドポイント (GET /api/v1/vehicles)
app.get('/api/v1/vehicles', vehicleController.getVehicles);

// 3. メンテナンス履歴関連エンドポイント (日誌の追加 ＆ 取得)
app.post('/api/v1/vehicles/:deviceId/maintenance', maintenanceController.addLog);
app.get('/api/v1/vehicles/:deviceId/maintenance', maintenanceController.getLogs);


// サーバー起動
const server = app.listen(port, () => {
  logger.info(`API Server is running on http://localhost:${port}`);
  logger.info(`Press CTRL+C to stop.`);
});

// 優雅なシャットダウン (Graceful Shutdown) の設定
const gracefulShutdown = async () => {
  logger.info('Graceful shutdown initiated...');
  
  // サーバーの新規受付を停止
  server.close(async () => {
    logger.info('HTTP server closed.');
    
    try {
      // データベース接続の終了
      await prisma.$disconnect();
      logger.info('PostgreSQL connection disconnected safely.');
      
      // Redis接続の終了
      await redis.quit();
      logger.info('Redis connection disconnected safely.');
      
      process.exit(0);
    } catch (err) {
      logger.error('Error during database/redis disconnection:', err);
      process.exit(1);
    }
  });
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
