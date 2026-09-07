import {
  Body,
  Controller,
  Delete,
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
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ApiPageResponse } from '../../common/decorators/api-page-response.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PageDto } from '../../common/dto/page.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { UserRole } from '../../common/enums';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentDto } from './dto/payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('payments')
@ApiBearerAuth('access-token')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get()
  /** The whole ledger, or one customer's. Either way it is the terminal's view. */
  @Roles(UserRole.Admin)
  @ApiOperation({ summary: 'Payments, newest first' })
  @ApiQuery({
    name: 'customerId',
    required: false,
    example: 'CUST-101',
    description: 'Limit to one customer. Omit for the whole ledger.',
  })
  @ApiPageResponse(PaymentDto)
  list(
    @Query() query: PaginationQueryDto,
    @Query('customerId') customerId?: string,
  ): Promise<PageDto<PaymentDto>> {
    return this.payments.list(customerId, query);
  }

  @Post()
  /**
   * **Both roles.** This is the one write a courier has to be able to make:
   * cash arrives at the door, and the driver is the one holding it. The row
   * records `receivedBy`, so who took it is still on the record.
   */
  /**
   * Retry-safe, and the route this mattered most for: a driver taps *Record
   * payment*, the phone loses signal before the response lands, and they tap
   * again. Without a key the second tap is a legitimate second payment and the
   * customer is credited twice.
   */
  @Idempotent()
  @ApiOperation({
    summary: 'Record money received',
    description:
      'Changes every affected bill’s status and the customer’s balance without touching a single order — all of that is derived on read.',
  })
  @ApiCreatedResponse({ type: PaymentDto })
  @ApiNotFoundResponse({ description: 'Unknown customer.' })
  create(@Body() dto: CreatePaymentDto): Promise<PaymentDto> {
    return this.payments.create(dto);
  }

  @Delete(':id')
  /**
   * **Admins only.** Deleting a payment raises a customer's balance back up,
   * with nothing left behind to say it happened — a driver who could reach
   * this could erase the cash they were handed.
   */
  @Roles(UserRole.Admin)
  @ApiForbiddenResponse({ description: 'Admin only.' })
  @ApiOperation({
    summary: 'Reverse a mis-keyed collection',
    description:
      'Nothing needs repairing afterwards: balances and statuses follow automatically, because none of them is stored.',
  })
  @ApiOkResponse({ schema: { example: { id: 'PAY-101' } } })
  @ApiNotFoundResponse({ description: 'No payment with that id.' })
  remove(@Param('id') id: string): Promise<{ id: string }> {
    return this.payments.remove(id);
  }
}
