import { SetMetadata, type CustomDecorator } from '@nestjs/common';
import type { UserRole } from '../enums';

export const ROLES_KEY = 'auth:roles';

/**
 * Restricts a route to the listed roles.
 *
 * Authentication answers "who is this"; this answers "are they allowed to do
 * it". They are separate questions and separate guards, because most of the
 * damage available in a POS is not from an unauthenticated stranger but from a
 * driver's token reaching the registries — a courier holds a valid token, so
 * `JwtAuthGuard` alone would wave them through to `DELETE /payments`.
 *
 * A route with no `@Roles()` is open to **any** signed-in account. That is
 * correct for the handful the courier portal shares with the terminal (their
 * own deliveries, a doorstep balance, recording cash); everything else names
 * its roles.
 */
export const Roles = (...roles: UserRole[]): CustomDecorator<string> =>
  SetMetadata(ROLES_KEY, roles);
