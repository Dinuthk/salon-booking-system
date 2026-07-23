import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

export type LoyaltyTier = 'bronze' | 'silver' | 'gold' | 'platinum';

@Entity('loyalty_accounts')
export class LoyaltyAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  customerId: string;

  @Column({ type: 'int', default: 0 })
  points: number; // current spendable balance

  @Column({ type: 'int', default: 0 })
  lifetimePoints: number; // used to compute tier

  @Column({ default: 'bronze' })
  tier: LoyaltyTier;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('loyalty_entries')
// One earn / one reverse per booking — makes event handling idempotent.
@Unique(['bookingId', 'type'])
export class LoyaltyEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  customerId: string;

  @Column()
  @Index()
  bookingId: string;

  @Column()
  type: 'earn' | 'reverse' | 'adjust';

  @Column({ type: 'int' })
  points: number; // signed: +earn, -reverse

  @Column()
  reason: string;

  @CreateDateColumn()
  createdAt: Date;
}
