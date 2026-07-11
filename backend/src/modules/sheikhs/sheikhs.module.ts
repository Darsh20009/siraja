import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Sheikh, SheikhSchema } from '@database/mongoose/schemas';
import { SHEIKH_REPOSITORY } from './domain/repositories/sheikh.repository.interface';
import { SheikhRepository } from './infrastructure/repositories/sheikh.repository';
import { CreateSheikhUseCase } from './application/use-cases/create-sheikh.use-case';
import { GetSheikhUseCase } from './application/use-cases/get-sheikh.use-case';
import { GetMySheikhProfileUseCase } from './application/use-cases/get-my-sheikh-profile.use-case';
import { ListSheikhsUseCase } from './application/use-cases/list-sheikhs.use-case';
import { UpdateSheikhUseCase } from './application/use-cases/update-sheikh.use-case';
import { SheikhsController } from './infrastructure/controllers/sheikhs.controller';

/** Sheikhs Module — Phase 6. Exports SHEIKH_REPOSITORY for use by CirclesModule and StudentsModule. */
@Module({
  imports: [MongooseModule.forFeature([{ name: Sheikh.name, schema: SheikhSchema }])],
  controllers: [SheikhsController],
  providers: [
    { provide: SHEIKH_REPOSITORY, useClass: SheikhRepository },
    CreateSheikhUseCase,
    GetSheikhUseCase,
    GetMySheikhProfileUseCase,
    ListSheikhsUseCase,
    UpdateSheikhUseCase,
  ],
  exports: [SHEIKH_REPOSITORY],
})
export class SheikhsModule {}
