import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewAssignmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  feedback?: string;
}
