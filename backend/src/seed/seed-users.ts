import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import type { Model } from 'mongoose';
import { AppModule } from '../app.module';
import { UserRole } from '../common/enums';
import { User, type UserDocument } from '../modules/auth/schemas/user.schema';
import { DEMO_ACCOUNTS } from './demo-accounts';

/**
 * Creates the two demo sign-in accounts.
 *
 * Idempotent: an existing account has its password and profile reset to the
 * seed values rather than being skipped or duplicated, so re-running always
 * leaves the documented credentials working.
 *
 * Run with `npm run seed:users`.
 */
async function seed(): Promise<void> {
  const logger = new Logger('SeedUsers');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const users = app.get<Model<UserDocument>>(getModelToken(User.name));

    /** `lazyConnection` means the connection may still be in flight here. */
    await users.db.asPromise();

    for (const account of DEMO_ACCOUNTS) {
      const passwordHash = await bcrypt.hash(account.password, 12);

      await users.updateOne(
        { email: account.email },
        {
          $set: {
            email: account.email,
            passwordHash,
            name: account.name,
            title: account.title,
            role: account.role,
            courierId: account.role === UserRole.Courier ? account.courierId : undefined,
            terminalId: account.role === UserRole.Admin ? account.terminalId : undefined,
          },
        },
        { upsert: true },
      );

      logger.log(`${account.role.padEnd(7)} ${account.email}  ${account.password}`);
    }

    logger.log(`Seeded ${DEMO_ACCOUNTS.length} accounts.`);
  } finally {
    await app.close();
  }
}

void seed();
