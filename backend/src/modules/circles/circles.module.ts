import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Group, GroupSchema } from '@database/mongoose/schemas';
import { CIRCLE_REPOSITORY } from './domain/repositories/circle.repository.interface';
import { CircleRepository } from './infrastructure/repositories/circle.repository';
import { CreateCircleUseCase } from './application/use-cases/create-circle.use-case';
import { GetCircleUseCase } from './application/use-cases/get-circle.use-case';
import { ListCirclesUseCase } from './application/use-cases/list-circles.use-case';
import { UpdateCircleUseCase } from './application/use-cases/update-circle.use-case';
import { AssignSheikhToCircleUseCase } from './application/use-cases/assign-sheikh-to-circle.use-case';
import { UnassignSheikhFromCircleUseCase } from './application/use-cases/unassign-sheikh-from-circle.use-case';
import { AssignSupervisorToCircleUseCase } from './application/use-cases/assign-supervisor-to-circle.use-case';
import { RemoveCircleUseCase } from './application/use-cases/remove-circle.use-case';
import { UnassignSupervisorFromCircleUseCase } from './application/use-cases/unassign-supervisor-from-circle.use-case';
import { CirclesController } from './infrastructure/controllers/circles.controller';
import { SheikhsModule } from '@modules/sheikhs/sheikhs.module';
import { SupervisorsModule } from '@modules/supervisors/supervisors.module';

/**
 * Circles Module — Phase 6.
 *
 * Imports SheikhsModule and SupervisorsModule to access their exported
 * repository tokens; needed by the sheikh/supervisor assignment use-cases
 * which must sync both sides of the bidirectional relationship.
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Group.name, schema: GroupSchema }]),
    SheikhsModule,
    SupervisorsModule,
  ],
  controllers: [CirclesController],
  providers: [
    { provide: CIRCLE_REPOSITORY, useClass: CircleRepository },
    CreateCircleUseCase,
    GetCircleUseCase,
    ListCirclesUseCase,
    UpdateCircleUseCase,
    RemoveCircleUseCase,
    AssignSheikhToCircleUseCase,
    UnassignSheikhFromCircleUseCase,
    AssignSupervisorToCircleUseCase,
    UnassignSupervisorFromCircleUseCase,
  ],
  exports: [CIRCLE_REPOSITORY],
})
export class CirclesModule {}
