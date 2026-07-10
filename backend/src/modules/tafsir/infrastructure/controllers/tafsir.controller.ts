import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { RequirePermissions } from '@common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '@shared/authorization/permission-registry';
import { GetTafsirForAyahUseCase } from '../../application/use-cases/get-tafsir-for-ayah.use-case';
import { GetTafsirQueryDto } from '../../application/dto/get-tafsir-query.dto';

@Controller('quran/surahs/:surahNumber/ayahs/:ayahNumber/tafsir')
export class TafsirController {
  constructor(private readonly getTafsirForAyahUseCase: GetTafsirForAyahUseCase) {}

  @Get()
  @RequirePermissions(PERMISSIONS.QURAN.READ!)
  get(
    @Param('surahNumber', ParseIntPipe) surahNumber: number,
    @Param('ayahNumber', ParseIntPipe) ayahNumber: number,
    @Query() query: GetTafsirQueryDto,
  ) {
    return this.getTafsirForAyahUseCase.execute(surahNumber, ayahNumber, query.source);
  }
}
