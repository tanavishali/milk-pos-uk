import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import { Observable, tap } from 'rxjs';
import { SKIP_AUDIT_KEY } from '../../common/decorators/skip-audit.decorator';
import type { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard';
import { AuditService } from './audit.service';

/** HTTP verbs that change something. `GET` and `HEAD` are not recorded. */
const MUTATIONS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

/** The verb, in the terms the trail is read in. */
const ACTIONS: Record<string, string> = {
  POST: 'create',
  PATCH: 'update',
  PUT: 'update',
  DELETE: 'delete',
};

/**
 * Records every mutating request.
 *
 * Registered globally rather than per controller, for the same reason the auth
 * guard is: a route added next month is covered because nobody did anything,
 * not exposed because somebody forgot. Routes that genuinely should not be
 * recorded opt out with `@SkipAudit()`, and there is exactly one — sign-in,
 * which is high-volume and whose interesting half (the failures) is worth
 * recording separately rather than on every successful login.
 *
 * Runs on the way *out*, so the row carries the outcome. A trail that records
 * intent rather than result cannot distinguish a deletion from an attempted
 * one.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly audit: AuditService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!MUTATIONS.has(request.method)) return next.handle();

    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_AUDIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skip) return next.handle();

    const started = Date.now();

    return next.handle().pipe(
      tap({
        next: (body) => {
          const response = context.switchToHttp().getResponse<Response>();
          void this.write(request, started, response.statusCode, body);
        },
        error: (error: unknown) => {
          const status =
            error instanceof HttpException
              ? error.getStatus()
              : HttpStatus.INTERNAL_SERVER_ERROR;

          void this.write(
            request,
            started,
            status,
            undefined,
            error instanceof Error ? error.message : String(error),
          );
        },
      }),
    );
  }

  private write(
    request: AuthenticatedRequest,
    started: number,
    statusCode: number,
    body?: unknown,
    error?: string,
  ): Promise<void> {
    const user = request.user;

    /**
     * Claim the request before writing, so `HttpExceptionFilter` does not also
     * record it. The filter is the backstop for writes refused by a guard,
     * which never reach this interceptor at all.
     */
    request.auditRecorded = true;

    return this.audit.record({
      /**
       * `anonymous` rather than omitting the field. A rejected write by
       * somebody with no valid token is one of the few things a trail is read
       * to find, and a nullable actor makes that query awkward for no gain.
       */
      actorId: user?.sub ?? 'anonymous',
      actorEmail: user?.email ?? 'anonymous',
      actorRole: user?.role,
      action: ACTIONS[request.method] ?? request.method.toLowerCase(),
      resource: AuditInterceptor.resourceOf(request.path),
      resourceId: AuditInterceptor.idOf(request, body),
      method: request.method,
      path: request.path,
      statusCode,
      ip: request.ip ?? '',
      userAgent: request.get?.('user-agent') ?? '',
      durationMs: Date.now() - started,
      payload: request.body as Record<string, unknown> | undefined,
      error,
    });
  }

  /** `/api/payments/PAY-101` → `payments`. */
  private static resourceOf(path: string): string {
    return path.replace(/^\/api\//, '').split('/')[0] || 'root';
  }

  /**
   * The row that was affected.
   *
   * A route parameter names it for an update or a delete; a create only learns
   * its id from the response, so the body is consulted as a fallback. Both are
   * best-effort — the path is recorded regardless, so a missing id costs
   * precision in a query, not the record itself.
   */
  private static idOf(request: AuthenticatedRequest, body: unknown): string | undefined {
    const params = request.params as Record<string, string> | undefined;
    const fromRoute = params?.id ?? params?.customerId;

    if (fromRoute) return fromRoute;

    if (body && typeof body === 'object' && 'id' in body) {
      const id = (body as { id: unknown }).id;
      if (typeof id === 'string') return id;
    }

    return undefined;
  }
}
