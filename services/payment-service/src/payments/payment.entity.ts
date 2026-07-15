import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PaymentState {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum PaymentMethod {
  CARD = 'card',
  WALLET = 'wallet',
  PAY_AT_SALON = 'pay_at_salon',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  bookingId: string;

  @Column()
  @Index()
  customerId: string;

  @Column()
  ownerId: string;

  @Column()
  salonId: string;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  amount: number;

  @Column({ default: 'LKR' })
  currency: string;

  // Platform commission and net payout to the salon owner.
  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  commission: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  netToOwner: number;

  @Column({ type: 'enum', enum: PaymentMethod, nullable: true })
  method?: PaymentMethod;

  @Column({ type: 'enum', enum: PaymentState, default: PaymentState.PENDING })
  state: PaymentState;

  // Reference returned by the payment gateway (tokenized; card data never stored).
  @Column({ nullable: true })
  gatewayRef?: string;

  @Column({ nullable: true })
  failureReason?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
