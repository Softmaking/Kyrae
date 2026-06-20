export interface ApiErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  details?: unknown;
}

export interface CommandResponse {
  success: boolean;
}

export interface HealthResponseDto {
  status: 'ok';
  timestamp: string;
}

export interface ReadinessResponseDto {
  status: 'ok';
  checks: {
    database: 'up';
  };
  timestamp: string;
}

export interface ReadinessErrorResponseDto {
  status: 'error';
  checks: {
    database: 'down';
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CursorPaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}
