import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand as PutObjectCommandForPresign } from '@aws-sdk/client-s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import {
  IStorageProvider,
  UploadOptions,
  StorageUploadResult,
  SignedUploadUrlOptions,
  SignedDownloadUrlOptions,
} from '../storage-provider.interface';

/**
 * S3-compatible storage provider.
 *
 * Works with:
 * - AWS S3  (endpoint left blank, region = 'us-east-1' etc.)
 * - Cloudflare R2  (endpoint = 'https://<accountid>.r2.cloudflarestorage.com', region = 'auto')
 * - Backblaze B2  (endpoint = B2 S3-compatible endpoint)
 * - MinIO  (endpoint = MinIO server URL, region = 'us-east-1')
 *
 * Environment variables:
 *   STORAGE_BUCKET, STORAGE_REGION, STORAGE_ENDPOINT,
 *   STORAGE_ACCESS_KEY_ID, STORAGE_SECRET_ACCESS_KEY,
 *   STORAGE_PUBLIC_URL  (CDN/public prefix for download URLs)
 */
@Injectable()
export class S3StorageProvider implements IStorageProvider {
  private readonly logger = new Logger(S3StorageProvider.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>('storage.region', 'auto');
    const endpoint = this.configService.get<string>('storage.endpoint', '');
    const accessKeyId = this.configService.get<string>('storage.accessKeyId', '');
    const secretAccessKey = this.configService.get<string>('storage.secretAccessKey', '');
    this.bucket = this.configService.get<string>('storage.bucket', 'siraja-media');
    this.publicUrl = this.configService.get<string>('storage.publicUrl', '').replace(/\/$/, '');

    this.client = new S3Client({
      region,
      ...(endpoint ? { endpoint, forcePathStyle: false } : {}),
      credentials:
        accessKeyId && secretAccessKey
          ? { accessKeyId, secretAccessKey }
          : undefined,
    });
  }

  async upload(options: UploadOptions): Promise<StorageUploadResult> {
    const { key, buffer, contentType, metadata } = options;
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      Metadata: metadata,
    });

    await this.client.send(command);
    const publicUrl = this.publicUrl ? `${this.publicUrl}/${key}` : key;
    this.logger.log(`Uploaded: ${key} (${contentType}, ${buffer.length} bytes)`);
    return { key, publicUrl };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    this.logger.log(`Deleted: ${key}`);
  }

  async getSignedUploadUrl(options: SignedUploadUrlOptions): Promise<string> {
    const { key, contentType, expiresInSeconds = 300 } = options;
    const command = new PutObjectCommandForPresign({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    const url = await getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
    this.logger.log(`Signed upload URL generated: ${key} (expires ${expiresInSeconds}s)`);
    return url;
  }

  async getSignedDownloadUrl(options: SignedDownloadUrlOptions): Promise<string> {
    const { key, expiresInSeconds = 3600 } = options;
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }
}
