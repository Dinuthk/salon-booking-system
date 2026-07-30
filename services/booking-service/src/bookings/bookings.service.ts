import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource, LessThan, Repository } from 'typeorm';
import { Booking, BookingStatus, PaymentStatus } from './booking.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CatalogueClient } from './catalogue.client';
import { RedisService } from '../redis/redis.service';
import { EventBusService } from '../events/event-bus.service';

const ACTIVE = [BookingStatus.PENDING, BookingStatus.CONFIRMED];
const SLOT_STEP_MIN = 30;

@Injectable()
export class BookingsService implements OnModuleInit {
  private readonly logger = new Logger(BookingsService.name);
  private readonly lockTtl = parseInt(process.env.SLOT_LOCK_TTL_SECONDS || '600', 10);

  constructor(
    @InjectRepository(Booking) private readonly repo: Repository<Booking>,
    private readonly dataSource: DataSource,
    private readonly catalogue: CatalogueClient,
    private readonly redis: RedisService,
    private readonly bus: EventBusService,
  ) {}

  async onModuleInit() {
    // Saga: react to payment outcomes.
    await this.bus.subscribe(
      'booking.payment-events',
      ['payment.completed', 'payment.failed'],
      async (rk, p) => {
        if (rk === 'payment.completed') await this.confirm(p.bookingId);
        else await this.cancelForPaymentFailure(p.bookingId);
      },
    );
  }

  // ---------------- Booking creation (saga step 1) ----------------
  async create(customerId: string, customerName: string | undefined, dto: CreateBookingDto): Promise<Booking> {
    const salon = await this.catalogue.getSalon(dto.salonId);
    if (salon.status !== 'active') {
      throw new BadRequestException('Salon is not accepting bookings');
    }
    const service = salon.services.find((s) => s.serviceId === dto.serviceId && s.active);
    if (!service) throw new NotFoundException('Service not found');

    if (dto.staffId && !service.assignedStaffIds.includes(dto.staffId)) {
      throw new BadRequestException('Selected staff does not offer this service');
    }

    const start = new Date(dto.startTime);
    if (isNaN(start.getTime())) throw new BadRequestException('Invalid startTime');
    if (start.getTime() < Date.now()) {
      throw new BadRequestException('Cannot book a slot in the past');
    }
    const end = new Date(start.getTime() + service.durationMinutes * 60_000);
    const blockedUntil = new Date(end.getTime() + service.bufferMinutes * 60_000);
    const resourceKey = dto.staffId ? `staff:${dto.staffId}` : `salon:${dto.salonId}`;

    // 1) Distributed lock on the slot for the payment window.
    const lockKey = `lock:slot:${resourceKey}:${start.toISOString()}`;
    const token = await this.redis.acquireLock(lockKey, this.lockTtl);
    if (!token) {
      throw new ConflictException('This slot is currently being booked by someone else');
    }

    try {
      // 2) Authoritative conflict check + insert in one SQL transaction.
      const booking = await this.dataSource.transaction(async (tx) => {
        const repo = tx.getRepository(Booking);
        const conflict = await repo
          .createQueryBuilder('b')
          .where('b.resourceKey = :resourceKey', { resourceKey })
          .andWhere('b.status IN (:...active)', { active: ACTIVE })
          .andWhere('b.startTime < :blockedUntil', { blockedUntil })
          .andWhere('b.blockedUntil > :start', { start })
          .getOne();
        if (conflict) {
          throw new ConflictException('Slot no longer available');
        }
        const entity = repo.create({
          customerId,
          customerName,
          salonId: dto.salonId,
          ownerId: salon.ownerId,
          serviceId: service.serviceId,
          serviceName: service.name,
          resourceKey,
          staffId: dto.staffId,
          startTime: start,
          endTime: end,
          blockedUntil,
          durationMinutes: service.durationMinutes,
          bufferMinutes: service.bufferMinutes,
          price: service.price,
          status: BookingStatus.PENDING,
          paymentStatus: PaymentStatus.UNPAID,
          paymentDeadline: new Date(Date.now() + this.lockTtl * 1000),
          lockKey,
          lockToken: token,
        });
        return repo.save(entity);
      });

      // 3) Emit saga start event.
      this.bus.publish('booking.pending', {
        bookingId: booking.id,
        customerId: booking.customerId,
        salonId: booking.salonId,
        ownerId: booking.ownerId,
        serviceId: booking.serviceId,
        serviceName: booking.serviceName,
        amount: Number(booking.price),
        currency: booking.currency,
        paymentDeadline: booking.paymentDeadline,
      });

      return booking;
    } catch (err) {
      // Failed to persist — free the lock so the slot is immediately reusable.
      await this.redis.releaseLock(lockKey, token);
      throw err;
    }
  }

  // ---------------- Saga step: confirm on payment ----------------
  private async confirm(bookingId: string): Promise<void> {
    const booking = await this.repo.findOne({ where: { id: bookingId } });
    if (!booking || booking.status !== BookingStatus.PENDING) return;
    booking.status = BookingStatus.CONFIRMED;
    booking.paymentStatus = PaymentStatus.PAID;
    booking.paymentDeadline = null;
    await this.repo.save(booking);
    // Lock no longer needed — the confirmed row itself blocks the slot now.
    if (booking.lockKey && booking.lockToken) {
      await this.redis.releaseLock(booking.lockKey, booking.lockToken);
    }
    this.bus.publish('booking.confirmed', {
      bookingId: booking.id,
      customerId: booking.customerId,
      customerName: booking.customerName,
      salonId: booking.salonId,
      ownerId: booking.ownerId,
      serviceName: booking.serviceName,
      amount: Number(booking.price),
      startTime: booking.startTime,
    });
    this.logger.log(`Booking ${bookingId} confirmed`);
  }

  // ---------------- Saga compensation: payment failed ----------------
  private async cancelForPaymentFailure(bookingId: string): Promise<void> {
    const booking = await this.repo.findOne({ where: { id: bookingId } });
    if (!booking || booking.status !== BookingStatus.PENDING) return;
    await this.releaseBooking(booking, 'payment_failed');
  }

  // ---------------- Customer-initiated cancel ----------------
  // Allowed only BEFORE the owner approves (pending / confirmed).
  async cancel(userId: string, bookingId: string): Promise<Booking> {
    const booking = await this.repo.findOne({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.customerId !== userId) {
      throw new ForbiddenException('Not your booking');
    }
    if (booking.status === BookingStatus.APPROVED) {
      throw new BadRequestException(
        'The salon has already approved this booking, so it can no longer be cancelled. Please contact the salon.',
      );
    }
    if (![BookingStatus.PENDING, BookingStatus.CONFIRMED].includes(booking.status)) {
      throw new BadRequestException(`Cannot cancel a ${booking.status} booking`);
    }
    await this.releaseWithRefund(booking, 'customer_cancelled');
    return booking;
  }

  // ---------------- Owner: approve a confirmed booking ----------------
  async approve(userId: string, role: string, bookingId: string): Promise<Booking> {
    const booking = await this.findOne(bookingId);
    if (booking.ownerId !== userId && role !== 'admin') {
      throw new ForbiddenException('Only the salon owner can approve this booking');
    }
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException(`Only a confirmed booking can be approved (this is ${booking.status})`);
    }
    booking.status = BookingStatus.APPROVED;
    await this.repo.save(booking);
    this.bus.publish('booking.approved', {
      bookingId: booking.id,
      customerId: booking.customerId,
      salonId: booking.salonId,
      ownerId: booking.ownerId,
      serviceName: booking.serviceName,
      startTime: booking.startTime,
    });
    this.logger.log(`Booking ${booking.id} approved by owner`);
    return booking;
  }

  // ---------------- Owner: cancel a confirmed/approved booking ----------------
  async ownerCancel(userId: string, role: string, bookingId: string): Promise<Booking> {
    const booking = await this.findOne(bookingId);
    if (booking.ownerId !== userId && role !== 'admin') {
      throw new ForbiddenException('Only the salon owner can cancel this booking');
    }
    if (![BookingStatus.CONFIRMED, BookingStatus.APPROVED].includes(booking.status)) {
      throw new BadRequestException(`Cannot cancel a ${booking.status} booking`);
    }
    await this.releaseWithRefund(booking, 'owner_cancelled');
    return booking;
  }

  // Release a booking's slot and refund the customer if they had paid.
  private async releaseWithRefund(booking: Booking, reason: string): Promise<void> {
    const wasPaid = booking.paymentStatus === PaymentStatus.PAID;
    const cancelledBy = reason === 'owner_cancelled' ? 'owner' : 'customer';
    await this.releaseBooking(booking, reason);
    if (wasPaid) {
      this.bus.publish('booking.cancelled', {
        bookingId: booking.id,
        customerId: booking.customerId,
        customerName: booking.customerName,
        salonId: booking.salonId,
        ownerId: booking.ownerId,
        serviceName: booking.serviceName,
        amount: Number(booking.price),
        cancelledBy,
        refund: true,
      });
    }
  }

  // ---------------- Appointment lifecycle (owner/staff) ----------------
  async complete(userId: string, role: string, bookingId: string): Promise<Booking> {
    const booking = await this.findOne(bookingId);
    if (booking.ownerId !== userId && role !== 'admin') {
      throw new ForbiddenException('Only the salon owner can complete this booking');
    }
    if (booking.status !== BookingStatus.APPROVED) {
      throw new BadRequestException(`Approve the booking before completing it (this is ${booking.status})`);
    }
    booking.status = BookingStatus.COMPLETED;
    await this.repo.save(booking);
    // Drives loyalty accrual, review eligibility, analytics.
    this.bus.publish('booking.completed', {
      bookingId: booking.id,
      customerId: booking.customerId,
      salonId: booking.salonId,
      ownerId: booking.ownerId,
      serviceId: booking.serviceId,
      serviceName: booking.serviceName,
      amount: Number(booking.price),
      currency: booking.currency,
    });
    this.logger.log(`Booking ${booking.id} completed`);
    return booking;
  }

  async markNoShow(userId: string, role: string, bookingId: string): Promise<Booking> {
    const booking = await this.findOne(bookingId);
    if (booking.ownerId !== userId && role !== 'admin') {
      throw new ForbiddenException('Only the salon owner can mark a no-show');
    }
    if (booking.status !== BookingStatus.APPROVED) {
      throw new BadRequestException(`Approve the booking before marking a no-show (this is ${booking.status})`);
    }
    booking.status = BookingStatus.NO_SHOW;
    await this.repo.save(booking);
    this.bus.publish('booking.no_show', {
      bookingId: booking.id,
      customerId: booking.customerId,
      salonId: booking.salonId,
      ownerId: booking.ownerId,
      amount: Number(booking.price),
    });
    return booking;
  }

  /** Owner view: all bookings across the owner's salons. */
  findForOwner(ownerId: string): Promise<Booking[]> {
    return this.repo.find({ where: { ownerId }, order: { startTime: 'DESC' } });
  }

  private async releaseBooking(booking: Booking, reason: string): Promise<void> {
    booking.status = BookingStatus.CANCELLED;
    booking.paymentDeadline = null;
    await this.repo.save(booking);
    if (booking.lockKey && booking.lockToken) {
      await this.redis.releaseLock(booking.lockKey, booking.lockToken);
    }
    this.bus.publish('slot.freed', {
      bookingId: booking.id,
      customerId: booking.customerId,
      salonId: booking.salonId,
      resourceKey: booking.resourceKey,
      startTime: booking.startTime,
      reason,
    });
    this.logger.log(`Booking ${booking.id} released (${reason})`);
  }

  // ---------------- Auto-release expired pending bookings ----------------
  @Cron(CronExpression.EVERY_MINUTE)
  async releaseExpired(): Promise<void> {
    const expired = await this.repo.find({
      where: { status: BookingStatus.PENDING, paymentDeadline: LessThan(new Date()) },
    });
    for (const booking of expired) {
      this.logger.warn(`Payment window expired for booking ${booking.id}`);
      await this.releaseBooking(booking, 'payment_timeout');
    }
  }

  // ---------------- Queries ----------------
  findMine(customerId: string): Promise<Booking[]> {
    return this.repo.find({ where: { customerId }, order: { startTime: 'DESC' } });
  }

  async findOne(id: string): Promise<Booking> {
    const b = await this.repo.findOne({ where: { id } });
    if (!b) throw new NotFoundException('Booking not found');
    return b;
  }

  // ---------------- Availability ----------------
  async availability(
    salonId: string,
    serviceId: string,
    dateStr: string,
    staffId?: string,
  ) {
    const salon = await this.catalogue.getSalon(salonId);
    const service = salon.services.find((s) => s.serviceId === serviceId && s.active);
    if (!service) throw new NotFoundException('Service not found');

    const date = new Date(`${dateStr}T00:00:00.000Z`);
    if (isNaN(date.getTime())) throw new BadRequestException('Invalid date (use YYYY-MM-DD)');

    const hours = this.openingHoursFor(salon.openingHours, date);
    if (!hours) return { date: dateStr, slots: [] };

    const resourceKey = staffId ? `staff:${staffId}` : `salon:${salonId}`;
    const dayEnd = new Date(date.getTime() + 24 * 3600_000);
    const existing = await this.repo
      .createQueryBuilder('b')
      .where('b.resourceKey = :resourceKey', { resourceKey })
      .andWhere('b.status IN (:...active)', { active: ACTIVE })
      .andWhere('b.startTime < :dayEnd', { dayEnd })
      .andWhere('b.blockedUntil > :date', { date })
      .getMany();

    const open = this.atTime(date, hours.open);
    const close = this.atTime(date, hours.close);
    const slots: { start: string; available: boolean }[] = [];
    const duration = service.durationMinutes;
    const buffer = service.bufferMinutes;

    for (
      let t = open.getTime();
      t + duration * 60_000 <= close.getTime();
      t += SLOT_STEP_MIN * 60_000
    ) {
      const slotStart = new Date(t);
      const slotBlockedUntil = new Date(t + (duration + buffer) * 60_000);
      const inPast = slotStart.getTime() < Date.now();
      const clash = existing.some(
        (b) =>
          new Date(b.startTime).getTime() < slotBlockedUntil.getTime() &&
          new Date(b.blockedUntil).getTime() > slotStart.getTime(),
      );
      slots.push({ start: slotStart.toISOString(), available: !inPast && !clash });
    }
    return { date: dateStr, slots };
  }

  private openingHoursFor(
    openingHours: Record<string, { open: string; close: string } | null>,
    date: Date,
  ): { open: string; close: string } | null {
    const names = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const dow = date.getUTCDay();
    const candidates = [names[dow], String(dow)];
    for (const key of candidates) {
      if (key in openingHours) return openingHours[key]; // may be null (closed)
    }
    // Default business hours when the salon hasn't configured this day.
    return { open: '09:00', close: '17:00' };
  }

  private atTime(date: Date, hhmm: string): Date {
    const [h, m] = hhmm.split(':').map(Number);
    return new Date(date.getTime() + (h * 60 + m) * 60_000);
  }
}
