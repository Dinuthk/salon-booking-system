import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoyaltyAccount, LoyaltyEntry, LoyaltyTier } from './loyalty.entities';
import { EventBusService } from '../events/event-bus.service';

// 1 point per 10 currency units spent.
const POINTS_PER_UNIT = 0.1;

@Injectable()
export class LoyaltyService implements OnModuleInit {
  private readonly logger = new Logger(LoyaltyService.name);

  constructor(
    @InjectRepository(LoyaltyAccount) private readonly accounts: Repository<LoyaltyAccount>,
    @InjectRepository(LoyaltyEntry) private readonly entries: Repository<LoyaltyEntry>,
    private readonly bus: EventBusService,
  ) {}

  async onModuleInit() {
    // Points are awarded on completion and reversed on refund (per FR-11).
    await this.bus.subscribe(
      'loyalty.events',
      ['booking.completed', 'payment.refunded'],
      async (rk, p) => {
        if (rk === 'booking.completed') await this.award(p);
        else await this.reverse(p.bookingId);
      },
    );
  }

  private tierFor(lifetime: number): LoyaltyTier {
    if (lifetime >= 5000) return 'platinum';
    if (lifetime >= 2000) return 'gold';
    if (lifetime >= 500) return 'silver';
    return 'bronze';
  }

  private async getOrCreateAccount(customerId: string): Promise<LoyaltyAccount> {
    let acc = await this.accounts.findOne({ where: { customerId } });
    if (!acc) acc = await this.accounts.save(this.accounts.create({ customerId }));
    return acc;
  }

  private async award(p: any): Promise<void> {
    const points = Math.floor((Number(p.amount) || 0) * POINTS_PER_UNIT);
    if (points <= 0) return;
    // Idempotency: skip if we already earned for this booking.
    const existing = await this.entries.findOne({ where: { bookingId: p.bookingId, type: 'earn' } });
    if (existing) return;

    await this.entries.save(
      this.entries.create({
        customerId: p.customerId,
        bookingId: p.bookingId,
        type: 'earn',
        points,
        reason: `Completed ${p.serviceName || 'appointment'}`,
      }),
    );
    const acc = await this.getOrCreateAccount(p.customerId);
    acc.points += points;
    acc.lifetimePoints += points;
    acc.tier = this.tierFor(acc.lifetimePoints);
    await this.accounts.save(acc);
    this.logger.log(`Awarded ${points} pts to ${p.customerId} (tier ${acc.tier})`);
  }

  private async reverse(bookingId: string): Promise<void> {
    const earn = await this.entries.findOne({ where: { bookingId, type: 'earn' } });
    if (!earn) return;
    const already = await this.entries.findOne({ where: { bookingId, type: 'reverse' } });
    if (already) return;

    await this.entries.save(
      this.entries.create({
        customerId: earn.customerId,
        bookingId,
        type: 'reverse',
        points: -earn.points,
        reason: 'Reversed on refund',
      }),
    );
    const acc = await this.getOrCreateAccount(earn.customerId);
    acc.points = Math.max(0, acc.points - earn.points);
    acc.lifetimePoints = Math.max(0, acc.lifetimePoints - earn.points);
    acc.tier = this.tierFor(acc.lifetimePoints);
    await this.accounts.save(acc);
    this.logger.log(`Reversed ${earn.points} pts for booking ${bookingId}`);
  }

  // ---------------- Query API ----------------
  async getMe(customerId: string) {
    const account = await this.getOrCreateAccount(customerId);
    const ledger = await this.entries.find({
      where: { customerId },
      order: { createdAt: 'DESC' },
      take: 20,
    });
    const tiers: LoyaltyTier[] = ['bronze', 'silver', 'gold', 'platinum'];
    const thresholds = { bronze: 0, silver: 500, gold: 2000, platinum: 5000 };
    const next = tiers[tiers.indexOf(account.tier) + 1];
    return {
      ...account,
      nextTier: next || null,
      pointsToNextTier: next ? thresholds[next] - account.lifetimePoints : 0,
      ledger,
    };
  }
}
