import { SetMetadata, type CustomDecorator } from '@nestjs/common';

export const SKIP_AUDIT_KEY = 'audit:skip';

/**
 * Keeps a mutating route out of the audit trail.
 *
 * The default is to record everything, so this exists for the narrow case
 * where a row per request would be noise that buries the signal. Use it
 * sparingly: an un-audited write is one nobody can account for later.
 *
 * It suppresses the **interceptor** only. A request refused before the handler
 * runs is still recorded by `HttpExceptionFilter`, which is deliberate: on
 * sign-in it is exactly the failures that are worth keeping, and it is the
 * successes — one per device every morning — that are the noise.
 */
export const SkipAudit = (): CustomDecorator<string> =>
  SetMetadata(SKIP_AUDIT_KEY, true);
