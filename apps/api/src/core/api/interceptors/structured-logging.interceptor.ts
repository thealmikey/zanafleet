import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

/**
 * Structured log entry format for HTTP requests
 */
export interface StructuredLogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  workspaceId?: string;
  actorId?: string;
  correlationId: string;
  requestId?: string;
  context: string;
  method: string;
  path: string;
  statusCode?: number;
  durationMs?: number;
  message: string;
}

/**
 * Request user context extracted from JWT/API key
 */
interface RequestUser {
  actorId?: string;
  workspaceId?: string;
  type?: string;
}

/**
 * Typed request interface
 */
interface TypedRequest {
  method: string;
  url: string;
  headers: Record<string, string | string[] | undefined>;
  user?: RequestUser;
}

/**
 * Typed response interface
 */
interface TypedResponse {
  statusCode: number;
  setHeader: (key: string, value: string) => void;
}

/**
 * StructuredLoggingInterceptor
 *
 * Provides comprehensive structured logging for all HTTP requests.
 * Extracts tenant context (workspaceId, actorId) from request user.
 * Generates or extracts correlationId for distributed tracing.
 */
@Injectable()
export class StructuredLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<TypedRequest>();
    const response = context.switchToHttp().getResponse<TypedResponse>();
    
    const startTime = Date.now();
    const method = request.method;
    const path = request.url;
    const requestId = request.headers['x-request-id'] as string | undefined;
    
    // Extract correlation ID from headers or generate new one
    const correlationId = (request.headers['x-correlation-id'] as string | undefined) 
      || (request.headers['x-request-id'] as string | undefined) 
      || uuidv4();
    
    // Extract tenant context from authenticated user
    const user = request.user;
    const workspaceId = user?.workspaceId;
    const actorId = user?.actorId;
    
    // Set correlation ID header on response
    response.setHeader('X-Correlation-ID', correlationId);

    const logContext = {
      correlationId,
      requestId,
      method,
      path,
      workspaceId,
      actorId,
    };

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Date.now() - startTime;
          const statusCode = response.statusCode;
          
          const entry: StructuredLogEntry = {
            timestamp: new Date().toISOString(),
            level: statusCode >= 400 ? 'warn' : 'info',
            statusCode,
            durationMs,
            context: 'HTTP',
            message: `${method} ${path} ${statusCode} - ${durationMs}ms`,
            ...logContext,
          };
          
          this.logStructured(entry);
        },
        error: (error: Error) => {
          const durationMs = Date.now() - startTime;
          
          const entry: StructuredLogEntry = {
            timestamp: new Date().toISOString(),
            level: 'error',
            statusCode: response.statusCode || 500,
            durationMs,
            context: 'HTTP',
            message: `${method} ${path} ERROR - ${durationMs}ms: ${error.message}`,
            ...logContext,
          };
          
          this.logStructured(entry);
        },
      }),
    );
  }

  private logStructured(entry: StructuredLogEntry): void {
    // Log as JSON for machine parsing
    const logMessage = JSON.stringify(entry);
    
    switch (entry.level) {
      case 'error':
        this.logger.error(logMessage);
        break;
      case 'warn':
        this.logger.warn(logMessage);
        break;
      case 'debug':
        this.logger.debug(logMessage);
        break;
      default:
        this.logger.log(logMessage);
    }
  }
}

/**
 * Helper function to create a structured log entry in services/handlers
 */
export function createStructuredLog(
  context: string,
  message: string,
  options: {
    level?: 'info' | 'warn' | 'error' | 'debug';
    workspaceId?: string;
    actorId?: string;
    correlationId?: string;
    requestId?: string;
    additionalFields?: Record<string, unknown>;
  } = {},
): StructuredLogEntry {
  return {
    timestamp: new Date().toISOString(),
    level: options.level || 'info',
    workspaceId: options.workspaceId,
    actorId: options.actorId,
    correlationId: options.correlationId || uuidv4(),
    requestId: options.requestId,
    context,
    method: '',
    path: '',
    message,
    ...options.additionalFields,
  };
}