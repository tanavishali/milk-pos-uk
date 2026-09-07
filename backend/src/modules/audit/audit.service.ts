import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema';

/** Field names whose values never reach the trail, at any nesting depth. */
const REDACTED_KEYS = new Set([
  'password',
  'newpassword',
  'currentpassword',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'secret',
]);

const REDACTED = '[redacted]';

/**
 * Strip credentials out of a request body before it is written down.
 *
 * Recursive, and keyed on the field name rather than on a list of known
 * endpoints: the interceptor records *every* mutation, including ones added
 * later by someone who has never read this file, so the safe default has to be
 * "any field called password is redacted wherever it appears".
 */
export function redact(value: unknown, depth = 0): unknown {
  /** A guard against a cyclic or pathological body, not a real limit. */
  if (depth > 6) return REDACTED;

  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        REDACTED_KEYS.has(key.toLowerCase()) ? REDACTED : redact(item, depth + 1),
      ]),
    );
  }

  return value;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectModel(AuditLog.name)
    private readonly logs: Model<AuditLogDocument>,
  ) {}

  /**
   * Write one row.
   *
   * **Never throws.** This is called after the response has already been
   * decided, so a failure here must not turn a successful order into a 500 for
   * the operator standing at the till. A trail that can break the thing it is
   * observing is worse than no trail. The failure is logged loudly instead, so
   * a broken audit path is visible rather than silent.
   */
  async record(entry: Partial<AuditLog>): Promise<void> {
    try {
      await this.logs.create({
        ...entry,
        payload: entry.payload
          ? (redact(entry.payload) as Record<string, unknown>)
          : undefined,
      });
    } catch (error) {
      this.logger.error(
        `Failed to write audit row for ${entry.method} ${entry.path}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
