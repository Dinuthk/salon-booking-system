import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PayDto } from './dto/pay.dto';
import { CurrentUser, GatewayUser } from '../common/current-user.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get('mine')
  mine(@CurrentUser() user: GatewayUser) {
    return this.payments.findMine(user.id);
  }

  @Get('booking/:bookingId')
  byBooking(@Param('bookingId') bookingId: string) {
    return this.payments.findByBooking(bookingId);
  }

  @Post('booking/:bookingId/pay')
  pay(
    @CurrentUser() user: GatewayUser,
    @Param('bookingId') bookingId: string,
    @Body() dto: PayDto,
  ) {
    return this.payments.pay(user.id, bookingId, dto);
  }
}
