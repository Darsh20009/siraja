import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateParentDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  relationship?: string;

  @IsOptional()
  @IsBoolean()
  receiveProgressReports?: boolean;
}
