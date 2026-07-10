import { Controller, Get } from '@nestjs/common';
import { RequirePermissions } from '@common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '@shared/authorization/permission-registry';
import { ListJuzsUseCase } from '../../application/use-cases/list-juzs.use-case';
import { ListPagesUseCase } from '../../application/use-cases/list-pages.use-case';

/**
 * Quran Metadata Module — navigation reference tables (Juz/Page
 * boundaries) that let the frontend build a jump-to-Juz / jump-to-Page
 * picker without scanning the `ayahs` collection.
 */
@Controller('quran')
export class QuranMetadataController {
  constructor(
    private readonly listJuzsUseCase: ListJuzsUseCase,
    private readonly listPagesUseCase: ListPagesUseCase,
  ) {}

  @Get('juz')
  @RequirePermissions(PERMISSIONS.QURAN.READ!)
  listJuzs() {
    return this.listJuzsUseCase.execute();
  }

  @Get('pages')
  @RequirePermissions(PERMISSIONS.QURAN.READ!)
  listPages() {
    return this.listPagesUseCase.execute();
  }
}
