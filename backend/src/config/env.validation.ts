import { plainToInstance, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

/** The environments the app is ever started in. */
export enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

/**
 * The shape of `process.env` this app requires.
 *
 * Validated once at boot rather than read defensively at each call site: a
 * missing `MONGODB_URI` should stop the process immediately, not surface as a
 * connection error on the first request.
 */
export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  NODE_ENV!: NodeEnv;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT!: number;

  /**
   * Not `@IsUrl()` — `mongodb+srv://` is not an http(s) URL and the validator
   * rejects it. The driver is the authority on the format; this only pins that
   * the scheme is a Mongo one and the value is present.
   */
  @IsString()
  @IsNotEmpty()
  MONGODB_URI!: string;

  /** Comma-separated list of allowed browser origins. */
  @IsString()
  @IsNotEmpty()
  CORS_ORIGIN!: string;

  /**
   * Signing key for access tokens. A short secret is a guessable secret, so a
   * floor is enforced here rather than left to whoever writes the `.env`.
   */
  @IsString()
  @MinLength(32, { message: 'JWT_SECRET must be at least 32 characters.' })
  JWT_SECRET!: string;

  /** Any `ms`-style duration: `15m`, `12h`, `7d`. */
  @IsString()
  @IsNotEmpty()
  JWT_EXPIRES_IN!: string;
}

/**
 * Passed to `ConfigModule.forRoot({ validate })`. Throws — and so aborts the
 * boot — if anything is missing or malformed.
 */
export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: false,
    excludeExtraneousValues: false,
  });

  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    const details = errors
      .map((e) => `  - ${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }

  if (!/^mongodb(\+srv)?:\/\//.test(validated.MONGODB_URI)) {
    throw new Error(
      'Invalid environment configuration:\n  - MONGODB_URI: must start with mongodb:// or mongodb+srv://',
    );
  }

  return validated;
}
