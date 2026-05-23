import { IsNumber, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class VehicleQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'battery_less_than must be a number' })
  @Min(0, { message: 'battery_less_than cannot be less than 0' })
  @Max(100, { message: 'battery_less_than cannot exceed 100' })
  battery_less_than?: number;
}
