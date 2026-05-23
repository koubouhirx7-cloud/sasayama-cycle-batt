import { Request, Response } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateMaintenanceDto } from '../dtos/maintenance.dto';
import { MaintenanceService } from '../services/maintenance.service';
import { logger } from '../utils/logger';

export class MaintenanceController {
  constructor(private maintenanceService: MaintenanceService) {}

  // 1. メンテナンス日誌の追加
  addLog = async (req: Request, res: Response): Promise<void> => {
    try {
      const { deviceId } = req.params;
      
      if (!deviceId) {
        res.status(400).json({ error: 'Bad Request', message: 'deviceId parameter is required' });
        return;
      }

      // 送信データをDTOインスタンスに変換
      const dto = plainToInstance(CreateMaintenanceDto, req.body);

      // バリデーション実行
      const errors = await validate(dto);
      if (errors.length > 0) {
        const errorMessages = errors.flatMap(err => 
          Object.values(err.constraints || {})
        );
        logger.warn(`Maintenance validation failed for ${deviceId}: ${JSON.stringify(errorMessages)}`);
        res.status(400).json({ error: 'Bad Request', messages: errorMessages });
        return;
      }

      // サービスの呼び出し
      const result = await this.maintenanceService.addMaintenanceLog(deviceId, dto);

      res.status(201).json(result);
    } catch (error: any) {
      logger.error('Error handling maintenance log registration:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message || 'An unexpected error occurred'
      });
    }
  };

  // 2. メンテナンス履歴の取得
  getLogs = async (req: Request, res: Response): Promise<void> => {
    try {
      const { deviceId } = req.params;

      if (!deviceId) {
        res.status(400).json({ error: 'Bad Request', message: 'deviceId parameter is required' });
        return;
      }

      const logs = await this.vehicleMaintenanceLogs(deviceId);
      res.status(200).json(logs);
    } catch (error: any) {
      logger.error('Error handling maintenance log retrieval:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message || 'An unexpected error occurred'
      });
    }
  };

  private async vehicleMaintenanceLogs(deviceId: string) {
    return await this.maintenanceService.getMaintenanceLogs(deviceId);
  }
}
