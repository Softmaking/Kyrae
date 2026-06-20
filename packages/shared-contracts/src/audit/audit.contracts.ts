import type { CursorPaginatedResponse } from '../common/common.contracts';

export const AuditSeverities = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL',
} as const;

export type AuditSeverity = (typeof AuditSeverities)[keyof typeof AuditSeverities];

export const AuditActions = {
  AUTH_LOGIN_SUCCESS: 'AUTH_LOGIN_SUCCESS',
  AUTH_LOGIN_FAILED: 'AUTH_LOGIN_FAILED',
  AUTH_LOGOUT: 'AUTH_LOGOUT',
  AUTH_TOKEN_REFRESH: 'AUTH_TOKEN_REFRESH',
  AUTH_INVALID_TOKEN: 'AUTH_INVALID_TOKEN',
  AUTH_INACTIVE_USER_LOGIN_ATTEMPT: 'AUTH_INACTIVE_USER_LOGIN_ATTEMPT',
  AUTH_LOCKED_USER_LOGIN_ATTEMPT: 'AUTH_LOCKED_USER_LOGIN_ATTEMPT',

  AUTHORIZATION_PERMISSION_DENIED: 'AUTHORIZATION_PERMISSION_DENIED',
  AUTHORIZATION_ROLE_ASSIGNED: 'AUTHORIZATION_ROLE_ASSIGNED',
  AUTHORIZATION_ROLE_REMOVED: 'AUTHORIZATION_ROLE_REMOVED',
  AUTHORIZATION_PERMISSION_ASSIGNED: 'AUTHORIZATION_PERMISSION_ASSIGNED',
  AUTHORIZATION_PERMISSION_REMOVED: 'AUTHORIZATION_PERMISSION_REMOVED',

  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_ACTIVATED: 'USER_ACTIVATED',
  USER_DEACTIVATED: 'USER_DEACTIVATED',
  USER_LOCKED: 'USER_LOCKED',
  USER_UNLOCKED: 'USER_UNLOCKED',

  ROLE_CREATED: 'ROLE_CREATED',
  ROLE_UPDATED: 'ROLE_UPDATED',
  ROLE_ACTIVATED: 'ROLE_ACTIVATED',
  ROLE_DEACTIVATED: 'ROLE_DEACTIVATED',

  PERMISSION_CREATED: 'PERMISSION_CREATED',
  PERMISSION_UPDATED: 'PERMISSION_UPDATED',
  PERMISSION_ACTIVATED: 'PERMISSION_ACTIVATED',
  PERMISSION_DEACTIVATED: 'PERMISSION_DEACTIVATED',

  ORGANIZATION_CREATED: 'ORGANIZATION_CREATED',
  ORGANIZATION_UPDATED: 'ORGANIZATION_UPDATED',
  ORGANIZATION_ACTIVATED: 'ORGANIZATION_ACTIVATED',
  ORGANIZATION_DEACTIVATED: 'ORGANIZATION_DEACTIVATED',
  USER_ASSIGNED_TO_ORGANIZATION: 'USER_ASSIGNED_TO_ORGANIZATION',
  USER_REMOVED_FROM_ORGANIZATION: 'USER_REMOVED_FROM_ORGANIZATION',
  UNAUTHORIZED_ORGANIZATION_ACCESS: 'UNAUTHORIZED_ORGANIZATION_ACCESS',

  BRANCH_CREATED: 'BRANCH_CREATED',
  BRANCH_UPDATED: 'BRANCH_UPDATED',
  BRANCH_ACTIVATED: 'BRANCH_ACTIVATED',
  BRANCH_DEACTIVATED: 'BRANCH_DEACTIVATED',
  USER_ASSIGNED_TO_BRANCH: 'USER_ASSIGNED_TO_BRANCH',
  USER_REMOVED_FROM_BRANCH: 'USER_REMOVED_FROM_BRANCH',
  UNAUTHORIZED_BRANCH_ACCESS: 'UNAUTHORIZED_BRANCH_ACCESS',

  CONFIGURATION_UPDATED: 'CONFIGURATION_UPDATED',
} as const;

export type AuditAction = (typeof AuditActions)[keyof typeof AuditActions];

export type AuditResourceType =
  | 'AUTH'
  | 'USER'
  | 'ROLE'
  | 'PERMISSION'
  | 'ORGANIZATION'
  | 'BRANCH'
  | 'CONFIGURATION';

export interface AuditEventDto {
  id: string;
  action: AuditAction | string;
  actorUserId: string | null;
  actorUserEmail?: string | null;
  actorUserName?: string | null;
  targetUserId: string | null;
  targetUserEmail?: string | null;
  targetUserName?: string | null;
  resourceType: AuditResourceType | string | null;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  severity: AuditSeverity | null;
  createdAt: string;
}

export interface CreateAuditEventCommand {
  action: AuditAction | string;
  actorUserId?: string;
  targetUserId?: string;
  resourceType?: AuditResourceType | string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  severity?: AuditSeverity;
}

export interface ListAuditEventsQuery {
  action?: AuditAction | string;
  actorUserId?: string;
  targetUserId?: string;
  resourceType?: AuditResourceType | string;
  resourceId?: string;
  dateFrom?: string;
  dateTo?: string;
  severity?: AuditSeverity;
  limit?: number;
  cursor?: string;
}

export type ListAuditEventsResponse = CursorPaginatedResponse<AuditEventDto>;
