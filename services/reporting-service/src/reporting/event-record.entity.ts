import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

/**
 * Append-only projection of domain events, attributed to an owner/salon.
 * Dashboards are computed from this table (the analytics read model).
 */
@Entity('event_records')
@Unique(['bookingId', 'type']) // idempotent under event redelivery
@Index(['ownerId', 'type'])
export class EventRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  type: string; // booking_pending | booking_confirmed | booking_completed | booking_cancelled | booking_no_show

  @Column({ nullable: true })
  ownerId?: string;

  @Column({ nullable: true })
  salonId?: string;

  @Column({ nullable: true })
  customerId?: string;

  @Column({ nullable: true })
  bookingId?: string;

  @Column({ nullable: true })
  serviceName?: string;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  amount: number;

  @CreateDateColumn()
  occurredAt: Date;
}
