import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
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
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ApiPageResponse } from '../../common/decorators/api-page-response.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PageDto } from '../../common/dto/page.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { UserRole } from '../../common/enums';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CustomerDto } from './dto/customer.dto';
import { PauseCustomerDto } from './dto/pause-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@ApiTags('customers')
@Controller('customers')
/**
 * The directory is names, phone numbers, addresses and email for every customer
 * on the round — the single most sensitive collection in the system. A driver
 * gets the doorstep details they need on their own orders, which carry a copy;
 * nobody needs the whole book but the terminal.
 */
@Roles(UserRole.Admin)
@ApiBearerAuth('access-token')
@ApiForbiddenResponse({ description: 'Admin only.' })
@ApiParam({
  name: 'id',
  required: false,
  example: 'CUST-101',
  description: 'The human-readable customer id, not the Mongo `_id`.',
})
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'The directory, newest first' })
  @ApiPageResponse(CustomerDto)
  list(@Query() query: PaginationQueryDto): Promise<PageDto<CustomerDto>> {
    return this.customers.list(query);
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

  @Patch(':id/pause')
  @ApiOperation({
    summary: 'Pause or resume a customer',
    description:
      'A paused customer gets no bill for next week when their round book closes. Past bills and their balance are untouched.',
  })
  @ApiOkResponse({ type: CustomerDto })
  @ApiNotFoundResponse({ description: 'No customer with that id.' })
  pause(
    @Param('id') id: string,
    @Body() dto: PauseCustomerDto,
  ): Promise<CustomerDto> {
    return this.customers.setPaused(id, dto.paused);
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
