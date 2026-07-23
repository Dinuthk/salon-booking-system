import { Controller, Get } from '@nestjs/common';
import { ReportingService } from './reporting.service';
import { CurrentUser, GatewayUser } from '../common/current-user.decorator';

@Controller('reports')
export class ReportingController {
  constructor(private readonly reporting: ReportingService) {}

  @Get('owner')
  owner(@CurrentUser() user: GatewayUser) {
    return this.reporting.ownerDashboard(user.id);
  }
}
