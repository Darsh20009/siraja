/**
 * Phase 12A — Storage Providers Unit Tests
 *
 * Tests: NoopStorageProvider, S3StorageProvider
 *
 * Strategy:
 * - NoopStorageProvider: pure unit test — no mocking needed.
 * - S3StorageProvider: AWS SDK client is mocked at the module level so no
 *   real HTTP calls are made. Tests verify correct S3Client construction and
 *   presigned URL delegation.
 */

import { Logger } from '@nestjs/common';
import { NoopStorageProvider } from './providers/noop-storage.provider';
import { S3StorageProvider } from './providers/s3-storage.provider';

// ─── Silence logger output during tests ──────────────────────────────────────

beforeAll(() => {
  jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
});

afterAll(() => jest.restoreAllMocks());

// ─── NoopStorageProvider ──────────────────────────────────────────────────────

describe('NoopStorageProvider', () => {
  let provider: NoopStorageProvider;

  beforeEach(() => {
    provider = new NoopStorageProvider();
  });

  it('upload() resolves without throwing', async () => {
    await expect(
      provider.upload({ key: 'test/file.png', buffer: Buffer.from('data'), contentType: 'image/png' }),
    ).resolves.not.toThrow();
  });

  it('upload() returns a stub result with the original key', async () => {
    const result = await provider.upload({
      key: 'tenants/abc/logo.png',
      buffer: Buffer.from('img'),
      contentType: 'image/png',
    });
    expect(result.key).toBe('tenants/abc/logo.png');
    expect(result.publicUrl).toContain('tenants/abc/logo.png');
  });

  it('delete() resolves without throwing', async () => {
    await expect(provider.delete('some/key.png')).resolves.not.toThrow();
  });

  it('getSignedUploadUrl() resolves without throwing', async () => {
    await expect(
      provider.getSignedUploadUrl({ key: 'test/upload.png', contentType: 'image/png', expiresInSeconds: 300 }),
    ).resolves.not.toThrow();
  });

  it('getSignedUploadUrl() returns a stub URL string', async () => {
    const url = await provider.getSignedUploadUrl({
      key: 'tenants/tid/logo.png',
      contentType: 'image/png',
      expiresInSeconds: 300,
    });
    expect(typeof url).toBe('string');
    expect(url.length).toBeGreaterThan(10);
    expect(url).toContain('tenants/tid/logo.png');
  });

  it('getSignedDownloadUrl() resolves without throwing', async () => {
    await expect(
      provider.getSignedDownloadUrl({ key: 'some/file.pdf', expiresInSeconds: 3600 }),
    ).resolves.not.toThrow();
  });

  it('getSignedDownloadUrl() returns a stub URL string', async () => {
    const url = await provider.getSignedDownloadUrl({ key: 'some/file.pdf' });
    expect(typeof url).toBe('string');
    expect(url).toContain('some/file.pdf');
  });

  it('all methods emit a logger.warn call', async () => {
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    warnSpy.mockClear(); // reset count before assertions
    await provider.upload({ key: 'k', buffer: Buffer.alloc(0), contentType: 'text/plain' });
    await provider.delete('k');
    await provider.getSignedUploadUrl({ key: 'k', contentType: 'image/png' });
    await provider.getSignedDownloadUrl({ key: 'k' });
    expect(warnSpy).toHaveBeenCalledTimes(4);
  });

  it('stub publicUrl contains the noop-storage hostname for easy detection', async () => {
    const result = await provider.upload({ key: 'a/b.png', buffer: Buffer.alloc(1), contentType: 'image/png' });
    expect(result.publicUrl).toContain('noop-storage');
  });

  it('stub upload URL contains the stub=true marker for easy detection', async () => {
    const url = await provider.getSignedUploadUrl({ key: 'x', contentType: 'image/png' });
    expect(url).toContain('stub=true');
  });
});

// ─── S3StorageProvider ────────────────────────────────────────────────────────
//
// We mock the AWS SDK modules so no real HTTP calls are made.

const mockSend       = jest.fn().mockResolvedValue({});
const mockGetSignedUrl = jest.fn().mockResolvedValue('https://s3.amazonaws.com/bucket/key?sig=abc123');

jest.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
    PutObjectCommand:    jest.fn().mockImplementation((args) => ({ __type: 'PutObject',    ...args })),
    DeleteObjectCommand: jest.fn().mockImplementation((args) => ({ __type: 'DeleteObject', ...args })),
    GetObjectCommand:    jest.fn().mockImplementation((args) => ({ __type: 'GetObject',    ...args })),
  };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: (...args: unknown[]) => mockGetSignedUrl(...args),
}));

describe('S3StorageProvider', () => {
  function makeConfigService(overrides: Record<string, string> = {}) {
    const defaults: Record<string, string> = {
      'storage.region':          'auto',
      'storage.endpoint':        'https://abc.r2.cloudflarestorage.com',
      'storage.accessKeyId':     'ACCESS_KEY',
      'storage.secretAccessKey': 'SECRET_KEY',
      'storage.bucket':          'siraja-media',
      'storage.publicUrl':       'https://cdn.siraja.app',
    };
    const merged = { ...defaults, ...overrides };
    return {
      get: jest.fn((key: string, def?: string) => merged[key] ?? def),
    } as any;
  }

  beforeEach(() => {
    mockSend.mockClear();
    mockGetSignedUrl.mockClear();
  });

  it('constructs without throwing', () => {
    expect(() => new S3StorageProvider(makeConfigService())).not.toThrow();
  });

  it('calls S3Client.send with a PutObjectCommand on upload()', async () => {
    const provider = new S3StorageProvider(makeConfigService());
    await provider.upload({
      key: 'tenants/tid/logo.png',
      buffer: Buffer.from('png-data'),
      contentType: 'image/png',
    });
    expect(mockSend).toHaveBeenCalledTimes(1);
    const [cmd] = mockSend.mock.calls[0];
    expect(cmd.__type).toBe('PutObject');
  });

  it('upload() returns the CDN public URL when STORAGE_PUBLIC_URL is configured', async () => {
    const provider = new S3StorageProvider(makeConfigService());
    const result   = await provider.upload({
      key: 'tenants/tid/logo.png',
      buffer: Buffer.from(''),
      contentType: 'image/png',
    });
    expect(result.publicUrl).toBe('https://cdn.siraja.app/tenants/tid/logo.png');
    expect(result.key).toBe('tenants/tid/logo.png');
  });

  it('upload() returns the key as publicUrl when no STORAGE_PUBLIC_URL is set', async () => {
    const provider = new S3StorageProvider(makeConfigService({ 'storage.publicUrl': '' }));
    const result   = await provider.upload({ key: 'test/k.png', buffer: Buffer.alloc(0), contentType: 'image/png' });
    expect(result.publicUrl).toBe('test/k.png');
  });

  it('calls S3Client.send with DeleteObjectCommand on delete()', async () => {
    const provider = new S3StorageProvider(makeConfigService());
    await provider.delete('old/logo.png');
    expect(mockSend).toHaveBeenCalledTimes(1);
    const [cmd] = mockSend.mock.calls[0];
    expect(cmd.__type).toBe('DeleteObject');
  });

  it('getSignedUploadUrl() delegates to @aws-sdk/s3-request-presigner getSignedUrl', async () => {
    const provider = new S3StorageProvider(makeConfigService());
    const url      = await provider.getSignedUploadUrl({
      key: 'tenants/tid/logo.png',
      contentType: 'image/png',
      expiresInSeconds: 300,
    });
    expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
    expect(typeof url).toBe('string');
    expect(url).toContain('s3.amazonaws.com');
  });

  it('getSignedDownloadUrl() delegates to @aws-sdk/s3-request-presigner getSignedUrl', async () => {
    const provider = new S3StorageProvider(makeConfigService());
    await provider.getSignedDownloadUrl({ key: 'private/file.pdf', expiresInSeconds: 3600 });
    expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
    const [, cmd] = mockGetSignedUrl.mock.calls[0];
    expect(cmd.__type).toBe('GetObject');
  });

  it('passes the correct bucket to the command', async () => {
    const provider = new S3StorageProvider(makeConfigService({ 'storage.bucket': 'custom-bucket' }));
    await provider.upload({ key: 'x', buffer: Buffer.alloc(0), contentType: 'image/png' });
    const [cmd] = mockSend.mock.calls[0];
    expect(cmd.Bucket).toBe('custom-bucket');
  });

  it('passes the correct key to the command', async () => {
    const provider = new S3StorageProvider(makeConfigService());
    await provider.upload({ key: 'dir/file.png', buffer: Buffer.alloc(0), contentType: 'image/png' });
    const [cmd] = mockSend.mock.calls[0];
    expect(cmd.Key).toBe('dir/file.png');
  });

  // ── R2 / presigned URL compatibility ────────────────────────────────────────

  it('constructs S3Client with custom endpoint for R2 compatibility', () => {
    const { S3Client } = jest.requireMock('@aws-sdk/client-s3');
    S3Client.mockClear();

    new S3StorageProvider(makeConfigService({
      'storage.endpoint': 'https://abc123.r2.cloudflarestorage.com',
      'storage.region':   'auto',
    }));

    const [clientConfig] = S3Client.mock.calls[0];
    expect(clientConfig.endpoint).toBe('https://abc123.r2.cloudflarestorage.com');
    expect(clientConfig.region).toBe('auto');
  });

  it('omits the endpoint field when STORAGE_ENDPOINT is empty (standard AWS S3)', () => {
    const { S3Client } = jest.requireMock('@aws-sdk/client-s3');
    S3Client.mockClear();

    new S3StorageProvider(makeConfigService({ 'storage.endpoint': '' }));

    const [clientConfig] = S3Client.mock.calls[0];
    expect(clientConfig.endpoint).toBeUndefined();
  });

  it('sets credentials when accessKeyId and secretAccessKey are provided', () => {
    const { S3Client } = jest.requireMock('@aws-sdk/client-s3');
    S3Client.mockClear();

    new S3StorageProvider(makeConfigService());

    const [clientConfig] = S3Client.mock.calls[0];
    expect(clientConfig.credentials).toEqual({ accessKeyId: 'ACCESS_KEY', secretAccessKey: 'SECRET_KEY' });
  });

  it('omits credentials when no accessKeyId is provided (IAM role / instance profile)', () => {
    const { S3Client } = jest.requireMock('@aws-sdk/client-s3');
    S3Client.mockClear();

    new S3StorageProvider(makeConfigService({ 'storage.accessKeyId': '', 'storage.secretAccessKey': '' }));

    const [clientConfig] = S3Client.mock.calls[0];
    expect(clientConfig.credentials).toBeUndefined();
  });
});
