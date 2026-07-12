import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TenantMiddleware, TENANT_SLUG_HEADER } from './tenant.middleware';
import { TenantStatus } from '@shared/enums/tenant-status.enum';

// ─── helpers ────────────────────────────────────────────────────────────────

function makeReq(headers: Record<string, string | string[]> = {}): any {
  return { headers };
}

function makeDoc(overrides: Partial<{ _id: string; slug: string; status: TenantStatus }> = {}) {
  return {
    _id: overrides._id ?? 'doc-id-1',
    slug: overrides.slug ?? 'tuwaiq',
    status: overrides.status ?? TenantStatus.ACTIVE,
  };
}

// ─── tests ──────────────────────────────────────────────────────────────────

describe('TenantMiddleware', () => {
  let findBySlug: jest.Mock;
  let middleware: TenantMiddleware;
  let next: jest.Mock;

  beforeEach(() => {
    findBySlug = jest.fn();
    middleware = new TenantMiddleware({ findBySlug, findById: jest.fn() } as any);
    next = jest.fn();
  });

  // ── #3  X-Tenant-Slug extraction ──────────────────────────────────────────

  describe('Header extraction (X-Tenant-Slug)', () => {
    it('calls next() without touching the repository when the header is absent', async () => {
      const req = makeReq();
      await middleware.use(req, {} as any, next);
      expect(findBySlug).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledTimes(1);
      expect(req.tenant).toBeUndefined();
    });

    it('calls next() without touching the repository when the header is an empty string', async () => {
      const req = makeReq({ [TENANT_SLUG_HEADER]: '' });
      await middleware.use(req, {} as any, next);
      expect(findBySlug).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('normalises the slug to lower-case before querying', async () => {
      findBySlug.mockResolvedValue(makeDoc({ slug: 'tuwaiq' }));
      const req = makeReq({ [TENANT_SLUG_HEADER]: 'TUWAIQ' });
      await middleware.use(req, {} as any, next);
      expect(findBySlug).toHaveBeenCalledWith('tuwaiq');
    });

    it('trims surrounding whitespace from the slug', async () => {
      findBySlug.mockResolvedValue(makeDoc({ slug: 'noor' }));
      const req = makeReq({ [TENANT_SLUG_HEADER]: '  noor  ' });
      await middleware.use(req, {} as any, next);
      expect(findBySlug).toHaveBeenCalledWith('noor');
    });

    it('uses the first value when the header arrives as an array', async () => {
      findBySlug.mockResolvedValue(makeDoc({ slug: 'alpha' }));
      const req = makeReq({ [TENANT_SLUG_HEADER]: ['alpha', 'beta'] });
      await middleware.use(req, {} as any, next);
      expect(findBySlug).toHaveBeenCalledWith('alpha');
    });
  });

  // ── #1  Same-tenant access ─────────────────────────────────────────────────

  describe('Valid tenant resolution', () => {
    it('attaches req.tenant with id/slug/status for an ACTIVE tenant', async () => {
      const doc = makeDoc({ _id: 'tid-001', slug: 'tuwaiq', status: TenantStatus.ACTIVE });
      findBySlug.mockResolvedValue(doc);
      const req = makeReq({ [TENANT_SLUG_HEADER]: 'tuwaiq' });

      await middleware.use(req, {} as any, next);

      expect(req.tenant).toEqual({ id: 'tid-001', slug: 'tuwaiq', status: TenantStatus.ACTIVE });
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('attaches req.tenant for a TRIAL tenant', async () => {
      const doc = makeDoc({ _id: 'tid-002', slug: 'noor', status: TenantStatus.TRIAL });
      findBySlug.mockResolvedValue(doc);
      const req = makeReq({ [TENANT_SLUG_HEADER]: 'noor' });

      await middleware.use(req, {} as any, next);

      expect(req.tenant).toEqual({ id: 'tid-002', slug: 'noor', status: TenantStatus.TRIAL });
      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  // ── #4  Absent or invalid tenant ─────────────────────────────────────────

  describe('Absent or invalid tenant', () => {
    it('throws NotFoundException when the slug is not found in the database', async () => {
      findBySlug.mockResolvedValue(null);
      const req = makeReq({ [TENANT_SLUG_HEADER]: 'ghost' });

      await expect(middleware.use(req, {} as any, next)).rejects.toThrow(NotFoundException);
      expect(next).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException for a SUSPENDED tenant', async () => {
      findBySlug.mockResolvedValue(makeDoc({ status: TenantStatus.SUSPENDED }));
      const req = makeReq({ [TENANT_SLUG_HEADER]: 'tuwaiq' });

      await expect(middleware.use(req, {} as any, next)).rejects.toThrow(ForbiddenException);
      expect(next).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException for an ARCHIVED tenant', async () => {
      findBySlug.mockResolvedValue(makeDoc({ status: TenantStatus.ARCHIVED }));
      const req = makeReq({ [TENANT_SLUG_HEADER]: 'old-tenant' });

      await expect(middleware.use(req, {} as any, next)).rejects.toThrow(ForbiddenException);
      expect(next).not.toHaveBeenCalled();
    });

    it('does NOT set req.tenant when the slug is unknown', async () => {
      findBySlug.mockResolvedValue(null);
      const req = makeReq({ [TENANT_SLUG_HEADER]: 'ghost' });

      await expect(middleware.use(req, {} as any, next)).rejects.toThrow();
      expect(req.tenant).toBeUndefined();
    });
  });

  // ── Idempotency / isolation ───────────────────────────────────────────────

  describe('Request isolation', () => {
    it('resolves two different slugs in independent calls without cross-contamination', async () => {
      const docA = makeDoc({ _id: 'tid-A', slug: 'alpha', status: TenantStatus.ACTIVE });
      const docB = makeDoc({ _id: 'tid-B', slug: 'beta', status: TenantStatus.ACTIVE });
      findBySlug
        .mockResolvedValueOnce(docA)
        .mockResolvedValueOnce(docB);

      const reqA = makeReq({ [TENANT_SLUG_HEADER]: 'alpha' });
      const reqB = makeReq({ [TENANT_SLUG_HEADER]: 'beta' });

      await middleware.use(reqA, {} as any, jest.fn());
      await middleware.use(reqB, {} as any, jest.fn());

      expect(reqA.tenant?.id).toBe('tid-A');
      expect(reqB.tenant?.id).toBe('tid-B');
      expect(reqA.tenant?.id).not.toBe(reqB.tenant?.id);
    });
  });
});
