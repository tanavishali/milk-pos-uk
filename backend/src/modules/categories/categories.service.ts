import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateCategoryDto } from './dto/create-category.dto';
import { Category, CategoryDocument } from './schemas/category.schema';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name)
    private readonly categories: Model<CategoryDocument>,
  ) {}

  /** Names only, alphabetical — the shape the category dropdowns consume. */
  async list(): Promise<string[]> {
    const rows = await this.categories.find().sort({ name: 1 }).lean();
    return rows.map((row) => row.name);
  }

  /**
   * Idempotent, and returns the whole list rather than the one row.
   *
   * Adding a category that already exists is a no-op, not a 409: the modal
   * offers a free-text field with no way to see what already exists, so
   * retyping an existing name is an ordinary thing to do and failing it would
   * be noise. Returning the full list means the caller never has to merge the
   * new name into its own copy.
   */
  async create(dto: CreateCategoryDto): Promise<string[]> {
    const name = dto.name.trim();

    if (name) {
      await this.categories.updateOne(
        { name },
        { $setOnInsert: { name } },
        { upsert: true },
      );
    }

    return this.list();
  }
}
