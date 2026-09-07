import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { JwtPayload } from '../../modules/auth/auth.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/** What the guard attaches to the request once a token checks out. */
export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
  /**
   * Set by `AuditInterceptor` once it has written a row.
   *
   * `HttpExceptionFilter` records writes that were refused before ever
   * reaching the interceptor — guards run first, so a 403 never gets there.
   * This flag is how the two avoid both recording the same request.
   */
  auditRecorded?: boolean;
}

/**
 * Verifies the bearer token and puts its payload on the request.
 *
 * No Passport: one header to read and one signature to verify does not need a
 * strategy layer, and the dependency surface stays smaller.
 *
 * Registered **globally** in `AppModule`, so every route requires a token
 * unless it is marked `@Public()`. It was previously applied route by route,
 * which meant the default was "open" and all but two endpoints had quietly
 * taken it — the whole customer directory and `DELETE /payments` among them.
 * Inverting the default is the fix: forgetting a decorator now closes a route
 * rather than opening one.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    /** Handler first, then controller — a class-level mark covers its routes. */
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = JwtAuthGuard.extract(request);

    if (!token) {
      throw new UnauthorizedException('Authentication is required.');
    }

    try {
      request.user = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      /** Expired and forged tokens are the same answer to the caller. */
      throw new UnauthorizedException('Session is invalid or has expired.');
    }

    return true;
  }

  private static extract(request: Request): string | undefined {
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    return scheme?.toLowerCase() === 'bearer' ? token : undefined;
  }
}
