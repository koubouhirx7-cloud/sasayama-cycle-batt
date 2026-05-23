import { Request, Response } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { VehicleQueryDto } from '../dtos/vehicle-query.dto';
import { VehicleService } from '../services/vehicle.service';
import { logger } from '../utils/logger';

export class VehicleController {
  constructor(private vehicleService: VehicleService) {}

  getVehicles = async (req: Request, res: Response): Promise<void> => {
    try {
      // クエリパラメータをDTOインスタンスに変換
      const queryDto = plainToInstance(VehicleQueryDto, req.query);

      // バリデーション実行
      const errors = await validate(queryDto);
      if (errors.length > 0) {
        const errorMessages = errors.flatMap((err) => 
          Object.values(err.constraints || {})
        );

        logger.warn(`Vehicle query validation failed: ${JSON.stringify(errorMessages)}`);
        res.status(400).json({
          error: 'Bad Request',
          messages: errorMessages
        });
        return;
      }

      // サービスの呼び出し
      const vehicles = await this.vehicleService.getLatestVehicles(queryDto);

      res.status(200).json(vehicles);
    } catch (error: any) {
      logger.error('Error handling vehicle status retrieval:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message || 'An unexpected error occurred'
      });
    }
  };
}
