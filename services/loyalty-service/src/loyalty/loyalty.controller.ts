import { Controller, Get } from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';
import { CurrentUser, GatewayUser } from '../common/current-user.decorator';

@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly loyalty: LoyaltyService) {}

  @Get('me')
  me(@CurrentUser() user: GatewayUser) {
    return this.loyalty.getMe(user.id);
  }
}
