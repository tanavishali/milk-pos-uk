import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, type ClientSession } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { LOW_STOCK_THRESHOLD } from '../../common/constants';
import { PageDto } from '../../common/dto/page.dto';
import {
  PaginationQueryDto,
  resolvePaging,
} from '../../common/dto/pagination-query.dto';
import { toMinorUnits } from '../../common/utils/money';
import { SequenceService } from '../../database/sequence.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductDto } from './dto/product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product, ProductDocument } from './schemas/product.schema';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private readonly products: Model<ProductDocument>,
    private readonly sequence: SequenceService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Newest first, matching the mock's `unshift` — a product just added should
   * appear at the top of the grid, not on the last page.
   */
  async list(query: PaginationQueryDto = {}): Promise<PageDto<ProductDto>> {
    const paging = resolvePaging(query, this.config.getOrThrow('pagination'));

    /**
     * `estimatedDocumentCount` rather than `countDocuments`: with no filter
     * to apply it reads the collection metadata instead of walking an index,
     * which is the difference between constant time and linear.
     *
     * The count and the page are issued together: neither depends on the
     * other, so awaiting them in sequence would add a round trip for nothing.
     */
    const [rows, total] = await Promise.all([
      this.products
        .find()
        .sort({ createdAt: -1 })
        .skip(paging.skip)
        .limit(paging.limit)
        /** Read-only: the DTO reads fields, so hydration is pure overhead. */
        .lean<Product[]>(),
      this.products.estimatedDocumentCount(),
    ]);

    return PageDto.of(
      rows.map((row) => ProductDto.from(row)),
      total,
      paging,
    );
  }

  async findOne(code: string): Promise<ProductDto> {
    const product = await this.products.findOne({ code }).lean<Product>();

    if (!product) {
      throw new NotFoundException(`Product ${code} not found.`);
    }

    return ProductDto.from(product);
  }

  async create(dto: CreateProductDto): Promise<ProductDto> {
    const created = await this.products.create({
      code: await this.sequence.next('PROD'),
      name: dto.name.trim(),
      category: dto.category.trim(),
      retailPriceMinor: toMinorUnits(dto.retailPrice),
      salePriceMinor: toMinorUnits(dto.salePrice),
      quantity: dto.quantity,
    });

    return ProductDto.from(created);
  }

  async update(code: string, dto: UpdateProductDto): Promise<ProductDto> {
    const product = await this.require(code);

    /**
     * Assigned one at a time rather than spread, because `undefined` from an
     * omitted field would otherwise overwrite a stored value with nothing.
     */
    if (dto.name !== undefined) product.name = dto.name.trim();
    if (dto.category !== undefined) product.category = dto.category.trim();
    if (dto.retailPrice !== undefined) {
      product.retailPriceMinor = toMinorUnits(dto.retailPrice);
    }
    if (dto.salePrice !== undefined) {
      product.salePriceMinor = toMinorUnits(dto.salePrice);
    }
    if (dto.quantity !== undefined) product.quantity = dto.quantity;

    await product.save();

    return ProductDto.from(product);
  }

  /** Returns the id, which is what the client needs to drop the row. */
  async remove(code: string): Promise<{ id: string }> {
    const deleted = await this.products.findOneAndDelete({ code });

    if (!deleted) {
      throw new NotFoundException(`Product ${code} not found.`);
    }

    return { id: code };
  }

  /**
   * Items at or below the reorder point, scarcest first — the order they need
   * buying in. Returns the total as well, so a capped list can say how many it
   * is standing in for.
   */
  async lowStock(limit: number): Promise<{ rows: ProductDto[]; total: number }> {
    const filter = { quantity: { $lt: LOW_STOCK_THRESHOLD } };

    const [rows, total] = await Promise.all([
      this.products.find(filter).sort({ quantity: 1 }).limit(limit).lean<Product[]>(),
      this.products.countDocuments(filter),
    ]);

    return { rows: rows.map((row) => ProductDto.from(row)), total };
  }

  /**
   * Draw stock down for an issued order.
   *
   * Runs in the order's own transaction: a receipt that printed without moving
   * inventory is the one bug a POS cannot have.
   *
   * **One update per line, not two.** The clamp is expressed inside a single
   * pipeline update — `$max: [0, quantity - qty]` — rather than as a decrement
   * followed by a corrective write. Two writes in one transaction read each
   * other: the second one saw the *already decremented* figure, so any line
   * that left less on the shelf than it took (5 in stock, 3 sold, 2 left)
   * matched `quantity < qty` on the second pass and zeroed the remainder.
   *
   * A pipeline update also makes the clamp atomic against a concurrent sale,
   * which a read-then-write could not be. Overselling is caught in the wizard;
   * if something slips past, a negative count on the shelf is a worse lie than
   * a zero.
   *
   * Batched into one `bulkWrite`, so a ten-line order is one round trip rather
   * than twenty.
   */
  async decrementStock(
    lines: { productId: string; qty: number }[],
    session?: ClientSession,
  ): Promise<void> {
    if (lines.length === 0) return;

    await this.products.bulkWrite(
      lines.map(({ productId, qty }) => ({
        updateOne: {
          filter: { code: productId },
          update: [
            {
              $set: {
                quantity: { $max: [0, { $subtract: ['$quantity', qty] }] },
              },
            },
          ],
        },
      })),
      { session },
    );
  }

  private async require(code: string): Promise<ProductDocument> {
    const product = await this.products.findOne({ code });

    if (!product) {
      throw new NotFoundException(`Product ${code} not found.`);
    }

    return product;
  }
}
