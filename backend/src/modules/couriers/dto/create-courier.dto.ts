import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCourierDto {
  @ApiProperty({ example: 'Bilal Khan' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: '+92 333 4455667' })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  phone!: string;

  @ApiProperty({ example: '35201-5566778-9' })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  idcard!: string;

  @ApiProperty({
    example: 'bilal.khan@blanksys.pos',
    format: 'email',
    description: 'Doubles as the sign-in email for the account created alongside.',
  })
  @IsEmail({}, { message: 'A valid email address is required.' })
  email!: string;

  @ApiProperty({
    example: 'Kestrel-Harbour-4417',
    minLength: 8,
    description:
      'Write-only. Creates the courier sign-in account; never returned by any endpoint.',
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters.' })
  @MaxLength(128)
  password!: string;

  @ApiProperty({ example: 'G-11 & G-10 Sectors' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  area!: string;

  @ApiProperty({ example: 'G-11/2, Islamabad' })
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  address!: string;
}
