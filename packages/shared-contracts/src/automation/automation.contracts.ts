export type AutomationScheduleStatus = 'active' | 'inactive';

export type NotifyMode = 'always' | 'on_content' | 'silent';

export interface AutomationScheduleDto {
  id: string;
  userId: string;
  automationKey: string;
  title: string;
  instruction: string;
  cronExpression: string;
  isActive: boolean;
  notifyMode: NotifyMode;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAutomationScheduleCommand {
  userId?: string;
  automationKey: string;
  title: string;
  instruction: string;
  cronExpression: string;
  isActive?: boolean;
  notifyMode?: NotifyMode;
}

export type UpdateAutomationScheduleCommand = Partial<CreateAutomationScheduleCommand>;

export interface ListAutomationSchedulesQuery {
  isActive?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

export type ListAutomationSchedulesResponse = {
  data: AutomationScheduleDto[];
  total: number;
  page: number;
  pageSize: number;
};
