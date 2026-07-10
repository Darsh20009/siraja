import { IsEnum, IsOptional } from 'class-validator';
import { QuranBookmarkType } from '@shared/enums/quran-bookmark-type.enum';

export class ListBookmarksQueryDto {
  @IsOptional()
  @IsEnum(QuranBookmarkType)
  type?: QuranBookmarkType;
}
