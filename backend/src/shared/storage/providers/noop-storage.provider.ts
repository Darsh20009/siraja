import { Injectable, Logger } from '@nestjs/common';
import {
  IStorageProvider,
  UploadOptions,
  StorageUploadResult,
  SignedUploadUrlOptions,
  SignedDownloadUrlOptions,
} from '../storage-provider.interface';

/**
 * NoopStorageProvider — used when STORAGE_DRIVER is not configured.
 *
 * Logs a warning on every call and returns stub values so the application
 * starts cleanly in dev/CI environments without storage credentials.
 * Never use in production.
 */
@Injectable()
export class NoopStorageProvider implements IStorageProvider {
  private readonly logger = new Logger(NoopStorageProvider.name);

  private warn(method: string, key: string) {
    this.logger.warn(
      `Storage is not configured (STORAGE_DRIVER unset). ${method}("${key}") is a no-op. ` +
        'Set STORAGE_DRIVER=s3 and related vars to enable real storage.',
    );
  }

  async upload(options: UploadOptions): Promise<StorageUploadResult> {
    this.warn('upload', options.key);
    return { key: options.key, publicUrl: `https://noop-storage/${options.key}` };
  }

  async delete(key: string): Promise<void> {
    this.warn('delete', key);
  }

  async getSignedUploadUrl(options: SignedUploadUrlOptions): Promise<string> {
    this.warn('getSignedUploadUrl', options.key);
    return `https://noop-storage/upload/${options.key}?stub=true`;
  }

  async getSignedDownloadUrl(options: SignedDownloadUrlOptions): Promise<string> {
    this.warn('getSignedDownloadUrl', options.key);
    return `https://noop-storage/download/${options.key}?stub=true`;
  }
}
