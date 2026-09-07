import { ApiProperty } from '@nestjs/swagger';
import type { Paging } from './pagination-query.dto';

/** Where the caller is in the collection, and how much of it there is. */
export class PageMetaDto {
  @ApiProperty({ example: 1, description: 'One-based page number returned.' })
  page!: number;

  @ApiProperty({ example: 50, description: 'Rows per page actually applied.' })
  limit!: number;

  @ApiProperty({ example: 137, description: 'Rows matching the filter, all pages.' })
  total!: number;

  @ApiProperty({ example: 3, description: 'Total pages at this limit.' })
  pages!: number;

  @ApiProperty({ example: true, description: 'Whether a further page exists.' })
  hasMore!: boolean;
}

/**
 * The envelope every list endpoint returns.
 *
 * Returned **always**, not only when the caller asks for a page. An endpoint
 * that returns a bare array without paging parameters and an envelope with
 * them has two response shapes, and every client then needs a branch for
 * which one it got. One shape means the client is written once.
 *
 * The cost is that a caller cannot ignore paging even for a list of seven
 * couriers — which is the right trade, because "there are only ever a few of
 * these" is an assumption that holds right up until it does not.
 */
export class PageDto<T> {
  @ApiProperty({ isArray: true, description: 'The rows for this page.' })
  items!: T[];

  @ApiProperty({ type: PageMetaDto })
  meta!: PageMetaDto;

  /** Build the envelope from the rows and the total the query reported. */
  static of<T>(items: T[], total: number, paging: Paging): PageDto<T> {
    const pages = Math.max(1, Math.ceil(total / paging.limit));

    return {
      items,
      meta: {
        page: paging.page,
        limit: paging.limit,
        total,
        pages,
        /**
         * Derived from the rows and the offset rather than from `page < pages`.
         * They agree in the normal case, but when the caller asks for a page
         * past the end this reports `false` instead of `true`.
         */
        hasMore: paging.skip + items.length < total,
      },
    };
  }
}
