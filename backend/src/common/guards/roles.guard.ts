import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserRole } from '../enums';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AuthenticatedRequest } from './jwt-auth.guard';

/**
 * Enforces `@Roles()`.
 *
 * Registered globally **after** `JwtAuthGuard`, so by the time this runs the
 * request either carries a verified payload or has already been rejected. The
 * role is read from that payload and never from the request — a header or a
 * body field naming a role would be the client granting itself one.
 *
 * A route with no `@Roles()` metadata passes: authentication was still
 * required, this only narrows it further.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    /** A public route has no user to check a role against. */
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const allowed = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!allowed || allowed.length === 0) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const role = request.user?.role;

    if (!role || !allowed.includes(role)) {
      /**
       * 403 and not 404: the caller is authenticated, and pretending the route
       * does not exist would only make a real permissions problem look like a
       * bug in the client.
       */
      throw new ForbiddenException(
        'This account does not have access to that.',
      );
    }

    return true;
  }
}
