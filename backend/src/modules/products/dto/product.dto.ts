import { ApiProperty } from '@nestjs/swagger';
import { fromMinorUnits } from '../../../common/utils/money';
import type { ProductDocument } from '../schemas/product.schema';

/**
 * A product as the API returns it — field for field what the frontend's
 * `Product` type expects, so the response drops straight into the existing UI.
 *
 * Prices come back as decimals even though they are stored as integer pence.
 * This class is that boundary: one place converts, and nothing downstream has
 * to know which representation it is holding.
 */
export class ProductDto {
  @ApiProperty({ example: 'PROD-101', description: 'Human-readable id, shown in the UI.' })
  id!: string;

  @ApiProperty({ example: 'Belgian Chocolate Fudge Cake' })
  name!: string;

  @ApiProperty({ example: 'Bakery & Pastry' })
  category!: string;

  @ApiProperty({ example: 28, description: 'List price, in pounds.' })
  retailPrice!: number;

  @ApiProperty({ example: 24.5, description: 'Price actually charged, in pounds.' })
  salePrice!: number;

  @ApiProperty({ example: 15, description: 'Units on hand.' })
  quantity!: number;

  static from(doc: ProductDocument): ProductDto {
    return {
      id: doc.code,
      name: doc.name,
      category: doc.category,
      retailPrice: fromMinorUnits(doc.retailPriceMinor),
      salePrice: fromMinorUnits(doc.salePriceMinor),
      quantity: doc.quantity,
    };
  }
}
