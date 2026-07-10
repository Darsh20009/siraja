import { IsOptional, IsString } from 'class-validator';

export class ListSurahsQueryDto {
  @IsOptional()
  @IsString()
  q?: string;
}
