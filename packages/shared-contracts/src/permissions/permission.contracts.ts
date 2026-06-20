export const PermissionScope = {
  GLOBAL: 'GLOBAL',
  ORGANIZATION: 'ORGANIZATION',
  BRANCH: 'BRANCH',
} as const;

export type PermissionScope = (typeof PermissionScope)[keyof typeof PermissionScope];

export interface PermissionDto {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePermissionCommand {
  name: string;
  description?: string;
}

export type UpdatePermissionCommand = Partial<CreatePermissionCommand>;
