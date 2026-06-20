export interface OrganizationDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationUserRoleSummaryDto {
  id: string;
  name: string;
}

export interface OrganizationUserDto {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  roles?: OrganizationUserRoleSummaryDto[];
}

export interface CreateOrganizationCommand {
  code: string;
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateOrganizationCommand extends Partial<CreateOrganizationCommand> {}

export interface UserOrganizationDto {
  userId: string;
  organizationId: string;
}

export interface AssignUserToOrganizationCommand {
  userId: string;
}
