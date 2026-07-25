import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum BookingStatus {
  PENDING = 'pending',       // slot held, awaiting payment
  CONFIRMED = 'confirmed',   // payment completed, awaiting owner acceptance
  APPROVED = 'approved',     // owner accepted the appointment
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  NO_SHOW = 'no_show',
}

export enum PaymentStatus {
  UNPAID = 'unpaid',
  PAID = 'paid',
  REFUNDED = 'refunded',
}

@Entity('bookings')
// Speeds up conflict lookups on a resource within a time window.
@Index(['resourceKey', 'startTime'])
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  customerId: string;

  // Captured at booking time so owners see who booked (not just an id).
  @Column({ nullable: true })
  customerName?: string;

  @Column()
  salonId: string;

  @Column()
  ownerId: string;

  @Column()
  serviceId: string;

  @Column()
  serviceName: string;

  // Resource being booked: `staff:<id>` or `salon:<id>` when any-staff.
  @Column()
  resourceKey: string;

  @Column({ nullable: true })
  staffId?: string;

  @Column({ type: 'timestamptz' })
  startTime: Date;

  @Column({ type: 'timestamptz' })
  endTime: Date;

  // endTime + buffer — the slot is blocked until here.
  @Column({ type: 'timestamptz' })
  blockedUntil: Date;

  @Column({ type: 'int' })
  durationMinutes: number;

  @Column({ type: 'int', default: 0 })
  bufferMinutes: number;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  price: number;

  @Column({ default: 'LKR' })
  currency: string;

  @Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.PENDING })
  status: BookingStatus;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.UNPAID })
  paymentStatus: PaymentStatus;

  // Deadline for the pending payment window; past this the slot auto-releases.
  @Column({ type: 'timestamptz', nullable: true })
  paymentDeadline?: Date | null;

  // Redis slot-lock handle so we can release it on confirm/cancel/timeout.
  @Column({ nullable: true })
  lockKey?: string;

  @Column({ nullable: true })
  lockToken?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
