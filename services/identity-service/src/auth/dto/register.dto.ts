import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '../../common/roles.enum';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(2)
  fullName: string;

  // Allow customer/owner self-registration; staff/admin are provisioned internally.
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
