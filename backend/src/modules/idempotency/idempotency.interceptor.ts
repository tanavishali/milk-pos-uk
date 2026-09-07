import {
  BadRequestException,
  CallHandler,
  ConflictException,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { createHash } from 'node:crypto';
import { Model } from 'mongoose';
import type { Response } from 'express';
import { Observable, from, of, switchMap, tap } from 'rxjs';
import { IDEMPOTENT_KEY } from '../../common/decorators/idempotent.decorator';
import type { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard';
import {
  IdempotencyRecord,
  IdempotencyRecordDocument,
  IdempotencyState,
} from './schemas/idempotency-record.schema';

/** The header a client sends its key in. The conventional spelling. */
export const IDEMPOTENCY_HEADER = 'idempotency-key';

/** Mongo's duplicate-key error. The whole mechanism turns on catching it. */
const DUPLICATE_KEY = 11000;

/**
 * Makes a write safe to retry.
 *
 * Applied to the two routes where a duplicate costs real money: raising a bill
 * and recording a collection. A driver taps *Record payment*, the phone loses
 * signal before the response lands, and they tap again — without this, the
 * second tap is an entirely legitimate second payment, and the customer is
 * credited twice with nothing in the data to say which row was the accident.
 *
 * The mechanism is a **unique index used as a lock**, not a read followed by a
 * write. Checking "has this key been seen?" and then inserting is two
 * operations with a gap in the middle, and two taps a few milliseconds apart
 * both land in that gap and both proceed. Instead the insert is attempted
 * first: exactly one of the racing requests can create the row, and the loser
 * gets a duplicate-key error, which is the signal to replay or reject rather
 * than an error to report.
 *
 * Three outcomes for a request carrying a key already on file:
 *
 * - **Same body, completed** — the stored response is replayed verbatim, with
 *   the original status code. The client cannot tell it did not run again,
 *   which is the point.
 * - **Same body, still in flight** — 409. The first attempt has not finished,
 *   and inventing an answer would mean guessing at one.
 * - **Different body** — 409, and deliberately *not* a replay. A key reused
 *   with different content is a client bug, and returning the earlier receipt
 *   would hide it behind something that looks right.
 *
 * The key is optional. A caller that omits it gets today's behaviour, so
 * nothing that already works breaks; the protection is there for clients that
 * ask for it.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    @InjectModel(IdempotencyRecord.name)
    private readonly records: Model<IdempotencyRecordDocument>,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const enabled = this.reflector.getAllAndOverride<boolean>(IDEMPOTENT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!enabled || context.getType() !== 'http') return next.handle();

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const key = request.header(IDEMPOTENCY_HEADER)?.trim();

    /** No key, no promise. The route behaves exactly as it did before. */
    if (!key) return next.handle();

    if (key.length > 200) {
      throw new BadRequestException(
        `${IDEMPOTENCY_HEADER} must be 200 characters or fewer.`,
      );
    }

    const actorId = request.user?.sub ?? 'anonymous';
    const scopedKey = `${actorId}:${request.method}:${request.path}:${key}`;
    const requestHash = IdempotencyInterceptor.hash(request.body);

    return from(
      this.claim(scopedKey, actorId, request, requestHash),
    ).pipe(
      switchMap((claimed) => {
        /** A replay: the earlier answer, not a new one. */
        if (claimed.replay) {
          context
            .switchToHttp()
            .getResponse<Response>()
            .status(claimed.statusCode);

          return of(claimed.response);
        }

        return next.handle().pipe(
          tap({
            next: (body) => {
              const { statusCode } = context
                .switchToHttp()
                .getResponse<Response>();

              void this.complete(scopedKey, statusCode, body);
            },
            /**
             * A failed attempt releases the key.
             *
             * Leaving it claimed would mean a request that failed on a
             * transient database blip could never be retried with the same
             * key — the client would be locked out of the operation for a day
             * by the very mechanism meant to make retrying safe.
             */
            error: () => {
              void this.records.deleteOne({ scopedKey }).catch(() => undefined);
            },
          }),
        );
      }),
    );
  }

  /**
   * Try to take the key. Returns a replay when somebody already has it.
   */
  private async claim(
    scopedKey: string,
    actorId: string,
    request: AuthenticatedRequest,
    requestHash: string,
  ): Promise<
    | { replay: false }
    | { replay: true; statusCode: number; response: unknown }
  > {
    try {
      await this.records.create({
        scopedKey,
        actorId,
        method: request.method,
        path: request.path,
        requestHash,
        state: IdempotencyState.InFlight,
      });

      return { replay: false };
    } catch (error) {
      if (!IdempotencyInterceptor.isDuplicate(error)) throw error;
    }

    const existing = await this.records.findOne({ scopedKey }).lean();

    /**
     * Expired between the failed insert and this read — a day-old key whose
     * TTL fired in the gap. Vanishingly unlikely and harmless: treat it as a
     * fresh request rather than failing on a record that no longer exists.
     */
    if (!existing) return { replay: false };

    if (existing.requestHash !== requestHash) {
      throw new ConflictException(
        `This ${IDEMPOTENCY_HEADER} was already used for a different request. Use a new key.`,
      );
    }

    if (existing.state === IdempotencyState.InFlight) {
      throw new ConflictException(
        'An identical request is still being processed. Retry in a moment.',
      );
    }

    return {
      replay: true,
      statusCode: existing.statusCode ?? 200,
      response: existing.response,
    };
  }

  /** Store what the handler produced, so a later retry can be answered. */
  private complete(
    scopedKey: string,
    statusCode: number,
    response: unknown,
  ): Promise<unknown> {
    return this.records
      .updateOne(
        { scopedKey },
        {
          $set: { state: IdempotencyState.Completed, statusCode, response },
        },
      )
      .catch(() => undefined);
  }

  /**
   * A stable fingerprint of the body.
   *
   * Keys are sorted before hashing, so two JSON objects that differ only in
   * property order are recognised as the same request — which they are, and a
   * client has no obligation to serialise them identically between attempts.
   */
  private static hash(body: unknown): string {
    return createHash('sha256')
      .update(JSON.stringify(IdempotencyInterceptor.sortKeys(body)) ?? 'null')
      .digest('hex');
  }

  private static sortKeys(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => IdempotencyInterceptor.sortKeys(item));
    }

    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, item]) => [key, IdempotencyInterceptor.sortKeys(item)]),
      );
    }

    return value;
  }

  private static isDuplicate(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      (error as { code?: number }).code === DUPLICATE_KEY
    );
  }
}
