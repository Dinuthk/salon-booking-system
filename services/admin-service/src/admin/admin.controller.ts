import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { CurrentUser, GatewayUser } from '../common/current-user.decorator';

function assertAdmin(user: GatewayUser) {
  if (user.role !== 'admin') throw new ForbiddenException('Admin only');
}

@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Patch('salons/:id/status')
  setStatus(
    @CurrentUser() user: GatewayUser,
    @Param('id') id: string,
    @Body('status') status: 'pending' | 'active' | 'suspended',
  ) {
    assertAdmin(user);
    return this.admin.setSalonStatus(id, status);
  }

  @Get('commission')
  getCommission(@CurrentUser() user: GatewayUser) {
    assertAdmin(user);
    return this.admin.getCommission();
  }

  @Put('commission')
  setCommission(@CurrentUser() user: GatewayUser, @Body('pct') pct: number) {
    assertAdmin(user);
    return this.admin.setCommission(pct);
  }

  // Any authenticated user can file a dispute about their booking.
  @Post('disputes')
  file(@CurrentUser() user: GatewayUser, @Body() body: { bookingId: string; reason: string }) {
    return this.admin.fileDispute(user.id, body.bookingId, body.reason);
  }

  @Get('disputes')
  list(@CurrentUser() user: GatewayUser) {
    assertAdmin(user);
    return this.admin.listDisputes();
  }

  @Patch('disputes/:id')
  resolve(
    @CurrentUser() user: GatewayUser,
    @Param('id') id: string,
    @Body() body: { status: any; resolution?: string; refund?: boolean },
  ) {
    assertAdmin(user);
    return this.admin.resolveDispute(id, body.status, body.resolution, body.refund);
  }
}
