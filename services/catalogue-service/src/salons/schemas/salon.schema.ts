import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SalonDocument = HydratedDocument<Salon>;

@Schema({ _id: true })
export class SalonService {
  _id: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ default: 'General' })
  category: string;

  @Prop()
  description?: string;

  @Prop({ required: true, min: 1 })
  durationMinutes: number;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ default: 0 })
  bufferMinutes: number;

  @Prop({ type: [String], default: [] })
  assignedStaffIds: string[];

  @Prop({ default: true })
  active: boolean;
}
export const SalonServiceSchema = SchemaFactory.createForClass(SalonService);

@Schema({ _id: true })
export class Branch {
  _id: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop()
  address?: string;

  @Prop()
  city?: string;
}
export const BranchSchema = SchemaFactory.createForClass(Branch);

@Schema({ timestamps: true })
export class Salon {
  @Prop({ required: true, index: true })
  ownerId: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop()
  address?: string;

  @Prop({ index: true })
  city?: string;

  // GeoJSON point for 2dsphere location search: [lng, lat]
  @Prop({
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] },
  })
  location: { type: 'Point'; coordinates: number[] };

  @Prop()
  phone?: string;

  @Prop({ type: [String], default: [] })
  photos: string[];

  @Prop({ type: Object, default: {} })
  openingHours: Record<string, { open: string; close: string } | null>;

  @Prop({ enum: ['pending', 'active', 'suspended'], default: 'pending', index: true })
  status: 'pending' | 'active' | 'suspended';

  @Prop({ type: [BranchSchema], default: [] })
  branches: Branch[];

  @Prop({ type: [SalonServiceSchema], default: [] })
  services: SalonService[];

  @Prop({ default: 0 })
  ratingAvg: number;

  @Prop({ default: 0 })
  ratingCount: number;
}

export const SalonSchema = SchemaFactory.createForClass(Salon);
SalonSchema.index({ location: '2dsphere' });
SalonSchema.index({ name: 'text', description: 'text' });
