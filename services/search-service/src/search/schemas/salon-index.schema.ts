import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SalonIndexDocument = HydratedDocument<SalonIndex>;

/**
 * Denormalized, read-optimized projection of a salon, kept in sync from
 * `salon.upserted` domain events. Search traffic hits this collection only,
 * never the transactional Catalogue store (CQRS).
 */
@Schema({ collection: 'salon_index' })
export class SalonIndex {
  @Prop({ required: true, unique: true, index: true })
  salonId: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop()
  address?: string;

  @Prop({ index: true })
  city?: string;

  @Prop({
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] },
  })
  location: { type: 'Point'; coordinates: number[] };

  @Prop({ type: [String], default: [] })
  photos: string[];

  @Prop({ index: true, default: 'pending' })
  status: string;

  @Prop({ default: 0 })
  ratingAvg: number;

  @Prop({ default: 0 })
  ratingCount: number;

  @Prop({ type: [Object], default: [] })
  services: {
    serviceId: string;
    name: string;
    category: string;
    durationMinutes: number;
    price: number;
    active: boolean;
  }[];

  // Convenience fields for filtering/sorting
  @Prop({ default: 0 })
  minPrice: number;

  @Prop({ type: [String], default: [] })
  categories: string[];
}

export const SalonIndexSchema = SchemaFactory.createForClass(SalonIndex);
SalonIndexSchema.index({ location: '2dsphere' });
SalonIndexSchema.index({ name: 'text', description: 'text' });
