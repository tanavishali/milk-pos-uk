import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { Model } from 'mongoose';
import { UserRole } from '../../common/enums';
import { AuthResponseDto, AuthUserDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { User, UserDocument } from './schemas/user.schema';

/**
 * Both failure paths say the same thing on purpose: distinguishing "no such
 * account" from "wrong password" tells an attacker which emails are real.
 * Inherited verbatim from the frontend mock, which documents the same reason.
 */
const WRONG_CREDENTIALS = 'Incorrect email or password.';

/** Default display label per role, when the caller does not supply one. */
const DEFAULT_TITLE: Record<UserRole, string> = {
  [UserRole.Admin]: 'Administrator',
  [UserRole.Courier]: 'Courier',
};

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  courierId?: string;
}

@Injectable()
export class AuthService {
  private readonly rounds: number;

  constructor(
    @InjectModel(User.name) private readonly users: Model<UserDocument>,
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.rounds = config.get<number>('auth.bcryptRounds') ?? 12;
  }

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const email = dto.email.trim().toLowerCase();

    if (await this.users.exists({ email })) {
      throw new ConflictException('An account with that email already exists.');
    }

    const created = await this.users.create({
      email,
      passwordHash: await bcrypt.hash(dto.password, this.rounds),
      name: dto.name.trim(),
      title: dto.title?.trim() || DEFAULT_TITLE[dto.role],
      role: dto.role,
      /**
       * Each id is only meaningful for one role. Dropping the mismatched one
       * keeps a courier from carrying a terminal id that would imply till
       * access it does not have.
       */
      courierId: dto.role === UserRole.Courier ? dto.courierId : undefined,
      terminalId: dto.role === UserRole.Admin ? dto.terminalId : undefined,
    });

    return this.sign(created);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const email = dto.email.trim().toLowerCase();

    /** `passwordHash` is `select: false`, so it has to be asked for by name. */
    const user = await this.users.findOne({ email }).select('+passwordHash');

    /**
     * Compare against a dummy hash when there is no account, so a missing
     * email costs the same time as a wrong password. Returning early instead
     * would make the two distinguishable by response time alone.
     */
    const hash = user?.passwordHash ?? (await AuthService.dummyHash());
    const matches = await bcrypt.compare(dto.password, hash);

    if (!user || !matches) {
      throw new UnauthorizedException(WRONG_CREDENTIALS);
    }

    return this.sign(user);
  }

  /** Resolves the bearer token's subject back to the current account. */
  async me(userId: string): Promise<AuthUserDto> {
    const user = await this.users.findById(userId);

    if (!user) {
      throw new UnauthorizedException('Session is no longer valid.');
    }

    return AuthService.toAuthUser(user);
  }

  private async sign(user: UserDocument): Promise<AuthResponseDto> {
    const payload: JwtPayload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      courierId: user.courierId,
    };

    return {
      ...AuthService.toAuthUser(user),
      accessToken: await this.jwt.signAsync(payload),
    };
  }

  /** The `AuthUser` shape the frontend already stores. Never includes the hash. */
  private static toAuthUser(user: UserDocument): AuthUserDto {
    return {
      name: user.name,
      email: user.email,
      role: user.role,
      title: user.title,
      courierId: user.courierId,
      terminalId: user.terminalId,
    };
  }

  private static dummyHash(): Promise<string> {
    return bcrypt.hash('no-such-account', 10);
  }
}
