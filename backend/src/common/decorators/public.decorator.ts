import { SetMetadata, type CustomDecorator } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'auth:public';

/**
 * Opts a route out of authentication.
 *
 * Authentication is a **global** guard, so the default for every route in the
 * application is "a valid token is required". That is the only default that
 * fails safe: a new controller added next month is protected because nobody
 * did anything, rather than exposed because somebody forgot a `@UseGuards`.
 *
 * The handful of routes that genuinely cannot require a token — signing in,
 * registering the first account, the liveness probe — say so here, in one
 * visible line, where a reviewer can count them.
 */
export const Public = (): CustomDecorator<string> =>
  SetMetadata(IS_PUBLIC_KEY, true);
