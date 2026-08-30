import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { CreateCourierDto } from './create-courier.dto';

/**
 * Everything optional, and `password` re-declared rather than inherited.
 *
 * The edit form submits `password: ""` when the field is untouched, which has
 * to mean "keep the current one". Inheriting the `@MinLength(8)` would reject
 * that empty string and make every unrelated edit fail.
 */
export class UpdateCourierDto extends PartialType(
  OmitType(CreateCourierDto, ['password'] as const),
) {
  @ApiPropertyOptional({
    example: '',
    description:
      'Leave blank or omit to keep the current password. Any non-empty value must be at least 8 characters.',
  })
  @IsOptional()
  @IsString()
  @ValidateIf((_object, value: unknown) => value !== '')
  @MinLength(8, { message: 'Password must be at least 8 characters.' })
  @MaxLength(128)
  password?: string;
}
