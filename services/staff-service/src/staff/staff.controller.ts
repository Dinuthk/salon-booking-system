import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { StaffService } from './staff.service';
import { CreateStaffDto, LeaveDto } from './dto/staff.dto';
import { CurrentUser, GatewayUser } from '../common/current-user.decorator';

@Controller('staff')
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  @Get('salon/:salonId')
  forSalon(@Param('salonId') salonId: string) {
    return this.staff.listForSalon(salonId);
  }

  @Get('mine')
  mine(@CurrentUser() user: GatewayUser) {
    return this.staff.listForOwner(user.id);
  }

  @Post()
  create(@CurrentUser() user: GatewayUser, @Body() dto: CreateStaffDto) {
    if (user.role !== 'owner' && user.role !== 'admin') {
      throw new ForbiddenException('Only owners can add staff');
    }
    return this.staff.create(user.id, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: GatewayUser, @Param('id') id: string, @Body() patch: any) {
    return this.staff.update(user.id, id, patch);
  }

  @Post(':id/leave')
  leave(@CurrentUser() user: GatewayUser, @Param('id') id: string, @Body() dto: LeaveDto) {
    return this.staff.addLeave(user.id, id, dto);
  }
}
