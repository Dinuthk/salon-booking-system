import { IsISO8601, IsOptional, IsString } from 'class-validator';

export class CreateBookingDto {
  @IsString()
  salonId: string;

  @IsString()
  serviceId: string;

  // Optional preferred staff; omitted => "any staff" (salon-level slot).
  @IsOptional()
  @IsString()
  staffId?: string;

  // ISO-8601 start time in UTC.
  @IsISO8601()
  startTime: string;
}
