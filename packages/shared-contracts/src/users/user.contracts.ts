import type { AuthProvider } from '../auth/auth.contracts';

export const UserStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  LOCKED: 'LOCKED',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
} as const;

export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export interface UserRoleSummaryDto {
  id: string;
  name: string;
}

export interface UserDto {
  id: string;
  email: string;
  firstName: string;
  firstSurname: string;
  secondSurname?: string;
  rut?: string;
  fullName: string;
  isActive: boolean;
  provider?: AuthProvider;
  roles: UserRoleSummaryDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserCommand {
  email: string;
  firstName: string;
  firstSurname: string;
  secondSurname?: string;
  rut?: string;
  password: string;
  isActive?: boolean;
  provider?: AuthProvider;
  roleIds?: string[];
}

export interface UpdateUserCommand extends Partial<CreateUserCommand> {}
