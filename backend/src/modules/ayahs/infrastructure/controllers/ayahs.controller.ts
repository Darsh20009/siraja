import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { RequirePermissions } from '@common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '@shared/authorization/permission-registry';
import { ListAyahsBySurahUseCase } from '../../application/use-cases/list-ayahs-by-surah.use-case';
import { GetAyahUseCase } from '../../application/use-cases/get-ayah.use-case';
import { GetAyahsByPageUseCase } from '../../application/use-cases/get-ayahs-by-page.use-case';
import { GetAyahsByJuzUseCase } from '../../application/use-cases/get-ayahs-by-juz.use-case';

@Controller('quran')
export class AyahsController {
  constructor(
    private readonly listAyahsBySurahUseCase: ListAyahsBySurahUseCase,
    private readonly getAyahUseCase: GetAyahUseCase,
    private readonly getAyahsByPageUseCase: GetAyahsByPageUseCase,
    private readonly getAyahsByJuzUseCase: GetAyahsByJuzUseCase,
  ) {}

  @Get('surahs/:surahNumber/ayahs')
  @RequirePermissions(PERMISSIONS.QURAN.READ!)
  listBySurah(@Param('surahNumber', ParseIntPipe) surahNumber: number) {
    return this.listAyahsBySurahUseCase.execute(surahNumber);
  }

  @Get('surahs/:surahNumber/ayahs/:ayahNumber')
  @RequirePermissions(PERMISSIONS.QURAN.READ!)
  getOne(
    @Param('surahNumber', ParseIntPipe) surahNumber: number,
    @Param('ayahNumber', ParseIntPipe) ayahNumber: number,
  ) {
    return this.getAyahUseCase.execute(surahNumber, ayahNumber);
  }

  @Get('pages/:pageNumber/ayahs')
  @RequirePermissions(PERMISSIONS.QURAN.READ!)
  getByPage(@Param('pageNumber', ParseIntPipe) pageNumber: number) {
    return this.getAyahsByPageUseCase.execute(pageNumber);
  }

  @Get('juz/:juzNumber/ayahs')
  @RequirePermissions(PERMISSIONS.QURAN.READ!)
  getByJuz(@Param('juzNumber', ParseIntPipe) juzNumber: number) {
    return this.getAyahsByJuzUseCase.execute(juzNumber);
  }
}
