import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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

  private async require(code: string): Promise<ProductDocument> {
    const product = await this.products.findOne({ code });

    if (!product) {
      throw new NotFoundException(`Product ${code} not found.`);
    }

    return product;
  }
}
