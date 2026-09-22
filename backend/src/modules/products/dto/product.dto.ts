import { ApiProperty } from '@nestjs/swagger';
import { fromMinorUnits } from '../../../common/utils/money';
import type { Product } from '../schemas/product.schema';

/**
 * A product as the API returns it — field for field what the frontend's
 * `Product` type expects, so the response drops straight into the existing UI.
 *
 * The price comes back as a decimal even though it is stored as integer pence.
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

  @ApiProperty({ example: 24.5, description: 'The price charged, in pounds.' })
  salePrice!: number;

  @ApiProperty({ example: 15, description: 'Units on hand.' })
  quantity!: number;

/**
   * The stored shape rather than the hydrated document: every read path is
   * `.lean()`, and this mapper only ever reads fields. A `ProductDocument` still
   * satisfies it, so the write paths pass one straight through.
   */
  static from(doc: Product): ProductDto {
    return {
      id: doc.code,
      name: doc.name,
      category: doc.category,
      salePrice: fromMinorUnits(doc.salePriceMinor),
      quantity: doc.quantity,
    };
  }
}
