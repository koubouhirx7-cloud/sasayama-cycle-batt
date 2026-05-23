import { Request, Response } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TelemetryDto } from '../dtos/telemetry.dto';
import { TelemetryService } from '../services/telemetry.service';
import { logger } from '../utils/logger';

export class TelemetryController {
  constructor(private telemetryService: TelemetryService) {}

  receiveTelemetry = async (req: Request, res: Response): Promise<void> => {
    try {
      // 送信されてきたリクエストボディをDTOインスタンスに変換
      const telemetryDto = plainToInstance(TelemetryDto, req.body);

      // バリデーションの実行
      const errors = await validate(telemetryDto);
      if (errors.length > 0) {
        // エラー内容を読みやすいメッセージ配列に整形
        const errorMessages = errors.flatMap((err) => 
          Object.values(err.constraints || {})
        );
        
        logger.warn(`Telemetry validation failed: ${JSON.stringify(errorMessages)}`);
        res.status(400).json({
          error: 'Bad Request',
          messages: errorMessages
        });
        return;
      }

      // サービスの呼び出し (データベースとRedisの保存)
      await this.telemetryService.processTelemetry(telemetryDto);

      res.status(201).json({
        status: 'success',
        message: 'Telemetry data registered successfully'
      });
    } catch (error: any) {
      logger.error('Error handling telemetry data ingestion:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message || 'An unexpected error occurred'
      });
    }
  };
}
