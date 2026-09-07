import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiPageResponse } from '../../common/decorators/api-page-response.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PageDto } from '../../common/dto/page.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { UserRole } from '../../common/enums';
import type { JwtPayload } from '../auth/auth.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderDto, OutstandingDto } from './dto/order.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@Controller('orders')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Missing, expired or invalid token.' })
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  /** Every bill in the business. A driver reads `/orders/mine` instead. */
  @Roles(UserRole.Admin)
  @ApiForbiddenResponse({ description: 'Admin only.' })
  @ApiOperation({
    summary: 'Every order, newest first',
    description:
      '`settledAmount`, `status`, `receivedAtDelivery` and `customerBalance` are computed from the payment ledger on every read — none of them is stored.',
  })
  @ApiPageResponse(OrderDto)
  list(@Query() query: PaginationQueryDto): Promise<PageDto<OrderDto>> {
    return this.orders.list(query);
  }

  /**
   * Before `:id`, or Express would match "mine" as an order code and this route
   * would be unreachable.
   */
  @Get('mine')
  /** No `@Roles()`: the token scopes this, so an admin simply gets nothing. */
  @ApiOperation({
    summary: "The signed-in courier's own deliveries",
    description:
      'Scoped from the token, never from a parameter. A client-supplied courier id is a request to read someone else’s work, and the server refuses it by not offering the option.',
  })
  @ApiPageResponse(OrderDto)
  @ApiUnauthorizedResponse({ description: 'Missing, expired or invalid token.' })
  mine(
    @CurrentUser() user: JwtPayload,
    @Query() query: PaginationQueryDto,
  ): Promise<PageDto<OrderDto>> {
    /** An admin has no `courierId`, so this is empty for them rather than everything. */
    return this.orders.forCourier(user.courierId ?? '', query);
  }

  @Get('outstanding/:customerId')
  /**
   * Both roles. A driver at the door has to be able to say what is owed and on
   * which bills — that is the conversation happening on the step.
   */
  @ApiOperation({
    summary: 'What a customer still owes, and on which bills',
    description: 'Open bills only — anything already Paid is left out.',
  })
  @ApiOkResponse({ type: OutstandingDto })
  outstanding(
    @Param('customerId') customerId: string,
  ): Promise<OutstandingDto> {
    return this.orders.outstanding(customerId);
  }

  @Get('balance/:customerId')
  /** Both roles, for the same reason as `outstanding` — it is a doorstep figure. */
  @ApiOperation({
    summary: 'The running balance for one customer',
    description:
      'Sums each bill’s own `total` less everything paid. Never `grandTotal` — that would charge the same money again on every later receipt.',
  })
  @ApiOkResponse({ schema: { example: { balance: 49 } } })
  balance(
    @Param('customerId') customerId: string,
  ): Promise<{ balance: number }> {
    return this.orders.balance(customerId);
  }

  @Get(':id')
  /**
   * Admin only. Scoping this by courier would need the order fetched before the
   * check could run, so the driver's route stays `/orders/mine`, which is
   * scoped by the query itself.
   */
  @Roles(UserRole.Admin)
  @ApiForbiddenResponse({ description: 'Admin only.' })
  @ApiOperation({ summary: 'One order' })
  @ApiOkResponse({ type: OrderDto })
  @ApiNotFoundResponse({ description: 'No order with that id.' })
  findOne(@Param('id') id: string): Promise<OrderDto> {
    return this.orders.findOne(id);
  }

  @Post()
  /** Bills are raised at the till before the van leaves. */
  @Roles(UserRole.Admin)
  /**
   * Retry-safe. Raising a bill draws stock down and writes a receipt, so a
   * double submission on a flaky connection is a phantom sale *and* missing
   * inventory.
   */
  @Idempotent()
  @ApiForbiddenResponse({ description: 'Admin only.' })
  @ApiOperation({
    summary: 'Raise a bill',
    description:
      'Copies the customer onto the order, resolves the courier name from its id, computes `previousBalance` from the ledger, and draws down stock — all in one transaction. No payment is taken here.',
  })
  @ApiCreatedResponse({ type: OrderDto })
  @ApiNotFoundResponse({ description: 'Unknown customer or courier.' })
  create(@Body() dto: CreateOrderDto): Promise<OrderDto> {
    return this.orders.create(dto);
  }
}
