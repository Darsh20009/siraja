export interface UploadOptions {
  /** Key/path within the bucket, e.g. `tenants/abc123/logo.png` */
  key: string;
  /** Raw file buffer */
  buffer: Buffer;
  /** MIME type, e.g. `image/png` */
  contentType: string;
  /** Optional metadata tags */
  metadata?: Record<string, string>;
}

export interface SignedUploadUrlOptions {
  /** Key/path within the bucket */
  key: string;
  /** MIME type the client will upload */
  contentType: string;
  /** URL expiry in seconds (default: 300) */
  expiresInSeconds?: number;
  /** Max file size in bytes (enforced via Content-Length restriction) */
  maxSizeBytes?: number;
}

export interface SignedDownloadUrlOptions {
  key: string;
  expiresInSeconds?: number;
}

export interface StorageUploadResult {
  /** Publicly accessible URL (via CDN/public bucket) or storage URL */
  publicUrl: string;
  /** Storage key used */
  key: string;
}

export interface IStorageProvider {
  /** Upload a file directly from the server. */
  upload(options: UploadOptions): Promise<StorageUploadResult>;

  /** Delete an object by key. No-op if not found. */
  delete(key: string): Promise<void>;

  /** Generate a presigned URL that lets a client upload directly to storage. */
  getSignedUploadUrl(options: SignedUploadUrlOptions): Promise<string>;

  /** Generate a presigned URL for a client to download a private object. */
  getSignedDownloadUrl(options: SignedDownloadUrlOptions): Promise<string>;
}

export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');
