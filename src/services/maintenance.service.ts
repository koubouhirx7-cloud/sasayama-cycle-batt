import { PrismaClient } from '@prisma/client';
import { CreateMaintenanceDto } from '../dtos/maintenance.dto';
import { logger } from '../utils/logger';

export class MaintenanceService {
  constructor(private prisma: PrismaClient) {}

  // 1. 新しいメンテナンス履歴を登録する
  async addMaintenanceLog(deviceId: string, dto: CreateMaintenanceDto) {
    const { type, description } = dto;

    // 車両の存在チェック
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { deviceId }
    });

    if (!vehicle) {
      // 安全策として、もし車両が存在しない場合は仮の状態で自動作成する（利便性のため）
      logger.info(`Vehicle "${deviceId}" not found. Creating temporary vehicle master for maintenance log.`);
      await this.prisma.vehicle.create({
        data: {
          deviceId,
          batterySoc: 0,
          batteryVoltage: 0,
          currentLat: 0.0,
          currentLng: 0.0,
          status: 'error' // メンテナンス中を想定して初期ステータスをerrorに
        }
      });
    }

    try {
      // メンテナンス履歴をDBに挿入
      const log = await this.prisma.maintenanceLog.create({
        data: {
          deviceId,
          type: type as any,
          description: description || ''
        }
      });

      logger.info(`Successfully added maintenance log for device: ${deviceId} (Type: ${type})`);
      return {
        id: log.id,
        device_id: log.deviceId,
        type: log.type,
        description: log.description,
        performed_at: log.performedAt.toISOString()
      };
    } catch (error) {
      logger.error(`Failed to add maintenance log for device ${deviceId}:`, error);
      throw error;
    }
  }

  // 2. 過去のメンテナンス履歴を取得する
  async getMaintenanceLogs(deviceId: string) {
    try {
      const logs = await this.prisma.maintenanceLog.findMany({
        where: { deviceId },
        orderBy: { performedAt: 'desc' }
      });

      return logs.map(log => ({
        id: log.id,
        device_id: log.deviceId,
        type: log.type,
        description: log.description,
        performed_at: log.performedAt.toISOString()
      }));
    } catch (error) {
      logger.error(`Failed to retrieve maintenance logs for device ${deviceId}:`, error);
      throw error;
    }
  }
}
