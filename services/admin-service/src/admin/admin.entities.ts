import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('commission_config')
export class CommissionConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, default: 'platform' })
  scope: string; // 'platform' — single global config for now

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 10 })
  pct: number;

  @UpdateDateColumn()
  updatedAt: Date;
}

export type DisputeStatus = 'open' | 'investigating' | 'resolved' | 'rejected';

@Entity('disputes')
export class Dispute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  bookingId: string;

  @Column()
  filedBy: string; // customerId

  @Column()
  reason: string;

  @Column({ default: 'open' })
  status: DisputeStatus;

  @Column({ nullable: true })
  resolution?: string;

  @Column({ default: false })
  refundIssued: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
