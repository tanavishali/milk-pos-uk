import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../../common/enums';

export class RegisterDto {
  @ApiProperty({ example: 'Ada Whitfield' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @ApiProperty({ example: 'ada.whitfield@blanksys.pos', format: 'email' })
  @IsEmail({}, { message: 'A valid email address is required.' })
  email!: string;

  @ApiProperty({ example: 'Kestrel-Harbour-4417', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters.' })
  @MaxLength(128)
  password!: string;

  @ApiProperty({
    enum: UserRole,
    example: UserRole.Admin,
    description:
      'Admin gets the full terminal; courier gets their own deliveries only.',
  })
  @IsEnum(UserRole)
  role!: UserRole;

  @ApiPropertyOptional({
    example: 'Head Administrator',
    description: 'Display label only. Defaults from the role when omitted.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  title?: string;

  @ApiPropertyOptional({
    example: 'COUR-101',
    description:
      'Courier roster id this account is scoped to. Only meaningful for the courier role.',
  })
  @IsOptional()
  @IsString()
  courierId?: string;

  @ApiPropertyOptional({
    example: 'TERM-BLANK-99',
    description: 'Till identifier. Only meaningful for the admin role.',
  })
  @IsOptional()
  @IsString()
  terminalId?: string;
}
