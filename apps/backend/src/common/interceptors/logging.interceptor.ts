import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const now = Date.now();
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<{
      method: string;
      originalUrl?: string;
      url?: string;
      headers?: Record<string, string | string[] | undefined>;
      user?: { sub?: string };
    }>();
    const response = httpContext.getResponse<{ statusCode: number }>();

    return next.handle().pipe(
      tap({
        next: () => {
          this.logRequest(request, response.statusCode, Date.now() - now);
        },
        error: (error: unknown) => {
          this.logRequest(
            request,
            this.getErrorStatusCode(error, response.statusCode),
            Date.now() - now,
            this.getErrorName(error)
          );
        },
      })
    );
  }

  private logRequest(
    request: {
      method: string;
      originalUrl?: string;
      url?: string;
      headers?: Record<string, string | string[] | undefined>;
      user?: { sub?: string };
    },
    statusCode: number,
    durationMs: number,
    error?: string
  ): void {
    const payload = {
      method: request.method,
      path: request.originalUrl ?? request.url,
      statusCode,
      durationMs,
      correlationId: request.headers?.['x-correlation-id'],
      userId: request.user?.sub,
      error,
    };

    if (error) {
      this.logger.error(JSON.stringify(payload));
      return;
    }

    this.logger.log(JSON.stringify(payload));
  }

  private getErrorStatusCode(error: unknown, fallbackStatusCode: number): number {
    if (error instanceof HttpException) {
      return error.getStatus();
    }

    return fallbackStatusCode >= 400 ? fallbackStatusCode : 500;
  }

  private getErrorName(error: unknown): string {
    if (error instanceof Error) {
      return error.name;
    }

    return 'UnknownError';
  }
}
