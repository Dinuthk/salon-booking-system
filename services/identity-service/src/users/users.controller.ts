import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { AccountStatus } from './user.entity';
import { CurrentUser, GatewayUser } from '../common/current-user.decorator';

function assertAdmin(user: GatewayUser) {
  if (user.role !== 'admin') throw new ForbiddenException('Admin only');
}

function toProfile(u: any) {
  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    phone: u.phone || null,
    role: u.role,
    status: u.status,
    lastLoginAt: u.lastLoginAt || null,
    createdAt: u.createdAt,
  };
}

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  // Admin: platform account counts (dashboard headline numbers).
  @Get('stats')
  async stats(@CurrentUser() user: GatewayUser) {
    assertAdmin(user);
    return this.users.counts();
  }

  // Admin: list all salon-owner accounts with their approval status.
  @Get('owners')
  async owners(@CurrentUser() user: GatewayUser) {
    assertAdmin(user);
    return (await this.users.findOwners()).map(toProfile);
  }

  // Admin: list all customer accounts.
  @Get('customers')
  async customers(@CurrentUser() user: GatewayUser) {
    assertAdmin(user);
    return (await this.users.findCustomers()).map(toProfile);
  }

  // Admin: approve (active) / suspend / reset to pending an owner.
  @Patch(':id/status')
  async setStatus(
    @CurrentUser() user: GatewayUser,
    @Param('id') id: string,
    @Body('status') status: AccountStatus,
  ) {
    assertAdmin(user);
    return toProfile(await this.users.setStatus(id, status));
  }
}
