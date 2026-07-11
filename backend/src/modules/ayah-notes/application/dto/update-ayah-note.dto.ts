import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateAyahNoteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  text: string;
}
