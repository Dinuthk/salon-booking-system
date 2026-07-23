import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventRecord } from './event-record.entity';
import { EventBusService } from '../events/event-bus.service';

const TRACKED = [
  'booking.pending',
  'booking.confirmed',
  'booking.completed',
  'booking.cancelled',
  'booking.no_show',
];

@Injectable()
export class ReportingService implements OnModuleInit {
  private readonly logger = new Logger(ReportingService.name);

  constructor(
    @InjectRepository(EventRecord) private readonly repo: Repository<EventRecord>,
    private readonly bus: EventBusService,
  ) {}

  async onModuleInit() {
    await this.bus.subscribe('reporting.events', TRACKED, async (rk, p) => this.record(rk, p));
  }

  private async record(rk: string, p: any): Promise<void> {
    const type = rk.replace('.', '_');
    // Idempotent insert (ignore duplicates on redelivery).
    const existing = await this.repo.findOne({ where: { bookingId: p.bookingId, type } });
    if (existing) return;
    await this.repo.save(
      this.repo.create({
        type,
        ownerId: p.ownerId,
        salonId: p.salonId,
        customerId: p.customerId,
        bookingId: p.bookingId,
        serviceName: p.serviceName,
        amount: Number(p.amount) || 0,
      }),
    );
  }

  /** Owner dashboard KPIs computed from the event store. */
  async ownerDashboard(ownerId: string) {
    const rows = await this.repo.find({ where: { ownerId } });
    const count = (t: string) => rows.filter((r) => r.type === t).length;
    const completed = rows.filter((r) => r.type === 'booking_completed');
    const revenue = completed.reduce((s, r) => s + Number(r.amount), 0);

    const confirmed = count('booking_confirmed');
    const cancelled = count('booking_cancelled');
    const noShow = count('booking_no_show');
    const totalBookings = count('booking_pending');

    // Revenue for the last 7 calendar days.
    const byDay: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      byDay[d.toISOString().slice(0, 10)] = 0;
    }
    for (const r of completed) {
      const day = new Date(r.occurredAt).toISOString().slice(0, 10);
      if (day in byDay) byDay[day] += Number(r.amount);
    }

    // Popular services by completed count.
    const svc: Record<string, number> = {};
    for (const r of completed) {
      const k = r.serviceName || 'Unknown';
      svc[k] = (svc[k] || 0) + 1;
    }
    const popularServices = Object.entries(svc)
      .map(([name, n]) => ({ name, count: n }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const denom = confirmed + cancelled + noShow || 1;
    return {
      revenue: Math.round(revenue * 100) / 100,
      totalBookings,
      confirmed,
      completed: completed.length,
      cancelled,
      noShow,
      cancellationRate: Math.round((cancelled / denom) * 1000) / 10,
      noShowRate: Math.round((noShow / denom) * 1000) / 10,
      revenueByDay: Object.entries(byDay).map(([date, amount]) => ({ date, amount })),
      popularServices,
    };
  }
}
