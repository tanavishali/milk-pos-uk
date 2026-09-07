import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiConflictResponse, ApiHeader } from '@nestjs/swagger';

export const IDEMPOTENT_KEY = 'idempotency:enabled';

/**
 * Marks a write as safe to retry with an `Idempotency-Key` header.
 *
 * Applied to the routes where a duplicate costs money rather than merely
 * making a mess. Documents the header at the same time as enabling it, so the
 * two cannot drift apart.
 */
export const Idempotent = () =>
  applyDecorators(
    SetMetadata(IDEMPOTENT_KEY, true),
    ApiHeader({
      name: 'Idempotency-Key',
      required: false,
      description:
        'A unique value per attempt (a UUID is ideal). Retrying with the same key replays the first response instead of performing the write twice. Omitting it leaves the route unprotected but otherwise unchanged.',
      schema: { type: 'string', maxLength: 200, example: 'a3f1c8e2-5b0d-4f77-9c31-8e2b6d4a1f09' },
    }),
    ApiConflictResponse({
      description:
        'The key was reused for a different body, or an identical request is still in flight.',
    }),
  );
