import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ApiOkResponse, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Connection, ConnectionStates } from 'mongoose';

export class HealthResponse {
  @ApiProperty({ example: 'ok', description: 'The API process is serving requests.' })
  status!: 'ok';

  @ApiProperty({
    enum: ['connected', 'disconnected'],
    example: 'connected',
    description: 'Live state of the Mongoose connection.',
  })
  db!: 'connected' | 'disconnected';
}

/**
 * Liveness probe. Deliberately hand-rolled rather than Terminus: the contract
 * is a fixed two-field shape, and Terminus emits its own envelope.
 *
 * Always 200 — the endpoint reports what it found; deciding whether a
 * disconnected database means "unhealthy" is the caller's call.
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get()
  @ApiOperation({
    summary: 'Liveness and database connectivity',
    description:
      'Always returns 200 while the process is up. Read `db` to tell whether the database is actually reachable.',
  })
  @ApiOkResponse({ type: HealthResponse })
  check(): HealthResponse {
    return {
      status: 'ok',
      db:
        this.connection.readyState === ConnectionStates.connected
          ? 'connected'
          : 'disconnected',
    };
  }
}
