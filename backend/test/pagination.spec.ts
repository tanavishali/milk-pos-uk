import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { PageDto } from '../src/common/dto/page.dto';
import {
  PaginationQueryDto,
  resolvePaging,
} from '../src/common/dto/pagination-query.dto';

/**
 * What a caller is allowed to ask a list endpoint for, and what they get.
 *
 * The clamp is the security-relevant half. Without it `?limit=10000000` is a
 * one-line way to ask the database to read a whole collection into memory and
 * hand it back, which is the thing pagination was added to prevent — so the
 * cases below pin that an over-large request is *reduced*, not rejected and
 * not honoured.
 */

const LIMITS = { defaultLimit: 50, maxLimit: 200 };

/** The query string, through the same validation pipeline the route uses. */
function query(raw: Record<string, unknown>) {
  return plainToInstance(PaginationQueryDto, raw);
}

function errorsIn(dto: PaginationQueryDto): string[] {
  return validateSync(dto).flatMap((e) => Object.values(e.constraints ?? {}));
}

describe('PaginationQueryDto', () => {
  it('accepts an absent query — a caller need not know paging exists', () => {
    expect(errorsIn(query({}))).toEqual([]);
  });

  it('coerces the numbers out of the query string', () => {
    // Everything in a query string is a string; the DTO is what makes it a
    // number before `resolvePaging` does arithmetic on it.
    const dto = query({ page: '3', limit: '25' });

    expect(errorsIn(dto)).toEqual([]);
    expect(dto.page).toBe(3);
    expect(dto.limit).toBe(25);
  });

  it.each([
    ['a zero page', { page: 0 }],
    ['a negative page', { page: -1 }],
    ['a fractional page', { page: 1.5 }],
    ['a zero limit', { limit: 0 }],
    ['nonsense', { page: 'first' }],
  ])('rejects %s', (_label, raw) => {
    expect(errorsIn(query(raw))).not.toEqual([]);
  });

  it('does not reject an over-large limit — that is the clamp’s job', () => {
    // A caller asking for a million rows means "as much as possible". Answering
    // with a validation error would be pedantry; answering with a million rows
    // would be the denial of service. The ceiling is the right answer, and it
    // is applied below rather than here.
    expect(errorsIn(query({ limit: 1_000_000 }))).toEqual([]);
  });
});

describe('resolvePaging', () => {
  it('defaults to the first page at the configured size', () => {
    expect(resolvePaging({}, LIMITS)).toEqual({ page: 1, limit: 50, skip: 0 });
  });

  it('clamps a limit above the ceiling instead of honouring it', () => {
    expect(resolvePaging({ limit: 10_000_000 }, LIMITS).limit).toBe(200);
  });

  it('leaves a limit under the ceiling alone', () => {
    expect(resolvePaging({ limit: 10 }, LIMITS).limit).toBe(10);
  });

  it('computes the offset from the page and the applied limit', () => {
    // Page 4 at 25 a page starts at row 75, not at row 150 — the offset has to
    // follow the limit that was actually applied, not the one that was asked
    // for.
    expect(resolvePaging({ page: 4, limit: 25 }, LIMITS).skip).toBe(75);
    expect(resolvePaging({ page: 4, limit: 10_000 }, LIMITS).skip).toBe(600);
  });
});

describe('PageDto.of', () => {
  const rows = (n: number) => Array.from({ length: n }, (_, i) => i);

  it('reports the page count for a partial last page', () => {
    // 137 rows at 50 a page is three pages, not two.
    const page = PageDto.of(rows(37), 137, { page: 3, limit: 50, skip: 100 });

    expect(page.meta).toEqual({
      page: 3,
      limit: 50,
      total: 137,
      pages: 3,
      hasMore: false,
    });
  });

  it('flags a further page when one exists', () => {
    const page = PageDto.of(rows(50), 137, { page: 1, limit: 50, skip: 0 });

    expect(page.meta.hasMore).toBe(true);
  });

  it('reports one page, not zero, for an empty collection', () => {
    // "Page 1 of 0" is nonsense to render. An empty collection has one empty
    // page.
    const page = PageDto.of([], 0, { page: 1, limit: 50, skip: 0 });

    expect(page.meta.pages).toBe(1);
    expect(page.meta.hasMore).toBe(false);
  });

  it('says there is no more when asked for a page past the end', () => {
    // `page < pages` would say `true` here and send a client looping forever.
    // Deriving it from the offset and the rows actually returned is what makes
    // it correct in the out-of-range case.
    const page = PageDto.of([], 137, { page: 99, limit: 50, skip: 4_900 });

    expect(page.meta.hasMore).toBe(false);
  });
});
