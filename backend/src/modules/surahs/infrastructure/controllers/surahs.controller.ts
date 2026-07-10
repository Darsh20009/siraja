import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { RequirePermissions } from '@common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '@shared/authorization/permission-registry';
import { ListSurahsUseCase } from '../../application/use-cases/list-surahs.use-case';
import { GetSurahUseCase } from '../../application/use-cases/get-surah.use-case';
import { ListSurahsQueryDto } from '../../application/dto/list-surahs-query.dto';

@Controller('quran/surahs')
export class SurahsController {
  constructor(
    private readonly listSurahsUseCase: ListSurahsUseCase,
    private readonly getSurahUseCase: GetSurahUseCase,
  ) {}

  @Get()
  @RequirePermissions(PERMISSIONS.QURAN.READ!)
  list(@Query() query: ListSurahsQueryDto) {
    return this.listSurahsUseCase.execute(query.q);
  }

  @Get(':surahNumber')
  @RequirePermissions(PERMISSIONS.QURAN.READ!)
  get(@Param('surahNumber', ParseIntPipe) surahNumber: number) {
    return this.getSurahUseCase.execute(surahNumber);
  }
}
