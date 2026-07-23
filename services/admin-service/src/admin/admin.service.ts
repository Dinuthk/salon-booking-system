import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommissionConfig, Dispute, DisputeStatus } from './admin.entities';
import { EventBusService } from '../events/event-bus.service';

@Injectable()
export class AdminService implements OnModuleInit {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(CommissionConfig) private readonly commission: Repository<CommissionConfig>,
    @InjectRepository(Dispute) private readonly disputes: Repository<Dispute>,
    private readonly bus: EventBusService,
  ) {}

  async onModuleInit() {
    // Ensure a default commission config row exists.
    const existing = await this.commission.findOne({ where: { scope: 'platform' } });
    if (!existing) {
      await this.commission.save(
        this.commission.create({ scope: 'platform', pct: Number(process.env.PLATFORM_COMMISSION_PCT || 10) }),
      );
    }
  }

  // ---------------- Salon verification ----------------
  setSalonStatus(salonId: string, status: 'pending' | 'active' | 'suspended') {
    this.bus.publish('admin.salon.status', { salonId, status });
    this.logger.log(`Salon ${salonId} -> ${status}`);
    return { salonId, status, applied: true };
  }

  // ---------------- Commission config ----------------
  async getCommission() {
    return this.commission.findOne({ where: { scope: 'platform' } });
  }

  async setCommission(pct: number) {
    const cfg = (await this.commission.findOne({ where: { scope: 'platform' } }))
      ?? this.commission.create({ scope: 'platform' });
    cfg.pct = pct;
    await this.commission.save(cfg);
    this.bus.publish('commission.updated', { pct });
    this.logger.log(`Commission -> ${pct}%`);
    return cfg;
  }

  // ---------------- Disputes ----------------
  fileDispute(filedBy: string, bookingId: string, reason: string) {
    return this.disputes.save(this.disputes.create({ filedBy, bookingId, reason, status: 'open' }));
  }

  listDisputes() {
    return this.disputes.find({ order: { createdAt: 'DESC' } });
  }

  async resolveDispute(id: string, status: DisputeStatus, resolution?: string, refund = false) {
    const d = await this.disputes.findOne({ where: { id } });
    if (!d) throw new NotFoundException('Dispute not found');
    d.status = status;
    d.resolution = resolution;
    if (refund && !d.refundIssued) {
      d.refundIssued = true;
      // Reuse the refund saga path in the Payment service.
      this.bus.publish('booking.cancelled', { bookingId: d.bookingId, refund: true });
    }
    return this.disputes.save(d);
  }
}
