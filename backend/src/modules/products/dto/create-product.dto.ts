import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/**
 * What it takes to put a new item on the catalogue: what it is called, what it
 * is, and what it sells for.
 *
 * **Stock is deliberately absent.** A count on the shelf is a delivery that has
 * not arrived at the moment the item is first written down, so asking for it up
 * front only ever got a made-up number. It is still a real field on a product
 * and `UpdateProductDto` accepts it; it is set once there is something true to
 * say.
 *
 * There is no list price either, anywhere: a product has one price, the one it
 * sells for.
 */
export class CreateProductDto {
  @ApiProperty({ example: 'Belgian Chocolate Fudge Cake' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiProperty({
    example: 'Bakery & Pastry',
    description:
      'Category name. Not checked against the categories collection — the frontend picks from a list, and a catalogue import should not fail on an unseen name.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  category!: string;

  @ApiProperty({
    example: 24.5,
    description:
      'Price charged, in pounds, to two decimals. Stored as integer pence.',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1_000_000)
  salePrice!: number;
}
