import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ReviewDocument = HydratedDocument<Review>;

@Schema({ timestamps: true, collection: 'reviews' })
export class Review {
  @Prop({ required: true, index: true })
  salonId: string;

  @Prop({ required: true })
  ownerId: string;

  @Prop({ required: true, unique: true }) // one review per completed booking
  bookingId: string;

  @Prop({ required: true, index: true })
  customerId: string;

  @Prop()
  customerName?: string;

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop()
  comment?: string;

  @Prop()
  serviceName?: string;

  @Prop()
  ownerReply?: string;

  @Prop()
  ownerRepliedAt?: Date;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);
