import { IsString } from 'class-validator';

export class AssignSheikhDto {
  /** The sheikh profile id (not userId) to assign to this circle. */
  @IsString()
  sheikhId: string;
}
