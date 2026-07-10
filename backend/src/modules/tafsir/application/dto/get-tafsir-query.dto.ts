import { IsOptional, IsString } from 'class-validator';

export class GetTafsirQueryDto {
  @IsOptional()
  @IsString()
  source?: string;
}
