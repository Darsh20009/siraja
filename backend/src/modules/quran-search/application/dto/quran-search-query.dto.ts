import { IsNotEmpty, IsString } from 'class-validator';

export class QuranSearchQueryDto {
  @IsString()
  @IsNotEmpty()
  q: string;
}
