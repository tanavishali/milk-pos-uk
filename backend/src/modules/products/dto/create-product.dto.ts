import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

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
    example: 28,
    description: 'List price in pounds, to two decimals. Stored as integer pence.',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1_000_000)
  retailPrice!: number;

  @ApiProperty({ example: 24.5, description: 'Price charged, in pounds.' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1_000_000)
  salePrice!: number;

  @ApiProperty({ example: 15 })
  @IsInt()
  @Min(0)
  quantity!: number;
}
