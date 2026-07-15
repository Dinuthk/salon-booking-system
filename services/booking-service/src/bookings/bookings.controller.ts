import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
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

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bookings.findOne(id);
  }

  @Post()
  create(@CurrentUser() user: GatewayUser, @Body() dto: CreateBookingDto) {
    return this.bookings.create(user.id, dto);
  }

  @Delete(':id')
  cancel(@CurrentUser() user: GatewayUser, @Param('id') id: string) {
    return this.bookings.cancel(user.id, id);
  }
}
