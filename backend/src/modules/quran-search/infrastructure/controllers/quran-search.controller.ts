import { Controller, Get, Query } from '@nestjs/common';
import { RequirePermissions } from '@common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '@shared/authorization/permission-registry';
import { SearchQuranUseCase } from '../../application/use-cases/search-quran.use-case';
import { QuranSearchQueryDto } from '../../application/dto/quran-search-query.dto';

/**
 * Quran Search Module — unified search across Surah names and
 * Ayah text/keywords. See `docs/architecture/11-quran-blueprint.md`
 * §Search Architecture.
 */
@Controller('quran/search')
export class QuranSearchController {
  constructor(private readonly searchQuranUseCase: SearchQuranUseCase) {}

  @Get()
  @RequirePermissions(PERMISSIONS.QURAN.READ!)
  search(@Query() query: QuranSearchQueryDto) {
    return this.searchQuranUseCase.execute(query.q);
  }
}
