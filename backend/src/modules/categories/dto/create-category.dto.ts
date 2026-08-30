import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({
    example: 'Bakery & Pastry',
    description: 'The category name, which is also its identity.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name!: string;
}
