import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, ReplyDto } from './dto/create-review.dto';
import { CurrentUser, GatewayUser } from '../common/current-user.decorator';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  // Public: reviews for a salon
  @Get('salon/:salonId')
  forSalon(@Param('salonId') salonId: string) {
    return this.reviews.listForSalon(salonId);
  }

  @Get('mine')
  mine(@CurrentUser() user: GatewayUser) {
    return this.reviews.listMine(user.id);
  }

  // Appointments the customer can still review
  @Get('pending')
  pending(@CurrentUser() user: GatewayUser) {
    return this.reviews.pending(user.id);
  }

  @Post()
  create(@CurrentUser() user: GatewayUser, @Body() dto: CreateReviewDto) {
    return this.reviews.create(user.id, dto);
  }

  @Patch(':id/reply')
  reply(@CurrentUser() user: GatewayUser, @Param('id') id: string, @Body() dto: ReplyDto) {
    return this.reviews.reply(user.id, user.role, id, dto.reply);
  }
}
