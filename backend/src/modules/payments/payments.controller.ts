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
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentDto } from './dto/payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get()
  @ApiOperation({ summary: 'Payments, newest first' })
  @ApiQuery({
    name: 'customerId',
    required: false,
    example: 'CUST-101',
    description: 'Limit to one customer. Omit for the whole ledger.',
  })
  @ApiOkResponse({ type: [PaymentDto] })
  list(@Query('customerId') customerId?: string): Promise<PaymentDto[]> {
    return this.payments.list(customerId);
  }

  @Post()
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
