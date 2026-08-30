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

export interface Configuration {
  app: AppConfig;
  database: DatabaseConfig;
  auth: AuthConfig;
}

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
});
