import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuditService } from '../../modules/audit/audit.service';
import type { AuthenticatedRequest } from '../guards/jwt-auth.guard';

/** The single error shape every failed request comes back in. */
export interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  path: string;
  timestamp: string;
}

/** Verbs that change something, and so are worth recording when refused. */
const MUTATIONS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

/**
 * Catches everything, not just `HttpException`, so an unexpected throw leaves
 * the same JSON shape as a deliberate one — a client should never have to
 * parse two different error formats.
 *
 * Non-HTTP errors are logged with their stack and reported as a bare 500: the
 * internals of an unhandled failure are not the caller's business.
 *
 * **It is also the audit trail's backstop.** Nest runs guards *before*
 * interceptors, so a request refused by `RolesGuard` or the rate limiter never
 * reaches `AuditInterceptor` at all — which would have left "a courier tried to
 * delete a payment" out of the very trail that exists to answer it. A filter
 * does see those, because it sees every response that leaves as an error.
 *
 * The interceptor marks requests it has already recorded, so the two cannot
 * both write a row for the same request.
 */
@Injectable()
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly audit: AuditService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      const body = exception.getResponse();

      if (typeof body === 'string') {
        message = body;
        error = exception.name;
      } else {
        const shape = body as { message?: string | string[]; error?: string };
        message = shape.message ?? exception.message;
        error = shape.error ?? exception.name;
      }
    } else {
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    this.recordRefusal(request as AuthenticatedRequest, status, message);

    const payload: ErrorResponse = {
      statusCode: status,
      message,
      error,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(payload);
  }

  /**
   * Record a refused write, unless the interceptor already recorded it.
   *
   * Only mutations: a rejected `GET` is a failed read, and a row for every one
   * of those would bury the writes that matter under noise from an expired
   * token on a polling dashboard.
   */
  private recordRefusal(
    request: AuthenticatedRequest,
    statusCode: number,
    message: string | string[],
  ): void {
    if (!MUTATIONS.has(request.method)) return;
    if (request.auditRecorded) return;

    void this.audit.record({
      actorId: request.user?.sub ?? 'anonymous',
      actorEmail: request.user?.email ?? 'anonymous',
      actorRole: request.user?.role,
      action: 'refused',
      resource: request.path.replace(/^\/api\//, '').split('/')[0] || 'root',
      method: request.method,
      path: request.path,
      statusCode,
      ip: request.ip ?? '',
      userAgent: request.get?.('user-agent') ?? '',
      /**
       * No payload on a refusal.
       *
       * A rejected sign-in body is a password somebody typed, and writing it
       * down is the one thing this trail must never do. The refusals worth
       * investigating are answered by who, what and when — the body adds
       * nothing here that is worth that risk.
       */
      error: Array.isArray(message) ? message.join(' ') : message,
    });
  }
}
