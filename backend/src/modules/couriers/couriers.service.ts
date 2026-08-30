import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { SequenceService } from '../../database/sequence.service';
import { AccountsService } from '../auth/accounts.service';
import { CourierDto } from './dto/courier.dto';
import { CreateCourierDto } from './dto/create-courier.dto';
import { UpdateCourierDto } from './dto/update-courier.dto';
import { Courier, CourierDocument } from './schemas/courier.schema';

@Injectable()
export class CouriersService {
  constructor(
    @InjectModel(Courier.name) private readonly couriers: Model<CourierDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly sequence: SequenceService,
    private readonly accounts: AccountsService,
  ) {}

  async list(): Promise<CourierDto[]> {
    const rows = await this.couriers.find().sort({ createdAt: -1 });
    return rows.map((row) => CourierDto.from(row));
  }

  async findOne(code: string): Promise<CourierDto> {
    return CourierDto.from(await this.require(code));
  }

  /**
   * Registers a courier and their sign-in account together.
   *
   * The two writes share a transaction because either half alone is a broken
   * state: a roster row with no account is a driver who cannot open the
   * portal, and an account with no roster row is a credential pointing at
   * nothing. Atlas is a replica set, so this is available.
   */
  async create(dto: CreateCourierDto): Promise<CourierDto> {
    await this.accounts.assertEmailFree(dto.email);

    const code = await this.sequence.next('COUR');
    const session = await this.connection.startSession();

    try {
      let created!: CourierDocument;

      await session.withTransaction(async () => {
        const [courier] = await this.couriers.create(
          [
            {
              code,
              name: dto.name.trim(),
              phone: dto.phone.trim(),
              idcard: dto.idcard.trim(),
              email: dto.email.trim(),
              area: dto.area.trim(),
              address: dto.address.trim(),
            },
          ],
          { session },
        );

        await this.accounts.createCourierAccount(
          {
            courierId: code,
            name: dto.name,
            email: dto.email,
            password: dto.password,
          },
          session,
        );

        created = courier;
      });

      return CourierDto.from(created);
    } finally {
      await session.endSession();
    }
  }

  /** A renamed or re-addressed courier keeps their login, and it follows the change. */
  async update(code: string, dto: UpdateCourierDto): Promise<CourierDto> {
    const courier = await this.require(code);

    if (
      dto.email !== undefined &&
      dto.email.trim().toLowerCase() !== courier.email
    ) {
      await this.accounts.assertEmailFree(dto.email);
    }

    const session = await this.connection.startSession();

    try {
      await session.withTransaction(async () => {
        if (dto.name !== undefined) courier.name = dto.name.trim();
        if (dto.phone !== undefined) courier.phone = dto.phone.trim();
        if (dto.idcard !== undefined) courier.idcard = dto.idcard.trim();
        if (dto.email !== undefined) courier.email = dto.email.trim();
        if (dto.area !== undefined) courier.area = dto.area.trim();
        if (dto.address !== undefined) courier.address = dto.address.trim();

        await courier.save({ session });

        await this.accounts.syncCourierAccount(
          {
            courierId: code,
            name: dto.name,
            email: dto.email,
            // Blank means "keep the current one" — the edit form sends an empty
            // field when it was never touched.
            password: dto.password,
          },
          session,
        );
      });

      return CourierDto.from(courier);
    } finally {
      await session.endSession();
    }
  }

  /** The account goes with the row, or someone off the roster could still sign in. */
  async remove(code: string): Promise<{ id: string }> {
    await this.require(code);

    const session = await this.connection.startSession();

    try {
      await session.withTransaction(async () => {
        await this.couriers.deleteOne({ code }).session(session);
        await this.accounts.removeCourierAccount(code, session);
      });

      return { id: code };
    } finally {
      await session.endSession();
    }
  }

  private async require(code: string): Promise<CourierDocument> {
    const courier = await this.couriers.findOne({ code });

    if (!courier) {
      throw new NotFoundException(`Courier ${code} not found.`);
    }

    return courier;
  }
}
