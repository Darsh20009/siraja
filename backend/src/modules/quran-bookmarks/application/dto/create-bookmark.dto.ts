import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { QuranBookmarkType } from '@shared/enums/quran-bookmark-type.enum';

export class CreateBookmarkDto {
  @IsInt()
  @Min(1)
  @Max(114)
  surahNumber: number;

  @IsInt()
  @Min(1)
  ayahNumber: number;

  @IsEnum(QuranBookmarkType)
  type: QuranBookmarkType;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;
}
