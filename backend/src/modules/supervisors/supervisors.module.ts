import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Supervisor, SupervisorSchema } from '@database/mongoose/schemas';
import { SUPERVISOR_REPOSITORY } from './domain/repositories/supervisor.repository.interface';
import { SupervisorRepository } from './infrastructure/repositories/supervisor.repository';
import { CreateSupervisorUseCase } from './application/use-cases/create-supervisor.use-case';
import { GetSupervisorUseCase } from './application/use-cases/get-supervisor.use-case';
import { GetMySupervisorProfileUseCase } from './application/use-cases/get-my-supervisor-profile.use-case';
import { ListSupervisorsUseCase } from './application/use-cases/list-supervisors.use-case';
import { UpdateSupervisorUseCase } from './application/use-cases/update-supervisor.use-case';
import { SupervisorsController } from './infrastructure/controllers/supervisors.controller';

/** Supervisors Module — Phase 6. Exports SUPERVISOR_REPOSITORY for use by CirclesModule. */
@Module({
  imports: [MongooseModule.forFeature([{ name: Supervisor.name, schema: SupervisorSchema }])],
  controllers: [SupervisorsController],
  providers: [
    { provide: SUPERVISOR_REPOSITORY, useClass: SupervisorRepository },
    CreateSupervisorUseCase,
    GetSupervisorUseCase,
    GetMySupervisorProfileUseCase,
    ListSupervisorsUseCase,
    UpdateSupervisorUseCase,
  ],
  exports: [SUPERVISOR_REPOSITORY],
})
export class SupervisorsModule {}
