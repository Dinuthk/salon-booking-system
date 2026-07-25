import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CurrentUser, GatewayUser } from '../common/current-user.decorator';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  // Public: available slots for a service on a date
  @Get('availability')
  availability(
    @Query('salonId') salonId: string,
    @Query('serviceId') serviceId: string,
    @Query('date') date: string,
    @Query('staffId') staffId?: string,
  ) {
    if (!salonId || !serviceId || !date) {
      throw new BadRequestException('salonId, serviceId and date are required');
    }
    return this.bookings.availability(salonId, serviceId, date, staffId);
  }

  @Get('mine')
  mine(@CurrentUser() user: GatewayUser) {
    return this.bookings.findMine(user.id);
  }

  // Owner: all bookings across their salons
  @Get('owner/list')
  ownerList(@CurrentUser() user: GatewayUser) {
    return this.bookings.findForOwner(user.id);
  }

  @Patch(':id/approve')
  approve(@CurrentUser() user: GatewayUser, @Param('id') id: string) {
    return this.bookings.approve(user.id, user.role, id);
  }

  @Patch(':id/complete')
  complete(@CurrentUser() user: GatewayUser, @Param('id') id: string) {
    return this.bookings.complete(user.id, user.role, id);
  }

  @Patch(':id/no-show')
  noShow(@CurrentUser() user: GatewayUser, @Param('id') id: string) {
    return this.bookings.markNoShow(user.id, user.role, id);
  }

  // Owner cancels a confirmed/approved booking (refunds the customer if paid).
  @Patch(':id/owner-cancel')
  ownerCancel(@CurrentUser() user: GatewayUser, @Param('id') id: string) {
    return this.bookings.ownerCancel(user.id, user.role, id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bookings.findOne(id);
  }

  @Post()
  create(@CurrentUser() user: GatewayUser, @Body() dto: CreateBookingDto) {
    return this.bookings.create(user.id, user.name, dto);
  }

  @Delete(':id')
  cancel(@CurrentUser() user: GatewayUser, @Param('id') id: string) {
    return this.bookings.cancel(user.id, id);
  }
}
