import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Payment,
  PaymentMethod,
  PaymentState,
} from './payment.entity';
import { PayDto } from './dto/pay.dto';
import { MockGateway } from './mock-gateway';
import { EventBusService } from '../events/event-bus.service';

@Injectable()
export class PaymentsService implements OnModuleInit {
  private readonly logger = new Logger(PaymentsService.name);
  private commissionPct = parseFloat(process.env.PLATFORM_COMMISSION_PCT || '10');

  constructor(
    @InjectRepository(Payment) private readonly repo: Repository<Payment>,
    private readonly gateway: MockGateway,
    private readonly bus: EventBusService,
  ) {}

  async onModuleInit() {
    // Create a pending payment record when a booking enters the saga.
    await this.bus.subscribe('payment.booking-pending', ['booking.pending'], async (_rk, p) => {
      await this.onBookingPending(p);
    });
    // Refund when a paid booking is cancelled, or fail on slot release.
    await this.bus.subscribe(
      'payment.booking-events',
      ['booking.cancelled', 'slot.freed'],
      async (rk, p) => {
        if (rk === 'booking.cancelled' && p.refund) await this.refund(p.bookingId);
        if (rk === 'slot.freed' && p.reason === 'payment_timeout') {
          await this.failPending(p.bookingId, 'payment_timeout');
        }
      },
    );
    // Live commission rate from the Admin service.
    await this.bus.subscribe('payment.commission', ['commission.updated'], async (_rk, p) => {
      if (typeof p.pct === 'number') {
        this.commissionPct = p.pct;
        this.logger.log(`Commission rate updated to ${p.pct}%`);
      }
    });
  }

  private async onBookingPending(p: any): Promise<void> {
    const existing = await this.repo.findOne({ where: { bookingId: p.bookingId } });
    if (existing) return; // idempotent
    const amount = Number(p.amount) || 0;
    const commission = this.round(amount * (this.commissionPct / 100));
    await this.repo.save(
      this.repo.create({
        bookingId: p.bookingId,
        customerId: p.customerId,
        ownerId: p.ownerId,
        salonId: p.salonId,
        amount,
        currency: p.currency || 'LKR',
        commission,
        netToOwner: this.round(amount - commission),
        state: PaymentState.PENDING,
      }),
    );
    this.logger.log(`Pending payment created for booking ${p.bookingId}`);
  }

  // ---------------- Customer pays (saga step 2) ----------------
  async pay(customerId: string, bookingId: string, dto: PayDto): Promise<Payment> {
    const payment = await this.repo.findOne({ where: { bookingId } });
    if (!payment) throw new NotFoundException('No payment for this booking');
    if (payment.customerId !== customerId) throw new ForbiddenException('Not your payment');
    if (payment.state !== PaymentState.PENDING) {
      throw new BadRequestException(`Payment already ${payment.state}`);
    }
    payment.method = dto.method;

    // Pay-at-salon confirms the booking without an online charge.
    if (dto.method === PaymentMethod.PAY_AT_SALON) {
      payment.state = PaymentState.COMPLETED;
      payment.gatewayRef = 'pay_at_salon';
      await this.repo.save(payment);
      this.bus.publish('payment.completed', { bookingId, paymentId: payment.id });
      return payment;
    }

    const result = await this.gateway.charge(
      Number(payment.amount),
      payment.currency,
      dto.simulateFailure,
    );
    if (result.success) {
      payment.state = PaymentState.COMPLETED;
      payment.gatewayRef = result.ref;
      await this.repo.save(payment);
      this.bus.publish('payment.completed', { bookingId, paymentId: payment.id });
      this.logger.log(`Payment completed for booking ${bookingId}`);
    } else {
      payment.state = PaymentState.FAILED;
      payment.failureReason = result.reason;
      await this.repo.save(payment);
      this.bus.publish('payment.failed', { bookingId, paymentId: payment.id, reason: result.reason });
      this.logger.warn(`Payment failed for booking ${bookingId}: ${result.reason}`);
    }
    return payment;
  }

  // ---------------- Refund (saga compensation) ----------------
  private async refund(bookingId: string): Promise<void> {
    const payment = await this.repo.findOne({ where: { bookingId } });
    if (!payment || payment.state !== PaymentState.COMPLETED) return;
    if (payment.gatewayRef && payment.gatewayRef !== 'pay_at_salon') {
      await this.gateway.refund(payment.gatewayRef, Number(payment.amount));
    }
    payment.state = PaymentState.REFUNDED;
    await this.repo.save(payment);
    this.bus.publish('payment.refunded', { bookingId, paymentId: payment.id });
    this.logger.log(`Payment refunded for booking ${bookingId}`);
  }

  private async failPending(bookingId: string, reason: string): Promise<void> {
    const payment = await this.repo.findOne({ where: { bookingId } });
    if (!payment || payment.state !== PaymentState.PENDING) return;
    payment.state = PaymentState.FAILED;
    payment.failureReason = reason;
    await this.repo.save(payment);
    this.logger.log(`Pending payment for booking ${bookingId} marked failed (${reason})`);
  }

  // ---------------- Queries ----------------
  findMine(customerId: string): Promise<Payment[]> {
    return this.repo.find({ where: { customerId }, order: { createdAt: 'DESC' } });
  }

  async findByBooking(bookingId: string): Promise<Payment> {
    const p = await this.repo.findOne({ where: { bookingId } });
    if (!p) throw new NotFoundException('Payment not found');
    return p;
  }

  private round(n: number): number {
    return Math.round(n * 100) / 100;
  }
}
