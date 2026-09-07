import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';

@ApiTags('categories')
@Controller('categories')
/** Catalogue structure, so it follows the catalogue: the terminal's, not the van's. */
@Roles(UserRole.Admin)
@ApiBearerAuth('access-token')
@ApiForbiddenResponse({ description: 'Admin only.' })
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Every category, alphabetically' })
  @ApiOkResponse({ type: [String], schema: { example: ['Bakery & Pastry', 'Dairy'] } })
  list(): Promise<string[]> {
    return this.categories.list();
  }

  @Post()
  /** 200, not 201: idempotent, and the body is the whole list, not a new row. */
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Add a category',
    description:
      'Idempotent — adding one that already exists is a no-op rather than a conflict. Returns the full list.',
  })
  @ApiOkResponse({ type: [String], schema: { example: ['Bakery & Pastry', 'Dairy'] } })
  create(@Body() dto: CreateCategoryDto): Promise<string[]> {
    return this.categories.create(dto);
  }
}
