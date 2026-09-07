import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { Counter, CounterSchema } from './schemas/counter.schema';
import { SequenceService } from './sequence.service';

/**
 * `onConnectionCreate` is skipped under `lazyConnection`, so the listeners are
 * attached through `connectionFactory` instead — otherwise a connection
 * failure would be entirely silent.
 */
function withLogging(connection: Connection): Connection {
  const logger = new Logger('Database');

  connection.on('connected', () => logger.log(`Connected to ${connection.name}`));
  connection.on('disconnected', () => logger.warn('Disconnected'));
  connection.on('error', (error: Error) =>
    logger.error(`Connection error: ${error.message}`),
  );

  return connection;
}

/**
 * The single Mongoose connection.
 *
 * Registered async so the URI comes from validated config rather than being
 * read at import time. Feature modules attach their schemas with
 * `MongooseModule.forFeature([...])` and never open a connection of their own.
 */
@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('database.uri'),

        /**
         * Boot does not block on the database.
         *
         * Without this, an unreachable Mongo means the HTTP server never
         * opens — so `/api/health` and `/api/docs`, the two things you need in
         * order to *diagnose* the outage, are the first to disappear. The
         * connection is established in the background and the health endpoint
         * reports its real state; queries buffer until it lands.
         */
        lazyConnection: true,

        connectionFactory: withLogging,

        /**
         * Atlas is a replica set, which is what makes multi-document
         * transactions available for the ledger work later on.
         */
        retryWrites: true,

        /**
         * Index builds are a deploy-time operation, not a boot-time one.
         *
         * Mongoose otherwise issues `createIndex` for every declared index on
         * every start. On an empty database that is free; on a populated one it
         * is a foreground build racing the first requests. In development the
         * convenience is worth it, so the switch is on the environment rather
         * than off everywhere.
         */
        autoIndex: config.getOrThrow<string>('app.nodeEnv') !== 'production',

        /**
         * The default pool of 100 is far more than a till needs and far more
         * than Atlas's smaller tiers allow per client. Ten is comfortable for
         * this workload and leaves headroom for a second process.
         */
        maxPoolSize: 10,
        minPoolSize: 1,

        /**
         * Fail a request against an unreachable database in five seconds
         * instead of the default thirty — the caller gets an error while
         * anyone is still watching, rather than a socket that eventually times
         * out somewhere upstream.
         */
        serverSelectionTimeoutMS: 5_000,
      }),
    }),
    MongooseModule.forFeature([{ name: Counter.name, schema: CounterSchema }]),
  ],
  providers: [SequenceService],
  /** Every module that mints a human-readable id shares this one counter store. */
  exports: [SequenceService],
})
export class DatabaseModule {}
