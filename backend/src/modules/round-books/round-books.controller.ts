import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { RoundBookDto } from './dto/round-book.dto';
import { RoundBooksService } from './round-books.service';

/**
 * Admin only, all of it. A book is the office's view of a week — a driver
 * works from `/orders/mine` and never needs to see or close one.
 */
@ApiTags('round-books')
@Controller('round-books')
@ApiBearerAuth('access-token')
@Roles(UserRole.Admin)
@ApiUnauthorizedResponse({ description: 'Missing, expired or invalid token.' })
@ApiForbiddenResponse({ description: 'Admin only.' })
export class RoundBooksController {
  constructor(private readonly books: RoundBooksService) {}

  @Get()
  @ApiOperation({
    summary: "A round's books, newest week first",
    description: 'Up to a year of weeks. Statements are left out; fetch one book for those.',
  })
  @ApiQuery({ name: 'roundId', example: 'mon-thu' })
  @ApiOkResponse({ type: [RoundBookDto] })
  @ApiBadRequestResponse({ description: 'Unknown round.' })
  history(@Query('roundId') roundId: string): Promise<RoundBookDto[]> {
    return this.books.history(roundId ?? '');
  }

  /** Before `:code`, or Express would read "current" as a book code. */
  @Get('current/:roundId')
  @ApiOperation({
    summary: "The round's open book, with live figures and pre-close warnings",
    description:
      'Opens the round’s first book if it has never had one. That is an initialisation, not a change: calling it again returns the same book.',
  })
  @ApiOkResponse({ type: RoundBookDto })
  @ApiBadRequestResponse({ description: 'Unknown round.' })
  current(@Param('roundId') roundId: string): Promise<RoundBookDto> {
    return this.books.current(roundId);
  }

  @Get(':code')
  @ApiOperation({ summary: 'One book, with a statement per customer' })
  @ApiOkResponse({ type: RoundBookDto })
  @ApiNotFoundResponse({ description: 'No book with that code.' })
  findOne(@Param('code') code: string): Promise<RoundBookDto> {
    return this.books.findOne(code);
  }

  /**
   * `POST /round-books/:code/close` lives in `OrdersModule`
   * (`RoundBookCloseController`): closing raises next week's bills, and
   * raising a bill is `OrdersService`'s job.
   */
}
