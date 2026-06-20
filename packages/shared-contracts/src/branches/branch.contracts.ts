export interface BranchOrganizationSummaryDto {
  id: string;
  code: string;
  name: string;
}

export interface BranchUserRoleSummaryDto {
  id: string;
  name: string;
}

export interface BranchUserDto {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  roles?: BranchUserRoleSummaryDto[];
}

export interface BranchDto {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  organization?: BranchOrganizationSummaryDto;
}

export interface CreateBranchCommand {
  organizationId: string;
  code: string;
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateBranchCommand extends Partial<Omit<CreateBranchCommand, 'organizationId'>> {}

export interface ListBranchesQuery {
  organizationId?: string;
}

export interface UserBranchDto {
  userId: string;
  branchId: string;
}

export interface AssignUserToBranchCommand {
  userId: string;
}
