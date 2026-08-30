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
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CouriersService } from './couriers.service';
import { CourierDto } from './dto/courier.dto';
import { CreateCourierDto } from './dto/create-courier.dto';
import { UpdateCourierDto } from './dto/update-courier.dto';

@ApiTags('couriers')
@Controller('couriers')
@ApiParam({
  name: 'id',
  required: false,
  example: 'COUR-101',
  description: 'The human-readable courier id, not the Mongo `_id`.',
})
export class CouriersController {
  constructor(private readonly couriers: CouriersService) {}

  @Get()
  @ApiOperation({ summary: 'The dispatch roster, newest first' })
  @ApiOkResponse({ type: [CourierDto] })
  list(): Promise<CourierDto[]> {
    return this.couriers.list();
  }

  @Get(':id')
  @ApiOperation({ summary: 'One courier' })
  @ApiOkResponse({ type: CourierDto })
  @ApiNotFoundResponse({ description: 'No courier with that id.' })
  findOne(@Param('id') id: string): Promise<CourierDto> {
    return this.couriers.findOne(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Register a courier',
    description:
      'Creates the roster row and the sign-in account in one transaction, so the driver can open the portal immediately. The password is write-only and is never returned by any endpoint.',
  })
  @ApiCreatedResponse({ type: CourierDto })
  @ApiConflictResponse({ description: 'That email already has an account.' })
  create(@Body() dto: CreateCourierDto): Promise<CourierDto> {
    return this.couriers.create(dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Edit a courier',
    description:
      'Name and email changes are mirrored onto the account. An omitted or empty password keeps the current one.',
  })
  @ApiOkResponse({ type: CourierDto })
  @ApiNotFoundResponse({ description: 'No courier with that id.' })
  @ApiConflictResponse({ description: 'That email already has an account.' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCourierDto,
  ): Promise<CourierDto> {
    return this.couriers.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Remove a courier',
    description:
      'Deletes the sign-in account too, so someone off the roster cannot still sign in. Orders already delivered keep the courier name printed on them.',
  })
  @ApiOkResponse({ schema: { example: { id: 'COUR-101' } } })
  @ApiNotFoundResponse({ description: 'No courier with that id.' })
  remove(@Param('id') id: string): Promise<{ id: string }> {
    return this.couriers.remove(id);
  }
}
