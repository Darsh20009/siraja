import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { STORAGE_PROVIDER } from './storage-provider.interface';
import { S3StorageProvider } from './providers/s3-storage.provider';
import { NoopStorageProvider } from './providers/noop-storage.provider';

/**
 * StorageModule — global module providing IStorageProvider via DI.
 *
 * Marked @Global so every feature module can inject STORAGE_PROVIDER
 * without importing StorageModule explicitly.
 *
 * Driver selection:
 *   STORAGE_DRIVER=s3    → S3StorageProvider (works with R2, B2, MinIO)
 *   (unset / anything else) → NoopStorageProvider (dev/CI safe no-op)
 */
@Global()
@Module({
  providers: [
    S3StorageProvider,
    NoopStorageProvider,
    {
      provide: STORAGE_PROVIDER,
      inject: [ConfigService, S3StorageProvider, NoopStorageProvider],
      useFactory: (
        config: ConfigService,
        s3: S3StorageProvider,
        noop: NoopStorageProvider,
      ): S3StorageProvider | NoopStorageProvider => {
        const driver = config.get<string>('storage.driver', 'noop');
        return driver === 's3' ? s3 : noop;
      },
    },
  ],
  exports: [STORAGE_PROVIDER],
})
export class StorageModule {}
