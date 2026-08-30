import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, type JwtModuleOptions } from '@nestjs/jwt';
import type { SignOptions } from 'jsonwebtoken';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User, UserSchema } from './schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => ({
        secret: config.getOrThrow<string>('auth.jwtSecret'),
        signOptions: {
          /**
           * `expiresIn` is typed as a literal union of `ms` durations, which
           * an env string can never satisfy. Validated as a non-empty string
           * at boot; the cast is where that guarantee is handed to the types.
           */
          expiresIn: config.getOrThrow<string>(
            'auth.jwtExpiresIn',
          ) as SignOptions['expiresIn'],
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  /** Exported so other modules can guard their own routes with the same token. */
  exports: [AuthService, JwtModule, JwtAuthGuard],
})
export class AuthModule {}
