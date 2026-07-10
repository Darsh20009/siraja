import { IsNotEmpty, MaxLength } from 'class-validator';

export class UpdateNoteDto {
  @IsNotEmpty()
  @MaxLength(5000)
  text: string;
}
