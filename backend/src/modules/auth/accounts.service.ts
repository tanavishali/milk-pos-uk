import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { Model, type ClientSession } from 'mongoose';
import { UserRole } from '../../common/enums';
import { User, UserDocument } from './schemas/user.schema';

/**
 * The sign-in account behind a courier.
 *
 * A courier is two things that must not be one thing: a **roster row**, which
 * dispatch reads and which appears on receipts, and an **account**, which is a
 * credential. Keeping them in separate collections is what stops a password
 * hash riding along on `GET /couriers` — the courier response has no field to
 * put it in.
 *
 * This service is the only writer of courier accounts, so the rules about what
 * happens to a login when a roster row is added, renamed or deleted live in
 * exactly one place.
 */
@Injectable()
export class AccountsService {
  private readonly rounds: number;

  constructor(
    @InjectModel(User.name) private readonly users: Model<UserDocument>,
    config: ConfigService,
  ) {
    this.rounds = config.get<number>('auth.bcryptRounds') ?? 12;
  }

  /** Rejects before anything is written, so a duplicate email fails cleanly. */
  async assertEmailFree(email: string, session?: ClientSession): Promise<void> {
    const existing = await this.users
      .findOne({ email: email.trim().toLowerCase() })
      .session(session ?? null);

    if (existing) {
      throw new ConflictException('An account with that email already exists.');
    }
  }

  async createCourierAccount(
    input: { courierId: string; name: string; email: string; password: string },
    session?: ClientSession,
  ): Promise<void> {
    await this.users.create(
      [
        {
          email: input.email.trim().toLowerCase(),
          passwordHash: await bcrypt.hash(input.password, this.rounds),
          name: input.name.trim(),
          title: 'Courier',
          role: UserRole.Courier,
          courierId: input.courierId,
        },
      ],
      { session },
    );
  }

  /**
   * Keeps the account in step with an edited roster row.
   *
   * A blank password means "keep the current one" — the edit form leaves the
   * field empty, and treating that as "set the password to empty" would lock
   * the driver out of their own portal.
   */
  async syncCourierAccount(
    input: { courierId: string; name?: string; email?: string; password?: string },
    session?: ClientSession,
  ): Promise<void> {
    const update: Record<string, unknown> = {};

    if (input.name !== undefined) update.name = input.name.trim();
    if (input.email !== undefined) update.email = input.email.trim().toLowerCase();

    const password = input.password?.trim();
    if (password) {
      update.passwordHash = await bcrypt.hash(password, this.rounds);
    }

    if (Object.keys(update).length === 0) return;

    await this.users
      .updateOne({ courierId: input.courierId, role: UserRole.Courier }, { $set: update })
      .session(session ?? null);
  }

  /**
   * Removes the login with the roster row.
   *
   * Leaving it behind would let someone sign in as a courier who is no longer
   * on the roster — with a session scoped to deliveries that nobody can see.
   */
  async removeCourierAccount(
    courierId: string,
    session?: ClientSession,
  ): Promise<void> {
    await this.users
      .deleteOne({ courierId, role: UserRole.Courier })
      .session(session ?? null);
  }

  /** Whether a roster row currently has a way to sign in. */
  async hasCourierAccount(courierId: string): Promise<boolean> {
    return (
      (await this.users.exists({ courierId, role: UserRole.Courier })) !== null
    );
  }
}
