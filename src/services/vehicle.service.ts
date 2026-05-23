import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { VehicleQueryDto } from '../dtos/vehicle-query.dto';
import { logger } from '../utils/logger';

export class VehicleService {
  constructor(
    private prisma: PrismaClient,
    private redis: Redis
  ) {}

  async getLatestVehicles(query: VehicleQueryDto) {
    const { battery_less_than } = query;

    // 1. Redisから超高速取得を試みる
    try {
      const activeDevices = await this.redis.smembers('vehicles:active');
      
      if (activeDevices.length > 0) {
        const pipeline = this.redis.pipeline();
        activeDevices.forEach(deviceId => {
          pipeline.hgetall(`vehicle:status:${deviceId}`);
        });
        
        const results = await pipeline.exec();
        
        if (results) {
          const vehicles = results
            .map(([err, data]) => {
              if (err || !data || Object.keys(data).length === 0) return null;
              
              const item = data as Record<string, string>;
              return {
                device_id: item.device_id,
                battery_soc: parseInt(item.battery_soc, 10),
                battery_voltage: parseInt(item.battery_voltage, 10),
                current_lat: parseFloat(item.current_lat),
                current_lng: parseFloat(item.current_lng),
                status: item.status,
                timestamp: item.timestamp
              };
            })
            .filter((v): v is NonNullable<typeof v> => v !== null);

          if (vehicles.length > 0) {
            logger.info(`Retrieved ${vehicles.length} active vehicles from Redis cache.`);
            
            // バッテリー残量の指定％以下によるフィルタリング
            if (battery_less_than !== undefined) {
              return vehicles.filter(v => v.battery_soc <= battery_less_than);
            }
            return vehicles;
          }
        }
      }
    } catch (error) {
      logger.error('Failed to retrieve vehicles from Redis cache, falling back to PostgreSQL:', error);
    }

    // 2. Redisにキャッシュがない、またはエラー発生時はPostgreSQLから取得
    logger.info('Falling back to PostgreSQL to retrieve latest vehicles state.');
    const whereClause: any = {};
    if (battery_less_than !== undefined) {
      whereClause.batterySoc = { lte: battery_less_than };
    }

    const vehiclesFromDb = await this.prisma.vehicle.findMany({
      where: whereClause,
      orderBy: { lastUpdated: 'desc' }
    });

    // 取得結果をレスポンス用オブジェクトに変換
    const result = vehiclesFromDb.map(v => ({
      device_id: v.deviceId,
      battery_soc: v.batterySoc,
      battery_voltage: v.batteryVoltage,
      current_lat: v.currentLat,
      current_lng: v.currentLng,
      status: v.status,
      timestamp: v.lastUpdated.toISOString()
    }));

    // Redisキャッシュを非同期でバックグラウンド再構築（画面応答をブロックしない）
    if (vehiclesFromDb.length > 0) {
      this.rebuildRedisCache(vehiclesFromDb).catch(err => {
        logger.error('Failed to rebuild Redis cache in background:', err);
      });
    }

    return result;
  }

  private async rebuildRedisCache(vehicles: any[]): Promise<void> {
    const pipeline = this.redis.pipeline();
    for (const v of vehicles) {
      const cacheKey = `vehicle:status:${v.deviceId}`;
      pipeline.hset(cacheKey, {
        device_id: v.deviceId,
        battery_soc: v.batterySoc.toString(),
        battery_voltage: v.batteryVoltage.toString(),
        current_lat: v.currentLat.toString(),
        current_lng: v.currentLng.toString(),
        status: v.status,
        timestamp: v.lastUpdated.toISOString()
      });
      pipeline.sadd('vehicles:active', v.deviceId);
    }
    await pipeline.exec();
    logger.info('Redis cache rebuilt successfully in background.');
  }
}
