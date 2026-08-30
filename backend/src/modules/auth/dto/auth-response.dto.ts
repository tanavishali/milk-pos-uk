import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../../common/enums';

/**
 * Matches the frontend's `AuthUser` field for field, so the sign-in response
 * can be dispatched into the auth slice without a mapping step.
 */
export class AuthUserDto {
  @ApiProperty({ example: 'Ada Whitfield' })
  name!: string;

  @ApiProperty({ example: 'ada.whitfield@blanksys.pos' })
  email!: string;

  @ApiProperty({
    enum: UserRole,
    example: UserRole.Admin,
    description: 'What the account may reach. Authorisation depends on this, never on `title`.',
  })
  role!: UserRole;

  @ApiProperty({ example: 'Head Administrator', description: 'Display label under the name.' })
  title!: string;

  @ApiPropertyOptional({
    example: 'COUR-101',
    description: 'Present only for a courier; the id their deliveries are scoped to.',
  })
  courierId?: string;

  @ApiPropertyOptional({ example: 'TERM-BLANK-99' })
  terminalId?: string;
}

export class AuthResponseDto extends AuthUserDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT bearer token. Send as `Authorization: Bearer <token>`.',
  })
  accessToken!: string;
}
