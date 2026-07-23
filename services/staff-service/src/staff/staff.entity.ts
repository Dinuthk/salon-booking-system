import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('staff')
export class Staff {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  ownerId: string;

  @Column()
  @Index()
  salonId: string;

  @Column()
  name: string;

  @Column({ default: 'Stylist' })
  title: string;

  // Services this staff member can perform (service ids or names).
  @Column({ type: 'simple-array', default: '' })
  skills: string[];

  // Weekdays worked, e.g. ["mon","tue","wed"].
  @Column({ type: 'simple-array', default: 'mon,tue,wed,thu,fri' })
  workingDays: string[];

  // Approved leave ranges.
  @Column({ type: 'jsonb', default: () => "'[]'" })
  leave: { from: string; to: string; reason?: string }[];

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
