import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { JwtPayload } from '../../modules/auth/auth.service';

/** What the guard attaches to the request once a token checks out. */
export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

/**
 * Verifies the bearer token and puts its payload on the request.
 *
 * No Passport: one header to read and one signature to verify does not need a
 * strategy layer, and the dependency surface stays smaller.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
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
