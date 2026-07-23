import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type NotificationDocument = HydratedDocument<Notification>;

/**
 * A single notification and its multi-channel delivery attempts.
 * Channels are tried in fallback order (push -> email -> sms) until one
 * "succeeds"; each attempt is recorded for the audit/delivery log.
 */
@Schema({ timestamps: true, collection: 'notifications' })
export class Notification {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  type: string; // booking_confirmed, payment_completed, payment_failed, slot_freed, ...

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  body: string;

  @Prop({ type: Object, default: {} })
  data: Record<string, any>;

  @Prop({ enum: ['sent', 'failed'], default: 'sent', index: true })
  status: 'sent' | 'failed';

  @Prop()
  deliveredChannel?: string; // push | email | sms

  @Prop({ type: [Object], default: [] })
  attempts: { channel: string; ok: boolean; at: Date }[];

  @Prop({ default: false })
  read: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
