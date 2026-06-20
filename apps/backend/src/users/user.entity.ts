import type { AuthProvider } from '@kyrae/shared-contracts';
import {
  AfterLoad,
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from '../roles/role.entity';
import { UserOrganization } from '../organizations/user-organization.entity';
import { UserBranch } from '../branches/user-branch.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true, length: 180 })
  email!: string;

  @Column({ type: 'varchar', length: 100 })
  firstName!: string;

  @Column({ type: 'varchar', length: 100 })
  firstSurname!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  secondSurname?: string | null;

  @Column({ type: 'varchar', length: 12, nullable: true, unique: true })
  rut?: string | null;

  fullName!: string;

  @Column({ type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'varchar', length: 20, default: 'LOCAL' })
  provider!: AuthProvider;

  @Column({ name: 'failed_login_attempts', type: 'int', default: 0 })
  failedLoginAttempts!: number;

  @Column({ name: 'locked_until', type: 'timestamp', nullable: true })
  lockedUntil?: Date | null;

  @Column({ type: 'varchar', nullable: true, length: 255 })
  refreshTokenHash?: string | null;

  @ManyToMany(() => Role, (role) => role.users, { eager: true })
  @JoinTable({
    name: 'users_roles',
    joinColumn: { name: 'userId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'roleId', referencedColumnName: 'id' },
  })
  roles!: Role[];

  @OneToMany(() => UserOrganization, (uo) => uo.user)
  userOrganizations!: UserOrganization[];

  @OneToMany(() => UserBranch, (ub) => ub.user)
  userBranches!: UserBranch[];

  @AfterLoad()
  computeFullName(): void {
    this.fullName = [this.firstName, this.firstSurname, this.secondSurname]
      .filter(Boolean)
      .join(' ');
  }

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
