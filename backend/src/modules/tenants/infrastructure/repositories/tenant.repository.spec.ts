import { TenantRepository } from './tenant.repository';

// ─── helpers ─────────────────────────────────────────────────────────────────

/** A minimal fake TenantDocument for assertion purposes. */
function makeTenantDoc(overrides: Record<string, unknown> = {}) {
  return {
    _id: 'obj-id-000',
    slug: 'tuwaiq',
    status: 'active',
    isDeleted: false,
    ...overrides,
  };
}

/**
 * Builds a mock Mongoose model whose `findOne` method returns a chainable
 * stub ending in `.exec()`.  Captures the query filter passed to `findOne`
 * so tests can assert on it.
 */
function makeMockModel(resolvedDoc: unknown = null) {
  const exec = jest.fn().mockResolvedValue(resolvedDoc);
  const findOne = jest.fn().mockReturnValue({ exec });
  return { model: { findOne } as any, findOne, exec };
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe('TenantRepository', () => {
  // ── #5  Repository layer applies tenant scope ──────────────────────────────

  describe('findBySlug', () => {
    it('queries by slug and always excludes soft-deleted documents', async () => {
      const doc = makeTenantDoc({ _id: 'tid-1', slug: 'tuwaiq' });
      const { model, findOne } = makeMockModel(doc);
      const repo = new TenantRepository(model);

      const result = await repo.findBySlug('tuwaiq');

      expect(findOne).toHaveBeenCalledWith({ slug: 'tuwaiq', isDeleted: { $ne: true } });
      expect(result).toEqual(doc);
    });

    it('returns null when no tenant matches the given slug', async () => {
      const { model } = makeMockModel(null);
      const repo = new TenantRepository(model);

      expect(await repo.findBySlug('unknown-slug')).toBeNull();
    });

    it('does not return a soft-deleted tenant (query filter verification)', async () => {
      /**
       * The repository always passes `isDeleted: { $ne: true }`.
       * Here we verify the filter is constructed correctly: the model
       * receiving the right filter is the only guarantee available in a
       * unit test (the DB filtering itself is Mongoose's responsibility).
       */
      const { model, findOne } = makeMockModel(null);
      const repo = new TenantRepository(model);
      await repo.findBySlug('deleted-tenant');

      const [filter] = findOne.mock.calls[0];
      expect(filter).toMatchObject({ isDeleted: { $ne: true } });
    });

    it('passes the exact slug to the query without modification', async () => {
      const { model, findOne } = makeMockModel(makeTenantDoc());
      const repo = new TenantRepository(model);
      await repo.findBySlug('furqan');

      const [filter] = findOne.mock.calls[0];
      expect(filter.slug).toBe('furqan');
    });
  });

  describe('findById', () => {
    it('queries by _id and excludes soft-deleted documents', async () => {
      const doc = makeTenantDoc({ _id: '507f1f77bcf86cd799439011' });
      const { model, findOne } = makeMockModel(doc);
      const repo = new TenantRepository(model);

      const result = await repo.findById('507f1f77bcf86cd799439011');

      expect(findOne).toHaveBeenCalledWith({
        _id: '507f1f77bcf86cd799439011',
        isDeleted: { $ne: true },
      });
      expect(result).toEqual(doc);
    });

    it('returns null immediately for a non-ObjectId string (no DB round-trip)', async () => {
      const { model, findOne } = makeMockModel(makeTenantDoc());
      const repo = new TenantRepository(model);

      const result = await repo.findById('not-a-valid-object-id');

      expect(result).toBeNull();
      // findOne should NOT have been called — invalid id is short-circuited
      expect(findOne).not.toHaveBeenCalled();
    });

    it('returns null when no document matches the given id', async () => {
      const { model } = makeMockModel(null);
      const repo = new TenantRepository(model);

      expect(await repo.findById('507f1f77bcf86cd799439012')).toBeNull();
    });

    it('does not return soft-deleted documents (isDeleted filter present)', async () => {
      const { model, findOne } = makeMockModel(null);
      const repo = new TenantRepository(model);
      await repo.findById('507f1f77bcf86cd799439013');

      const [filter] = findOne.mock.calls[0];
      expect(filter).toMatchObject({ isDeleted: { $ne: true } });
    });

    // ── Cross-tenant isolation: no tenantId on the Tenants collection ─────────
    it('does NOT filter by tenantId (Tenant is a platform-global document)', async () => {
      /**
       * The `tenants` collection is platform-global — it has no `tenantId`
       * field.  Any query that accidentally adds a `tenantId` filter would
       * always return null for every tenant lookup.
       */
      const { model, findOne } = makeMockModel(makeTenantDoc());
      const repo = new TenantRepository(model);
      await repo.findById('507f1f77bcf86cd799439014');

      const [filter] = findOne.mock.calls[0];
      expect(filter).not.toHaveProperty('tenantId');
    });
  });
});
