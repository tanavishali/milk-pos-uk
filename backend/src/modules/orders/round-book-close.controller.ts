import { Body, Controller, HttpCode, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import type { JwtPayload } from '../auth/auth.service';
import {
  CloseRoundBookDto,
  CloseRoundBookResultDto,
} from '../round-books/dto/round-book.dto';
import { RoundBooksService } from '../round-books/round-books.service';
import { OrdersService } from './orders.service';

/**
 * Closing a round book.
 *
 * Here rather than beside the other `/round-books` routes because a close
 * now raises next week's bills, which needs `OrdersService` — and the orders
 * module already depends on the round-books one. The path is the same; Nest
 * does not mind two controllers sharing a prefix.
 */
@ApiTags('round-books')
@Controller('round-books')
@ApiBearerAuth('access-token')
@Roles(UserRole.Admin)
@ApiUnauthorizedResponse({ description: 'Missing, expired or invalid token.' })
@ApiForbiddenResponse({ description: 'Admin only.' })
export class RoundBookCloseController {
  constructor(
    private readonly books: RoundBooksService,
    private readonly orders: OrdersService,
  ) {}

  @Post(':code/close')
  @HttpCode(200)
  /**
   * Retry-safe, and more than ever: a close that times out and is sent again
   * must replay the first answer, not raise every customer's bill twice.
   */
  @Idempotent()
  @ApiOperation({
    summary: 'Close a round book and bill next week',
    description:
      'In one transaction: freezes the book’s totals and a statement per customer, marks it closed for good, opens next week’s book for the same round, and raises the same bills again in it for every customer billed this week — each carrying what they still owe as its previous balance. Customers in `excludeCustomerIds` are left out. Customers since deleted or moved to another round are skipped and reported.',
  })
  @ApiOkResponse({ type: CloseRoundBookResultDto })
  @ApiNotFoundResponse({ description: 'No book with that code.' })
  @ApiConflictResponse({ description: 'The book is already closed.' })
  close(
    @Param('code') code: string,
    @Body() dto: CloseRoundBookDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<CloseRoundBookResultDto> {
    const excluded = dto?.excludeCustomerIds ?? [];

    return this.books.close(code, user.email, (closed, next, session) =>
      this.orders.rollForward(closed, next, excluded, session),
    );
  }
}
