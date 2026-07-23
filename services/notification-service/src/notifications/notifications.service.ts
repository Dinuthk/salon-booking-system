import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDocument } from './schemas/notification.schema';
import { EventBusService } from '../events/event-bus.service';

// Fallback order per the notification retry rule (push -> email -> sms).
const CHANNELS = ['push', 'email', 'sms'];

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name) private readonly model: Model<NotificationDocument>,
    private readonly bus: EventBusService,
  ) {}

  async onModuleInit() {
    await this.bus.subscribe(
      'notification.events',
      ['booking.confirmed', 'booking.completed', 'booking.cancelled', 'slot.freed', 'owner.registered'],
      async (rk, p) => this.handle(rk, p),
    );
  }

  private async handle(routingKey: string, p: any): Promise<void> {
    // Owner sign-up: alert every admin so they can review the request.
    if (routingKey === 'owner.registered') {
      for (const adminId of p.adminIds || []) {
        await this.deliver(
          adminId,
          routingKey,
          'New salon owner request 🔔',
          `${p.fullName} (${p.email}) signed up as an owner and needs approval.`,
          p,
        );
      }
      return;
    }
    const spec = this.render(routingKey, p);
    if (!spec) return;
    await this.deliver(spec.userId, routingKey, spec.title, spec.body, p);
  }

  private render(rk: string, p: any): { userId: string; title: string; body: string } | null {
    switch (rk) {
      case 'booking.confirmed':
        return { userId: p.customerId, title: 'Booking confirmed ✅', body: 'Your appointment is confirmed. See you soon!' };
      case 'booking.completed':
        return { userId: p.customerId, title: 'Thanks for visiting 💜', body: `Hope you enjoyed your ${p.serviceName || 'appointment'}. Leave a review!` };
      case 'booking.cancelled':
        return { userId: p.customerId, title: 'Booking cancelled', body: p.refund ? 'Your booking was cancelled and a refund is on its way.' : 'Your booking was cancelled.' };
      case 'slot.freed':
        if (p.reason !== 'payment_timeout' || !p.customerId) return null;
        return { userId: p.customerId, title: 'Reservation expired', body: 'We released your held slot because payment was not completed in time.' };
      default:
        return null;
    }
  }

  /** Simulate multi-channel delivery with fallback until one channel succeeds. */
  private async deliver(userId: string, type: string, title: string, body: string, data: any) {
    const attempts: { channel: string; ok: boolean; at: Date }[] = [];
    let deliveredChannel: string | undefined;
    for (const channel of CHANNELS) {
      const ok = this.mockSend(channel);
      attempts.push({ channel, ok, at: new Date() });
      if (ok) {
        deliveredChannel = channel;
        break;
      }
      this.logger.warn(`${channel} failed for ${type}, trying next channel...`);
    }
    await this.model.create({
      userId,
      type: type.replace('.', '_'),
      title,
      body,
      data,
      status: deliveredChannel ? 'sent' : 'failed',
      deliveredChannel,
      attempts,
    });
    this.logger.log(`Notification "${type}" -> ${userId} via ${deliveredChannel ?? 'NONE'}`);
  }

  // Mock channel: push occasionally "fails" so the fallback path is exercised.
  private mockSend(channel: string): boolean {
    if (channel === 'push') return Math.random() > 0.3;
    return true; // email/sms always succeed in the mock
  }

  // ---------------- Query API ----------------
  findForUser(userId: string) {
    return this.model.find({ userId }).sort({ createdAt: -1 }).limit(50).exec();
  }

  async markRead(userId: string, id: string) {
    await this.model.updateOne({ _id: id, userId }, { $set: { read: true } });
    return { ok: true };
  }

  async unreadCount(userId: string) {
    return { count: await this.model.countDocuments({ userId, read: false }) };
  }
}
