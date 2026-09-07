/**
 * Typed view over the validated environment.
 *
 * Every consumer reads config through `ConfigService.get('app.…')` rather than
 * touching `process.env` directly, so the parsing (`PORT` to a number,
 * `CORS_ORIGIN` to a list) happens in exactly one place.
 */
export interface AppConfig {
  nodeEnv: string;
  port: number;
  corsOrigin: string[];
}

export interface DatabaseConfig {
  uri: string;
}

export interface AuthConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  bcryptRounds: number;
}

/**
 * Limits that protect the process itself, as opposed to any one feature.
 *
 * Every one of these is a number somebody will want to change per deployment
 * without a release — a burst of legitimate traffic behind one office IP, a
 * proxy hop count that differs between platforms — so they are environment
 * variables with defensible defaults rather than constants.
 */
export interface SecurityConfig {
  /** Window and allowance for the general limiter. */
  rateLimitTtlMs: number;
  rateLimitCount: number;
  /** The same, for sign-in attempts, which want to be far stricter. */
  authRateLimitTtlMs: number;
  authRateLimitCount: number;
  /**
   * How many reverse proxies sit in front of this process.
   *
   * Wrong in either direction breaks the rate limiter: too low and every
   * request looks like it came from the proxy, so one caller can exhaust the
   * allowance for everyone; too high and a caller can forge
   * `X-Forwarded-For` and get a fresh allowance per request.
   */
  trustProxyHops: number;
  /** Largest request body accepted, as a `bytes`-style string. */
  bodyLimit: string;
}

/** Defaults for a paginated list endpoint. */
export interface PaginationConfig {
  defaultLimit: number;
  /** A ceiling the caller cannot raise, whatever `?limit=` says. */
  maxLimit: number;
}

export interface Configuration {
  app: AppConfig;
  database: DatabaseConfig;
  auth: AuthConfig;
  security: SecurityConfig;
  pagination: PaginationConfig;
}

/** Reads an integer env var, falling back when it is absent or unparseable. */
const int = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export default (): Configuration => ({
  app: {
    nodeEnv: process.env.NODE_ENV as string,
    port: Number(process.env.PORT),
    /**
     * A comma-separated list, because a deployment usually has more than one
     * front end (local dev, preview, production) and env vars are flat strings.
     */
    corsOrigin: (process.env.CORS_ORIGIN as string)
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  },
  database: {
    uri: process.env.MONGODB_URI as string,
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET as string,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN as string,
    /**
     * Not an env var on purpose: the cost is a security property of this
     * codebase, not a per-deployment knob someone can quietly turn down.
     */
    bcryptRounds: 12,
  },
  security: {
    /** 300 a minute is far above a till's real rate and far below a flood. */
    rateLimitTtlMs: int(process.env.RATE_LIMIT_TTL_MS, 60_000),
    rateLimitCount: int(process.env.RATE_LIMIT_COUNT, 300),
    /**
     * Ten sign-in attempts in fifteen minutes. Enough that a person mistyping
     * a generated password is never locked out; far too few to work through a
     * password list.
     */
    authRateLimitTtlMs: int(process.env.AUTH_RATE_LIMIT_TTL_MS, 900_000),
    authRateLimitCount: int(process.env.AUTH_RATE_LIMIT_COUNT, 10),
    /** 0 = no proxy, which is right for local development. */
    trustProxyHops: int(process.env.TRUST_PROXY_HOPS, 0),
    /**
     * An order with a hundred lines is a few kilobytes. The default of 100kb
     * is already generous; this pins it rather than leaving it to the express
     * version in use.
     */
    bodyLimit: process.env.BODY_LIMIT ?? '256kb',
  },
  pagination: {
    defaultLimit: int(process.env.PAGE_DEFAULT_LIMIT, 50),
    maxLimit: int(process.env.PAGE_MAX_LIMIT, 200),
  },
});
