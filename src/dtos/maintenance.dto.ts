import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum MaintenanceType {
  PUNCTURE_REPAIR = 'puncture_repair',       // パンク修理
  TIRE_REPLACEMENT = 'tire_replacement',      // タイヤ交換
  BATTERY_REPLACEMENT = 'battery_replacement',   // バッテリー交換
  BRAKE_ADJUSTMENT = 'brake_adjustment',      // ブレーキ調整
  REGULAR_INSPECTION = 'regular_inspection',    // 定期点検
  OTHER = 'other'                             // その他
}

export class CreateMaintenanceDto {
  @IsEnum(MaintenanceType, { message: 'type must be a valid maintenance type.' })
  type!: MaintenanceType;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'description must not exceed 1000 characters.' })
  description?: string;
}
