import { IsInt, IsNotEmpty, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateAyahNoteDto {
  /** Student profile ObjectId. */
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsInt()
  @Min(1)
  @Max(114)
  surahNumber: number;

  @IsInt()
  @Min(1)
  ayahNumber: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  text: string;
}
