import { IsString } from 'class-validator';

export class AssignSupervisorDto {
  /** The supervisor profile id (not userId) to assign to this circle. */
  @IsString()
  supervisorId: string;
}
