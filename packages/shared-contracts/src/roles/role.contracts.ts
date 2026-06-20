export interface RolePermissionSummaryDto {
  id: string;
  name: string;
}

export interface RoleDto {
  id: string;
  name: string;
  description: string | null;
  permissions: RolePermissionSummaryDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoleCommand {
  name: string;
  description?: string;
  permissionIds?: string[];
}

export type UpdateRoleCommand = Partial<CreateRoleCommand>;
