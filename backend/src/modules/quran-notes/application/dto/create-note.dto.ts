import { IsEnum, IsInt, IsNotEmpty, IsOptional, Max, MaxLength, Min } from 'class-validator';
import { QuranNoteScope } from '@shared/enums/quran-note-scope.enum';

export class CreateNoteDto {
  @IsEnum(QuranNoteScope)
  scope: QuranNoteScope;

  @IsInt()
  @Min(1)
  @Max(114)
  surahNumber: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  ayahNumber?: number;

  @IsNotEmpty()
  @MaxLength(5000)
  text: string;
}
