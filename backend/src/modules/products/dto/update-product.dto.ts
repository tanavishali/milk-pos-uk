import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';
import { CreateProductDto } from './create-product.dto';

/**
 * Every field optional. The edit modal sends the whole draft, so this behaves
 * as a replace in practice, while still accepting a single-field change.
 *
 * Stock is **declared here rather than inherited**, because creating an item
 * does not ask for it — a count on the shelf is a delivery that has not
 * arrived. That asymmetry is the point: it is not a fact you have when an item
 * is first written down, but it very much is one later, and this is where it
 * is set.
 *
 * Editing is also the only way stock goes *up*: `decrementStock` is the only
 * other writer and it only ever draws down. Dropping `quantity` from here too
 * would leave every product at zero for good, and the order wizard treats zero
 * as out of stock.
 */
export class UpdateProductDto extends PartialType(CreateProductDto) {
  @ApiPropertyOptional({ example: 15, description: 'Units on hand.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  quantity?: number;
}
