/**
 * Phase 12A — Tenants Use-Cases Unit Tests
 *
 * Tests: CreateTenantUseCase, GetTenantUseCase, UpdateTenantUseCase,
 *        UpdateTenantSettingsUseCase
 *
 * Strategy: pure unit tests — Mongoose model interactions are replaced with
 * Jest mocks. No database connection required.
 */

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { CreateTenantUseCase } from './create-tenant.use-case';
import { GetTenantUseCase } from './get-tenant.use-case';
import { UpdateTenantUseCase } from './update-tenant.use-case';
import { UpdateTenantSettingsUseCase } from './update-tenant-settings.use-case';

// ─── helpers ─────────────────────────────────────────────────────────────────

const TENANT_ID = new Types.ObjectId().toHexString();

function makeTenantDoc(overrides: Record<string, unknown> = {}) {
  return {
    _id: new Types.ObjectId(TENANT_ID),
    name: 'Tuwaiq Academy',
    slug: 'tuwaiq',
    type: 'academy',
    status: 'trial',
    logoUrl: undefined,
    contactEmail: 'admin@tuwaiq.sa',
    contactPhone: '+966501234567',
    timezone: 'Asia/Riyadh',
    defaultLocale: 'ar',
    trialEndsAt: new Date(Date.now() + 30 * 86400 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeSettingsDoc(overrides: Record<string, unknown> = {}) {
  return {
    tenantId: new Types.ObjectId(TENANT_ID),
    tenant: new Types.ObjectId(TENANT_ID),
    primaryLocale: 'ar',
    supportedLocales: ['ar', 'en'],
    brandPrimaryColor: undefined,
    attendanceNotificationsEnabled: true,
    parentPortalEnabled: true,
    ...overrides,
  };
}

// ─── CreateTenantUseCase ──────────────────────────────────────────────────────

describe('CreateTenantUseCase', () => {
  function makeTenantModel(resolvedExisting: unknown = null) {
    const created = makeTenantDoc();
    const exec    = jest.fn().mockResolvedValue(resolvedExisting);
    const findOne = jest.fn().mockReturnValue({ exec });
    const create  = jest.fn().mockResolvedValue(created);
    return { model: { findOne, create } as any, findOne, create, exec };
  }

  function makeSettingsModel() {
    return { create: jest.fn().mockResolvedValue(makeSettingsDoc()) } as any;
  }

  const validDto = {
    name: 'Tuwaiq Academy',
    slug: 'tuwaiq',
    contactEmail: 'admin@tuwaiq.sa',
    contactPhone: '+966501234567',
    timezone: 'Asia/Riyadh',
    defaultLocale: 'ar',
    type: 'academy',
  };

  it('creates a tenant and seeds default TenantSettings', async () => {
    const { model }   = makeTenantModel();
    const settingsModel = makeSettingsModel();
    const uc          = new CreateTenantUseCase(model, settingsModel);

    const result = await uc.execute(validDto as any);

    expect(model.create).toHaveBeenCalledWith(expect.objectContaining({ slug: 'tuwaiq', name: 'Tuwaiq Academy' }));
    expect(settingsModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ primaryLocale: 'ar', attendanceNotificationsEnabled: true, parentPortalEnabled: true }),
    );
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('slug', 'tuwaiq');
    expect(result.status).toBe('trial');
  });

  it('rejects reserved slugs with BadRequestException', async () => {
    const { model }   = makeTenantModel();
    const settingsModel = makeSettingsModel();
    const uc          = new CreateTenantUseCase(model, settingsModel);

    const reservedSlugs = ['api', 'admin', 'auth', 'app', 'www', 'platform', 'siraja', 'docs'];
    for (const slug of reservedSlugs) {
      await expect(uc.execute({ ...validDto, slug } as any)).rejects.toThrow(BadRequestException);
    }
    // No DB calls for reserved slugs
    expect(model.create).not.toHaveBeenCalled();
  });

  it('rejects duplicate slugs with BadRequestException', async () => {
    const existing    = makeTenantDoc({ slug: 'tuwaiq' });
    const { model }   = makeTenantModel(existing);
    const settingsModel = makeSettingsModel();
    const uc          = new CreateTenantUseCase(model, settingsModel);

    await expect(uc.execute(validDto as any)).rejects.toThrow(BadRequestException);
    expect(model.create).not.toHaveBeenCalled();
  });

  it('sets the tenant to TRIAL status with a 30-day trial period', async () => {
    const { model }   = makeTenantModel();
    const settingsModel = makeSettingsModel();
    const uc          = new CreateTenantUseCase(model, settingsModel);

    await uc.execute(validDto as any);

    const [createArg] = model.create.mock.calls[0];
    expect(createArg.status).toBe('trial');
    expect(createArg.trialEndsAt).toBeInstanceOf(Date);
    const diffDays = (createArg.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThan(28);
    expect(diffDays).toBeLessThan(32);
  });

  it('defaults timezone to Asia/Riyadh when not provided', async () => {
    const { model }   = makeTenantModel();
    const settingsModel = makeSettingsModel();
    const uc          = new CreateTenantUseCase(model, settingsModel);

    await uc.execute({ name: 'X', slug: 'x-slug', contactEmail: 'x@x.com' } as any);

    const [createArg] = model.create.mock.calls[0];
    expect(createArg.timezone).toBe('Asia/Riyadh');
  });

  it('defaults locale to ar when not provided', async () => {
    const { model }   = makeTenantModel();
    const settingsModel = makeSettingsModel();
    const uc          = new CreateTenantUseCase(model, settingsModel);

    await uc.execute({ name: 'X', slug: 'x-slug', contactEmail: 'x@x.com' } as any);

    const [createArg] = model.create.mock.calls[0];
    expect(createArg.defaultLocale).toBe('ar');
  });

  it('uses a platform ObjectId (all zeros) for the tenantId field on the Tenant doc', async () => {
    const { model }   = makeTenantModel();
    const settingsModel = makeSettingsModel();
    const uc          = new CreateTenantUseCase(model, settingsModel);

    await uc.execute(validDto as any);

    const [createArg] = model.create.mock.calls[0];
    expect(createArg.tenantId.toHexString()).toBe('000000000000000000000000');
  });
});

// ─── GetTenantUseCase ─────────────────────────────────────────────────────────

describe('GetTenantUseCase', () => {
  function makeRepo(resolved: unknown = makeTenantDoc()) {
    return { findById: jest.fn().mockResolvedValue(resolved) };
  }

  function makeSettingsModel(resolved: unknown = makeSettingsDoc()) {
    return { findOne: jest.fn().mockResolvedValue(resolved) } as any;
  }

  it('returns tenant details with settings when both exist', async () => {
    const repo     = makeRepo();
    const settings = makeSettingsModel();
    const uc       = new GetTenantUseCase(repo as any, settings);

    const result = await uc.execute(TENANT_ID);

    expect(repo.findById).toHaveBeenCalledWith(TENANT_ID);
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('settings');
    expect(result.settings).not.toBeNull();
    expect(result.settings!.primaryLocale).toBe('ar');
  });

  it('returns settings: null when no TenantSettings document exists', async () => {
    const repo     = makeRepo();
    const settings = makeSettingsModel(null);
    const uc       = new GetTenantUseCase(repo as any, settings);

    const result = await uc.execute(TENANT_ID);
    expect(result.settings).toBeNull();
  });

  it('throws NotFoundException when the tenant does not exist', async () => {
    const repo     = makeRepo(null);
    const settings = makeSettingsModel();
    const uc       = new GetTenantUseCase(repo as any, settings);

    await expect(uc.execute(TENANT_ID)).rejects.toThrow(NotFoundException);
    expect(settings.findOne).not.toHaveBeenCalled();
  });

  it('returns the tenantId in the response', async () => {
    const repo     = makeRepo();
    const settings = makeSettingsModel();
    const uc       = new GetTenantUseCase(repo as any, settings);

    const result = await uc.execute(TENANT_ID);
    expect(result.id).toBe(TENANT_ID);
  });
});

// ─── UpdateTenantUseCase ──────────────────────────────────────────────────────

describe('UpdateTenantUseCase', () => {
  function makeRepo(resolved: unknown = makeTenantDoc()) {
    return { findById: jest.fn().mockResolvedValue(resolved) };
  }

  function makeModel() {
    const exec      = jest.fn().mockResolvedValue({ nModified: 1 });
    const updateOne = jest.fn().mockReturnValue({ exec });
    return { model: { updateOne } as any, updateOne, exec };
  }

  it('updates the specified fields and returns a success message', async () => {
    const repo       = makeRepo();
    const { model }  = makeModel();
    const uc         = new UpdateTenantUseCase(repo as any, model);

    const dto    = { name: 'New Name', timezone: 'Asia/Dubai' };
    const result = await uc.execute(TENANT_ID, dto as any);

    expect(model.updateOne).toHaveBeenCalledWith(
      { _id: expect.any(Types.ObjectId) },
      { $set: expect.objectContaining({ name: 'New Name', timezone: 'Asia/Dubai' }) },
    );
    expect(result.message).toMatch(/updated/i);
  });

  it('does not call updateOne when the DTO is empty', async () => {
    const repo      = makeRepo();
    const { model } = makeModel();
    const uc        = new UpdateTenantUseCase(repo as any, model);

    await uc.execute(TENANT_ID, {} as any);

    expect(model.updateOne).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when tenant does not exist', async () => {
    const repo      = makeRepo(null);
    const { model } = makeModel();
    const uc        = new UpdateTenantUseCase(repo as any, model);

    await expect(uc.execute(TENANT_ID, { name: 'X' } as any)).rejects.toThrow(NotFoundException);
    expect(model.updateOne).not.toHaveBeenCalled();
  });

  it('only includes explicitly set fields in $set', async () => {
    const repo      = makeRepo();
    const { model } = makeModel();
    const uc        = new UpdateTenantUseCase(repo as any, model);

    await uc.execute(TENANT_ID, { contactEmail: 'new@example.com' } as any);

    const [, { $set }] = model.updateOne.mock.calls[0];
    expect($set).toHaveProperty('contactEmail', 'new@example.com');
    expect($set).not.toHaveProperty('name');
    expect($set).not.toHaveProperty('timezone');
  });
});

// ─── UpdateTenantSettingsUseCase ──────────────────────────────────────────────

describe('UpdateTenantSettingsUseCase', () => {
  function makeRepo(resolved: unknown = makeTenantDoc()) {
    return { findById: jest.fn().mockResolvedValue(resolved) };
  }

  function makeSettingsModel() {
    const findOneAndUpdate = jest.fn().mockResolvedValue(makeSettingsDoc());
    return { model: { findOneAndUpdate } as any, findOneAndUpdate };
  }

  it('upserts TenantSettings with correct tenant scope', async () => {
    const repo               = makeRepo();
    const { model, findOneAndUpdate } = makeSettingsModel();
    const uc                 = new UpdateTenantSettingsUseCase(repo as any, model);

    const dto    = { brandPrimaryColor: '#1A73E8', attendanceNotificationsEnabled: false };
    const result = await uc.execute(TENANT_ID, dto as any);

    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { tenant: expect.any(Types.ObjectId) },
      expect.objectContaining({ $set: expect.objectContaining({ brandPrimaryColor: '#1A73E8', attendanceNotificationsEnabled: false }) }),
      { upsert: true, new: true },
    );
    expect(result.message).toMatch(/updated/i);
  });

  it('throws NotFoundException when tenant does not exist', async () => {
    const repo               = makeRepo(null);
    const { model }          = makeSettingsModel();
    const uc                 = new UpdateTenantSettingsUseCase(repo as any, model);

    await expect(uc.execute(TENANT_ID, {} as any)).rejects.toThrow(NotFoundException);
  });

  it('only sets fields present in the DTO', async () => {
    const repo               = makeRepo();
    const { model, findOneAndUpdate } = makeSettingsModel();
    const uc                 = new UpdateTenantSettingsUseCase(repo as any, model);

    await uc.execute(TENANT_ID, { parentPortalEnabled: false } as any);

    const [, { $set }] = findOneAndUpdate.mock.calls[0];
    expect($set).toHaveProperty('parentPortalEnabled', false);
    expect($set).not.toHaveProperty('brandPrimaryColor');
    expect($set).not.toHaveProperty('attendanceNotificationsEnabled');
  });
});
