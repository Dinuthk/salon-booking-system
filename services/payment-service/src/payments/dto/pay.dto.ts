import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { PaymentMethod } from '../payment.entity';

export class PayDto {
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  // Testing hook: force the mock gateway to decline this charge.
  @IsOptional()
  @IsBoolean()
  simulateFailure?: boolean;
}
