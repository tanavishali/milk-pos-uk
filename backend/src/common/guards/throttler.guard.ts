import { Injectable, type ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, type ThrottlerLimitDetail } from '@nestjs/throttler';
import type { AuthenticatedRequest } from './jwt-auth.guard';

/**
 * Rate limiting, keyed by account where there is one and by address otherwise.
 *
 * The stock guard keys purely on IP, which is wrong in both directions here:
 *
 * - **Everyone in one shop shares an address.** A till, a back-office laptop
 *   and three drivers' phones on the same line are one IP, so an IP-keyed
 *   allowance is really a per-shop allowance divided by however many people
 *   are working. A signed-in caller has an account id, which is a much better
 *   answer to "who is this" than the address they happen to sit behind.
 * - **An unauthenticated caller has no account.** For them the address is all
 *   there is — and that is precisely the caller the limiter exists for.
 *
 * So: account id when the request is authenticated, address when it is not.
 * The `user:` / `ip:` prefixes keep the two key spaces apart, so a value in one
 * can never collide with a value in the other.
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected override getTracker(req: Record<string, unknown>): Promise<string> {
    const request = req as unknown as AuthenticatedRequest;
    const sub = request.user?.sub;

    if (sub) return Promise.resolve(`user:${sub}`);

    /**
     * `req.ip` is only meaningful because `trust proxy` is set from the real
     * hop count in `main.ts`. Left at the default behind a proxy, every
     * request reports the proxy's address and the whole world shares one
     * bucket.
     */
    return Promise.resolve(`ip:${request.ip ?? 'unknown'}`);
  }

  /**
   * What a blocked caller is told.
   *
   * A bare "ThrottlerException: Too Many Requests" reads like an outage to
   * whoever is standing at the till. Naming the wait turns it into something
   * they can act on.
   */
  protected override getErrorMessage(
    _context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<string> {
    const seconds = Math.max(1, Math.ceil(detail.timeToExpire));

    return Promise.resolve(
      `Too many requests. Try again in ${seconds} second${seconds === 1 ? '' : 's'}.`,
    );
  }

  /** Swagger's own assets are not API surface and should not cost an allowance. */
  protected override shouldSkip(context: ExecutionContext): Promise<boolean> {
    const path = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest | undefined>()?.path;

    if (path?.startsWith('/api/docs')) return Promise.resolve(true);

    return super.shouldSkip(context);
  }
}
