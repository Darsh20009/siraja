import { Inject, Injectable } from '@nestjs/common';
import {
  IQuranMetadataRepository,
  QURAN_METADATA_REPOSITORY,
} from '../../domain/repositories/quran-metadata.repository.interface';

@Injectable()
export class ListPagesUseCase {
  constructor(
    @Inject(QURAN_METADATA_REPOSITORY) private readonly repository: IQuranMetadataRepository,
  ) {}

  execute() {
    return this.repository.findAllPages();
  }
}
