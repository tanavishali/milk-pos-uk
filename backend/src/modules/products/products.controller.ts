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
import { CreateProductDto } from './dto/create-product.dto';
import { ProductDto } from './dto/product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@ApiTags('products')
@Controller('products')
@ApiParam({
  name: 'id',
  required: false,
  example: 'PROD-101',
  description: 'The human-readable product id, not the Mongo `_id`.',
})
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'The whole catalogue, newest first' })
  @ApiOkResponse({ type: [ProductDto] })
  list(): Promise<ProductDto[]> {
    return this.products.list();
  }

  @Get(':id')
  @ApiOperation({ summary: 'One product' })
  @ApiOkResponse({ type: ProductDto })
  @ApiNotFoundResponse({ description: 'No product with that id.' })
  findOne(@Param('id') id: string): Promise<ProductDto> {
    return this.products.findOne(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Add a product',
    description: 'The id is minted server-side from an atomic counter — `PROD-121` follows `PROD-120`.',
  })
  @ApiCreatedResponse({ type: ProductDto })
  create(@Body() dto: CreateProductDto): Promise<ProductDto> {
    return this.products.create(dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Edit a product',
    description: 'Every field optional; the edit form sends the whole draft.',
  })
  @ApiOkResponse({ type: ProductDto })
  @ApiNotFoundResponse({ description: 'No product with that id.' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<ProductDto> {
    return this.products.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a product',
    description: 'Orders that already include it are unaffected — a line copies its price at the time of sale.',
  })
  @ApiOkResponse({ schema: { example: { id: 'PROD-101' } } })
  @ApiNotFoundResponse({ description: 'No product with that id.' })
  remove(@Param('id') id: string): Promise<{ id: string }> {
    return this.products.remove(id);
  }
}
