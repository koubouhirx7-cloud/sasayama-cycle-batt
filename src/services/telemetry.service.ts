import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { TelemetryDto } from '../dtos/telemetry.dto';
import { logger } from '../utils/logger';

export class TelemetryService {
  constructor(
    private prisma: PrismaClient,
    private redis: Redis
  ) {}

  async processTelemetry(dto: TelemetryDto): Promise<void> {
    const { device_id, battery_soc, battery_voltage, current_lat, current_lng, status, timestamp } = dto;
    const parsedTimestamp = new Date(timestamp);

    // 1. バッテリー残量10%以下の場合に、ログに警告（[ALERT]）を出力するビジネスロジック
    if (battery_soc <= 10) {
      logger.warn(`[ALERT] Low battery warning for device ID: "${device_id}". Current SoC is ${battery_soc}%! (Voltage: ${battery_voltage}mV)`);
    }

    try {
      // 2. PostgreSQLへの永続化 (トランザクションで整合性を確保)
      await this.prisma.$transaction(async (tx) => {
        // 未登録の車両なら自動作成し、既存なら最新情報に上書き更新する
        await tx.vehicle.upsert({
          where: { deviceId: device_id },
          update: {
            batterySoc: battery_soc,
            batteryVoltage: battery_voltage,
            currentLat: current_lat,
            currentLng: current_lng,
            status: status as any,
            lastUpdated: parsedTimestamp,
          },
          create: {
            deviceId: device_id,
            batterySoc: battery_soc,
            batteryVoltage: battery_voltage,
            currentLat: current_lat,
            currentLng: current_lng,
            status: status as any,
            lastUpdated: parsedTimestamp,
          },
        });

        // 履歴ログの挿入
        await tx.telemetryLog.create({
          data: {
            deviceId: device_id,
            batterySoc: battery_soc,
            batteryVoltage: battery_voltage,
            currentLat: current_lat,
            currentLng: current_lng,
            status: status as any,
            timestamp: parsedTimestamp,
          },
        });
      });
      logger.info(`Saved telemetry log to PostgreSQL for device: ${device_id}`);
    } catch (dbError) {
      logger.error(`Database transaction failed for device ${device_id}:`, dbError);
      throw dbError;
    }

    try {
      // 3. Redisへの高速キャッシュ書き込み
      const cacheKey = `vehicle:status:${device_id}`;
      
      // ハッシュマップ形式で保存
      await this.redis.hset(cacheKey, {
        device_id,
        battery_soc: battery_soc.toString(),
        battery_voltage: battery_voltage.toString(),
        current_lat: current_lat.toString(),
        current_lng: current_lng.toString(),
        status,
        timestamp,
      });

      // アクティブ車両のID一覧のセットに登録（これをもとに一瞬で全件引けるようになる）
      await this.redis.sadd('vehicles:active', device_id);
      
      logger.info(`Synced real-time status to Redis cache for device: ${device_id}`);
    } catch (redisError) {
      // キャッシュ更新のエラーはログ出力にとどめ、本番運用に支障を出さないようにフォールバック設計にする
      logger.error(`Failed to update Redis cache for device ${device_id}:`, redisError);
    }
  }
}
