import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('automation_schedules')
@Index('idx_automation_schedules_user_id', ['userId'])
@Index('idx_automation_schedules_is_active', ['isActive'])
export class AutomationSchedule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_automation_schedules_automation_key', { unique: true })
  @Column({ name: 'automation_key', type: 'varchar', length: 120 })
  automationKey!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'varchar', length: 180 })
  title!: string;

  @Column({ type: 'text' })
  instruction!: string;

  @Column({ name: 'cron_expression', type: 'varchar', length: 100 })
  cronExpression!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'last_run_at', type: 'timestamp', nullable: true })
  lastRunAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
