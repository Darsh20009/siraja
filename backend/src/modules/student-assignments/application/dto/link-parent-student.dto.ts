import { IsString } from 'class-validator';

export class LinkParentStudentDto {
  /** Student profile id. */
  @IsString()
  studentId: string;

  /** Parent profile id. */
  @IsString()
  parentId: string;
}
