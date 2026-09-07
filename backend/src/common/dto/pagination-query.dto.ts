import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

/**
 * The query string every list endpoint accepts.
 *
 * Offset paging rather than a cursor. A cursor is the better answer for a feed
 * that only ever scrolls forward, but every list here is a table with numbered
 * pages that an operator jumps around in — "go to the last page" is a normal
 * thing to do with a payment ledger, and a cursor cannot answer it.
 *
 * `limit` has **no maximum on the DTO on purpose.** A caller asking for a
 * million rows should get the ceiling, not a validation error: they asked for
 * "as much as possible", and the server is the one that decides what that is.
 * The clamp lives in `resolvePaging`, from configuration, so the ceiling can be
 * raised for a deployment without touching this class.
 */
export class PaginationQueryDto {
  @ApiPropertyOptional({
    minimum: 1,
    default: 1,
    description: 'One-based. Out of range returns an empty page, not an error.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page must be a whole number.' })
  @Min(1, { message: 'page starts at 1.' })
  page?: number;

  @ApiPropertyOptional({
    minimum: 1,
    description:
      'Rows per page. Clamped to the server maximum, so a larger value is not an error.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit must be a whole number.' })
  @Min(1, { message: 'limit starts at 1.' })
  limit?: number;
}

/** A validated page request, with the defaults and the ceiling applied. */
export interface Paging {
  page: number;
  limit: number;
  skip: number;
}

/**
 * Turn what the caller asked for into what the server will actually do.
 *
 * One function rather than a rule repeated in five services, because the
 * clamp is the security-relevant half: without it `?limit=10000000` is a way
 * to ask the database to read a whole collection into memory, which is the
 * thing pagination was added to prevent.
 */
export function resolvePaging(
  query: PaginationQueryDto,
  defaults: { defaultLimit: number; maxLimit: number },
): Paging {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(
    Math.max(1, query.limit ?? defaults.defaultLimit),
    defaults.maxLimit,
  );

  return { page, limit, skip: (page - 1) * limit };
}
