import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Attendance, AttendanceSchema } from '@database/mongoose/schemas';
import { ATTENDANCE_REPOSITORY } from './domain/repositories/attendance.repository.interface';
import { AttendanceRepository } from './infrastructure/repositories/attendance.repository';
import { CreateAttendanceUseCase } from './application/use-cases/create-attendance.use-case';
import { BulkCreateAttendanceUseCase } from './application/use-cases/bulk-create-attendance.use-case';
import { ListAttendanceUseCase } from './application/use-cases/list-attendance.use-case';
import { GetAttendanceUseCase } from './application/use-cases/get-attendance.use-case';
import { UpdateAttendanceUseCase } from './application/use-cases/update-attendance.use-case';
import { AttendanceController } from './infrastructure/controllers/attendance.controller';
import { StudentsModule } from '@modules/students/students.module';
import { SheikhsModule } from '@modules/sheikhs/sheikhs.module';
import { ParentsModule } from '@modules/parents/parents.module';

/**
 * Attendance Module — Phase 8.
 *
 * Tracks per-student attendance for sessions/circles with statuses:
 * Present, Absent, Late, Excused.
 *
 * Imports StudentsModule, SheikhsModule, ParentsModule for role-scoped
 * ownership enforcement in use-cases.
 * Exports ATTENDANCE_REPOSITORY so ReportingModule can query attendance
 * rates without circular dependency.
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Attendance.name, schema: AttendanceSchema }]),
    StudentsModule,
    SheikhsModule,
    ParentsModule,
  ],
  controllers: [AttendanceController],
  providers: [
    { provide: ATTENDANCE_REPOSITORY, useClass: AttendanceRepository },
    CreateAttendanceUseCase,
    BulkCreateAttendanceUseCase,
    ListAttendanceUseCase,
    GetAttendanceUseCase,
    UpdateAttendanceUseCase,
  ],
  exports: [ATTENDANCE_REPOSITORY],
})
export class AttendanceModule {}
