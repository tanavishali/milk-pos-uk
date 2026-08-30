import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

/**
 * Every field optional. The edit modal sends the whole draft, so this behaves
 * as a replace in practice, while still accepting a single-field change.
 */
export class UpdateProductDto extends PartialType(CreateProductDto) {}
