import { Module } from '@nestjs/common';

/**
 * Users Module
 *
 * Encapsulates the users bounded context following Clean Architecture:
 * - domain: entities, value objects, repository interfaces (no framework deps)
 * - application: use cases (business rules) and DTOs
 * - infrastructure: controllers, Mongoose schemas/repositories, external adapters
 *
 * Structure scaffolded only. Providers/controllers to be wired when
 * features for this module are implemented.
 */
@Module({
  imports: [],
  controllers: [],
  providers: [],
  exports: [],
})
export class UsersModule {}
