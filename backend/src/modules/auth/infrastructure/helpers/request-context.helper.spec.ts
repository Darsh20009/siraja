import { extractTenantId, extractRequestContext } from './request-context.helper';

// ─── extractTenantId ─────────────────────────────────────────────────────────

describe('extractTenantId', () => {
  // ── #3  Extracts tenant from resolved req.tenant ───────────────────────────

  it('returns the tenant id when TenantMiddleware has populated req.tenant', () => {
    const req = { tenant: { id: 'tid-abc', slug: 'tuwaiq', status: 'active' } } as any;
    expect(extractTenantId(req)).toBe('tid-abc');
  });

  // ── #4  Rejects absent or invalid tenant ──────────────────────────────────

  it('throws when req.tenant is undefined (middleware did not run or no header sent)', () => {
    const req = {} as any;
    expect(() => extractTenantId(req)).toThrow(
      'No tenant resolved for this request — TenantMiddleware must run before auth routes.',
    );
  });

  it('throws when req.tenant exists but id is an empty string', () => {
    const req = { tenant: { id: '', slug: 'x', status: 'active' } } as any;
    expect(() => extractTenantId(req)).toThrow();
  });

  it('throws when req.tenant is null', () => {
    const req = { tenant: null } as any;
    expect(() => extractTenantId(req)).toThrow();
  });
});

// ─── extractRequestContext ────────────────────────────────────────────────────

describe('extractRequestContext', () => {
  it('extracts the first IP from a comma-separated x-forwarded-for string', () => {
    const req = {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8', 'user-agent': 'TestAgent/1.0' },
      ip: '127.0.0.1',
    } as any;
    const ctx = extractRequestContext(req);
    expect(ctx.ipAddress).toBe('1.2.3.4');
    expect(ctx.userAgent).toBe('TestAgent/1.0');
  });

  it('uses the first element when x-forwarded-for is an array', () => {
    const req = {
      headers: { 'x-forwarded-for': ['9.9.9.9', '8.8.8.8'] },
      ip: '127.0.0.1',
    } as any;
    expect(extractRequestContext(req).ipAddress).toBe('9.9.9.9');
  });

  it('falls back to req.ip when x-forwarded-for is absent', () => {
    const req = { headers: {}, ip: '10.0.0.2' } as any;
    expect(extractRequestContext(req).ipAddress).toBe('10.0.0.2');
  });

  it('falls back to "unknown" when no ip info is available at all', () => {
    const req = { headers: {} } as any;
    expect(extractRequestContext(req).ipAddress).toBe('unknown');
  });

  it('returns undefined userAgent when the header is absent', () => {
    const req = { headers: {}, ip: '1.1.1.1' } as any;
    expect(extractRequestContext(req).userAgent).toBeUndefined();
  });
});
