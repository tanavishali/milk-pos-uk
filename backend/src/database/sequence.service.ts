import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Counter, CounterDocument } from './schemas/counter.schema';

/**
 * Human-readable ids: `PROD-101`, `TRX-8921`.
 *
 * The frontend prints these on cards and receipts, so they have to stay short
 * and ordered — a raw `ObjectId` on a docket would be unreadable.
 *
 * `findOneAndUpdate` with `$inc` is a single atomic document update, so two
 * simultaneous creates cannot receive the same number. The mock's approach —
 * read the highest id in use, add one — has a race between the read and the
 * insert; that is exactly the duplicate-id bug the functional doc describes,
 * and it is worth not reproducing server-side.
 */
@Injectable()
export class SequenceService {
  constructor(
    @InjectModel(Counter.name) private readonly counters: Model<CounterDocument>,
  ) {}

  async next(prefix: string, startAt = 100): Promise<string> {
    const counter = await this.counters.findOneAndUpdate(
      { _id: prefix },
      { $inc: { value: 1 }, $setOnInsert: {} },
      { upsert: true, new: true, setDefaultsOnInsert: false },
    );

    /**
     * A brand-new counter comes back as 1, which would mint `PROD-1` beside a
     * seeded `PROD-101`. Offsetting keeps a fresh database and a seeded one
     * producing the same shape of id.
     */
    const value = counter.value <= 1 ? startAt + 1 : counter.value;

    if (counter.value <= 1) {
      await this.counters.updateOne({ _id: prefix }, { $set: { value } });
    }

    return `${prefix}-${value}`;
  }

  /** Lifts the counter so it never re-issues an id the seed already used. */
  async ensureAtLeast(prefix: string, value: number): Promise<void> {
    await this.counters.updateOne(
      { _id: prefix },
      { $max: { value } },
      { upsert: true },
    );
  }
}
