import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

/** Mirrors the frontend's `Credentials` type exactly. */
export class LoginDto {
  @ApiProperty({ example: 'ada.whitfield@blanksys.pos', format: 'email' })
  @IsEmail({}, { message: 'A valid email address is required.' })
  email!: string;

  @ApiProperty({ example: 'Kestrel-Harbour-4417', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters.' })
  password!: string;
}
