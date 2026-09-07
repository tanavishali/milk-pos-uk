import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SkipAudit } from '../../common/decorators/skip-audit.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { AuthService, type JwtPayload } from './auth.service';
import { AuthResponseDto, AuthUserDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  /**
   * **Admins only.** The body names its own `role`, so an open registration
   * endpoint is a self-service route to an admin account — anyone who could
   * reach the API could mint one. Accounts are created by an existing admin,
   * and the first one comes from `npm run seed:users`.
   */
  @Roles(UserRole.Admin)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Create an account',
    description:
      'Admins only — the body chooses its own `role`, so this cannot be open. Works for both roles; returns a token for the new account.',
  })
  @ApiCreatedResponse({ type: AuthResponseDto })
  @ApiConflictResponse({ description: 'That email is already registered.' })
  @ApiUnauthorizedResponse({ description: 'Missing, expired or invalid token.' })
  @ApiForbiddenResponse({ description: 'Only an admin can create accounts.' })
  register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.auth.register(dto);
  }

  @Post('login')
  /** The one route that cannot require a token: it is where tokens come from. */
  @Public()
  /**
   * The strict limiter, by name.
   *
   * An unauthenticated caller is keyed on their address here, and ten attempts
   * a quarter hour is the difference between a person who mistyped a generated
   * password and a script working through a list. The general limit of a few
   * hundred a minute would let a password list through in an afternoon.
   */
  @Throttle({ auth: {} })
  /**
   * Not audited. A successful sign-in every morning from every device is noise
   * that buries the trail; the interesting half is failures, and those are
   * better served by the limiter above than by a row per attempt.
   */
  @SkipAudit()
  /** 200, not 201: signing in creates a session, not a resource. */
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sign in',
    description:
      'One endpoint for both roles. The role is resolved from the account, never sent by the client.',
  })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({
    description:
      'Incorrect email or password. Deliberately the same response for an unknown email and a wrong password.',
  })
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.auth.login(dto);
  }

  @Get('me')
  /** No `@Roles()`: any signed-in account may read its own record. */
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'The signed-in account',
    description: 'Lets the client verify a restored session against the server instead of trusting storage.',
  })
  @ApiOkResponse({ type: AuthUserDto })
  @ApiUnauthorizedResponse({ description: 'Missing, expired or invalid token.' })
  me(@CurrentUser() user: JwtPayload): Promise<AuthUserDto> {
    return this.auth.me(user.sub);
  }
}
