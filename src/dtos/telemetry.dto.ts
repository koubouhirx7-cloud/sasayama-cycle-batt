import { IsString, IsNotEmpty, IsNumber, Min, Max, IsEnum, IsISO8601 } from 'class-validator';

export enum VehicleStatus {
  IN_USE = 'in_use',
  AVAILABLE = 'available',
  CHARGING = 'charging',
  ERROR = 'error'
}

export class TelemetryDto {
  @IsString()
  @IsNotEmpty({ message: 'device_id is required' })
  device_id!: string;

  @IsNumber({}, { message: 'battery_soc must be a number' })
  @Min(0, { message: 'battery_soc must be at least 0' })
  @Max(100, { message: 'battery_soc must be at most 100' })
  battery_soc!: number;

  @IsNumber({}, { message: 'battery_voltage must be a number' })
  @Min(0, { message: 'battery_voltage must be a non-negative number' })
  battery_voltage!: number;

  @IsNumber({}, { message: 'current_lat must be a number' })
  @Min(-90, { message: 'current_lat must be between -90 and 90' })
  @Max(90, { message: 'current_lat must be between -90 and 90' })
  current_lat!: number;

  @IsNumber({}, { message: 'current_lng must be a number' })
  @Min(-180, { message: 'current_lng must be between -180 and 180' })
  @Max(180, { message: 'current_lng must be between -180 and 180' })
  current_lng!: number;

  @IsEnum(VehicleStatus, { message: 'status must be: in_use, available, charging, error' })
  status!: VehicleStatus;

  @IsISO8601({}, { message: 'timestamp must be a valid ISO 8601 date string' })
  timestamp!: string;
}
