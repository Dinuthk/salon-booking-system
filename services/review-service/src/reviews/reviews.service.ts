import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Review, ReviewDocument } from './schemas/review.schema';
import { ReviewEligibility, EligibilityDocument } from './schemas/eligibility.schema';
import { CreateReviewDto } from './dto/create-review.dto';
import { EventBusService } from '../events/event-bus.service';

@Injectable()
export class ReviewsService implements OnModuleInit {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    @InjectModel(Review.name) private readonly reviews: Model<ReviewDocument>,
    @InjectModel(ReviewEligibility.name) private readonly eligibility: Model<EligibilityDocument>,
    private readonly bus: EventBusService,
  ) {}

  async onModuleInit() {
    // Completing a booking makes it reviewable.
    await this.bus.subscribe('review.eligibility', ['booking.completed'], async (_rk, p) => {
      await this.eligibility.updateOne(
        { bookingId: p.bookingId },
        {
          $setOnInsert: {
            bookingId: p.bookingId,
            customerId: p.customerId,
            salonId: p.salonId,
            ownerId: p.ownerId,
            serviceName: p.serviceName,
            used: false,
          },
        },
        { upsert: true },
      );
    });
  }

  async create(customerId: string, dto: CreateReviewDto): Promise<ReviewDocument> {
    const elig = await this.eligibility.findOne({ bookingId: dto.bookingId });
    if (!elig || elig.customerId !== customerId) {
      throw new ForbiddenException('You can only review a completed appointment of your own');
    }
    if (elig.used) throw new BadRequestException('This appointment has already been reviewed');

    const review = await this.reviews.create({
      salonId: elig.salonId,
      ownerId: elig.ownerId,
      bookingId: dto.bookingId,
      customerId,
      customerName: dto.customerName,
      rating: dto.rating,
      comment: dto.comment,
      serviceName: elig.serviceName,
    });
    elig.used = true;
    await elig.save();

    await this.publishRating(elig.salonId);
    // Notify the salon owner about the new review.
    this.bus.publish('review.created', {
      salonId: elig.salonId,
      ownerId: elig.ownerId,
      rating: dto.rating,
      customerName: dto.customerName,
      serviceName: elig.serviceName,
    });
    this.logger.log(`Review ${review.id} created for salon ${elig.salonId}`);
    return review;
  }

  async reply(ownerId: string, role: string, reviewId: string, text: string): Promise<ReviewDocument> {
    const review = await this.reviews.findById(reviewId);
    if (!review) throw new NotFoundException('Review not found');
    if (review.ownerId !== ownerId && role !== 'admin') {
      throw new ForbiddenException('Only the salon owner can reply');
    }
    review.ownerReply = text;
    review.ownerRepliedAt = new Date();
    await review.save();
    return review;
  }

  listForSalon(salonId: string) {
    return this.reviews.find({ salonId }).sort({ createdAt: -1 }).limit(100).exec();
  }

  listMine(customerId: string) {
    return this.reviews.find({ customerId }).sort({ createdAt: -1 }).exec();
  }

  /** Reviewable-but-not-yet-reviewed bookings for a customer. */
  pending(customerId: string) {
    return this.eligibility.find({ customerId, used: false }).sort({ createdAt: -1 }).exec();
  }

  /** Recompute the salon's rating and broadcast it (Catalogue + Search update). */
  private async publishRating(salonId: string): Promise<void> {
    const agg = await this.reviews.aggregate([
      { $match: { salonId } },
      { $group: { _id: '$salonId', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    const ratingAvg = agg.length ? Math.round(agg[0].avg * 10) / 10 : 0;
    const ratingCount = agg.length ? agg[0].count : 0;
    this.bus.publish('salon.rating.updated', { salonId, ratingAvg, ratingCount });
  }
}
