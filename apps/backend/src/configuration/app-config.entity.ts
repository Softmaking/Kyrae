import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { AppConfigValue } from '@kyrae/shared-contracts';

@Entity('app_config')
export class AppConfig {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true, length: 100 })
  key!: string;

  @Column({ type: 'jsonb' })
  value!: AppConfigValue;

  @Column({ type: 'varchar', nullable: true, length: 255 })
  description?: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'varchar', nullable: true, length: 60 })
  category?: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
