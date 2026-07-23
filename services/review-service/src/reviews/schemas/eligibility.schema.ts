import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type EligibilityDocument = HydratedDocument<ReviewEligibility>;

/**
 * Written when a booking is completed. A customer may only review a booking
 * that appears here (enforces "one review per completed appointment").
 */
@Schema({ timestamps: true, collection: 'review_eligibility' })
export class ReviewEligibility {
  @Prop({ required: true, unique: true })
  bookingId: string;

  @Prop({ required: true })
  customerId: string;

  @Prop({ required: true })
  salonId: string;

  @Prop({ required: true })
  ownerId: string;

  @Prop()
  serviceName?: string;

  @Prop({ default: false })
  used: boolean;
}

export const ReviewEligibilitySchema = SchemaFactory.createForClass(ReviewEligibility);
