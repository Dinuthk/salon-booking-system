import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateStaffDto {
  @IsString()
  salonId: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  workingDays?: string[];
}

export class LeaveDto {
  @IsString()
  from: string;

  @IsString()
  to: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
