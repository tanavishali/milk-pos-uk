import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CustomerDto } from './dto/customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@ApiTags('customers')
@Controller('customers')
@ApiParam({
  name: 'id',
  required: false,
  example: 'CUST-101',
  description: 'The human-readable customer id, not the Mongo `_id`.',
})
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'The whole directory, newest first' })
  @ApiOkResponse({ type: [CustomerDto] })
  list(): Promise<CustomerDto[]> {
    return this.customers.list();
  }

  @Get(':id')
  @ApiOperation({ summary: 'One customer' })
  @ApiOkResponse({ type: CustomerDto })
  @ApiNotFoundResponse({ description: 'No customer with that id.' })
  findOne(@Param('id') id: string): Promise<CustomerDto> {
    return this.customers.findOne(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Add a customer',
    description: 'The id is minted server-side from an atomic counter.',
  })
  @ApiCreatedResponse({ type: CustomerDto })
  create(@Body() dto: CreateCustomerDto): Promise<CustomerDto> {
    return this.customers.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit a customer' })
  @ApiOkResponse({ type: CustomerDto })
  @ApiNotFoundResponse({ description: 'No customer with that id.' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ): Promise<CustomerDto> {
    return this.customers.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a customer',
    description: 'Orders already raised keep their own copy of the customer and are unaffected.',
  })
  @ApiOkResponse({ schema: { example: { id: 'CUST-101' } } })
  @ApiNotFoundResponse({ description: 'No customer with that id.' })
  remove(@Param('id') id: string): Promise<{ id: string }> {
    return this.customers.remove(id);
  }
}
