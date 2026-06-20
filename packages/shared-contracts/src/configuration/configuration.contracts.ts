import type { PaginatedResponse } from '../common/common.contracts';

export type AppConfigValue = string | number | boolean | Record<string, unknown>;

export interface AppConfigDto {
  id: string;
  key: string;
  value: AppConfigValue;
  description: string | null;
  isActive: boolean;
  category: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppConfigCommand {
  key: string;
  value: AppConfigValue;
  description?: string;
  isActive?: boolean;
  category?: string;
}

export type UpdateAppConfigCommand = Partial<CreateAppConfigCommand>;

export interface ListAppConfigsQuery {
  category?: string;
  isActive?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

export type ListAppConfigsResponse = PaginatedResponse<AppConfigDto>;
