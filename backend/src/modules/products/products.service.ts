import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, type ClientSession } from 'mongoose';
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
  ) {}

  /**
   * Newest first, matching the mock's `unshift` — a product just added should
   * appear at the top of the grid, not on the last page.
   */
  async list(): Promise<ProductDto[]> {
    const rows = await this.products.find().sort({ createdAt: -1 });
    return rows.map((row) => ProductDto.from(row));
  }

  async findOne(code: string): Promise<ProductDto> {
    return ProductDto.from(await this.require(code));
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
   * Draw stock down for an issued order.
   *
   * Runs in the order's own transaction: a receipt that printed without moving
   * inventory is the one bug a POS cannot have.
   *
   * Clamped at zero. Overselling is caught in the wizard, which limits each
   * line to stock on hand; if something slips past, a negative count on the
   * shelf is a worse lie than a zero.
   */
  async decrementStock(
    lines: { productId: string; qty: number }[],
    session?: ClientSession,
  ): Promise<void> {
    for (const line of lines) {
      await this.products
        .updateOne(
          { code: line.productId, quantity: { $gte: line.qty } },
          { $inc: { quantity: -line.qty } },
        )
        .session(session ?? null);

      /** Whatever is left when stock ran short goes to zero, never below. */
      await this.products
        .updateOne(
          { code: line.productId, quantity: { $lt: line.qty } },
          { $set: { quantity: 0 } },
        )
        .session(session ?? null);
    }
  }

  private async require(code: string): Promise<ProductDocument> {
    const product = await this.products.findOne({ code });

    if (!product) {
      throw new NotFoundException(`Product ${code} not found.`);
    }

    return product;
  }
}
