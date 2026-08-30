import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/auth.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderDto, OutstandingDto } from './dto/order.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  @ApiOperation({
    summary: 'Every order, newest first',
    description:
      '`settledAmount`, `status`, `receivedAtDelivery` and `customerBalance` are computed from the payment ledger on every read — none of them is stored.',
  })
  @ApiOkResponse({ type: [OrderDto] })
  list(): Promise<OrderDto[]> {
    return this.orders.list();
  }

  /**
   * Before `:id`, or Express would match "mine" as an order code and this route
   * would be unreachable.
   */
  @Get('mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: "The signed-in courier's own deliveries",
    description:
      'Scoped from the token, never from a parameter. A client-supplied courier id is a request to read someone else’s work, and the server refuses it by not offering the option.',
  })
  @ApiOkResponse({ type: [OrderDto] })
  @ApiUnauthorizedResponse({ description: 'Missing, expired or invalid token.' })
  mine(@CurrentUser() user: JwtPayload): Promise<OrderDto[]> {
    /** An admin has no `courierId`, so this is empty for them rather than everything. */
    return this.orders.forCourier(user.courierId ?? '');
  }

  @Get('outstanding/:customerId')
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
  @ApiOperation({ summary: 'One order' })
  @ApiOkResponse({ type: OrderDto })
  @ApiNotFoundResponse({ description: 'No order with that id.' })
  findOne(@Param('id') id: string): Promise<OrderDto> {
    return this.orders.findOne(id);
  }

  @Post()
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
