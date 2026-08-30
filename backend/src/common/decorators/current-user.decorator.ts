import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { JwtPayload } from '../../modules/auth/auth.service';
import type { AuthenticatedRequest } from '../guards/jwt-auth.guard';

/**
 * The verified token payload, for handlers behind `JwtAuthGuard`.
 *
 * Reading identity from here rather than from a route param is what stops a
 * courier asking for another courier's deliveries — the id comes from the
 * signature, not from the URL.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): JwtPayload => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user as JwtPayload;
  },
);
