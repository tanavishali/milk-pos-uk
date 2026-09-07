import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditInterceptor } from './audit.interceptor';
import { AuditService } from './audit.service';
import { AuditLog, AuditLogSchema } from './schemas/audit-log.schema';

/**
 * Global, because the interceptor that uses it is registered globally in
 * `AppModule` and would otherwise need this module imported there *and*
 * re-exported through every feature module that happens to be on the path.
 */
@Global()
@Module({
  imports: [
    MongooseModule.forFeature([{ name: AuditLog.name, schema: AuditLogSchema }]),
  ],
  providers: [AuditService, AuditInterceptor],
  /** The interceptor is exported so `AppModule` can register this very
   *  instance globally with `useExisting`, rather than building a second one
   *  whose dependencies it cannot resolve. */
  exports: [AuditService, AuditInterceptor],
})
export class AuditModule {}
