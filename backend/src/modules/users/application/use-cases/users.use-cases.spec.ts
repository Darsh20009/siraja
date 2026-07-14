/**
 * Phase 12A — Users Use-Cases Unit Tests
 *
 * Tests: GetMeUseCase, UpdateMeUseCase, UpdateLanguagePreferencesUseCase,
 *        UpdateNotificationPreferencesUseCase
 *
 * Strategy: pure unit tests — every external dependency (repository, Mongoose
 * model) is replaced with a Jest mock. No database connection required.
 */

import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { GetMeUseCase } from './get-me.use-case';
import { UpdateMeUseCase } from './update-me.use-case';
import { UpdateLanguagePreferencesUseCase } from './update-language-preferences.use-case';
import { UpdateNotificationPreferencesUseCase } from './update-notification-preferences.use-case';
import { NotificationChannel, NotificationType } from '@shared/enums/notification.enum';

// ─── helpers ─────────────────────────────────────────────────────────────────

const TENANT_ID = new Types.ObjectId().toHexString();
const USER_ID   = new Types.ObjectId().toHexString();

function makeUserDoc(overrides: Record<string, unknown> = {}) {
  return {
    _id: new Types.ObjectId(USER_ID),
    tenantId: new Types.ObjectId(TENANT_ID),
    email: 'student@example.com',
    phone: '+966501234567',
    fullName: 'Ali Hassan',
    avatarUrl: undefined,
    gender: 'male',
    roles: ['student'],
    status: 'active',
    isEmailVerified: true,
    isPhoneVerified: false,
    preferredLocale: 'ar',
    lastLoginAt: undefined,
    isMfaEnabled: false,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-06-01'),
    ...overrides,
  };
}

function makePrefsDoc(overrides: Record<string, unknown> = {}) {
  return {
    tenantId: new Types.ObjectId(TENANT_ID),
    userId: new Types.ObjectId(USER_ID),
    enabledChannels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    mutedTypes: [],
    email: { enabled: true, dailyDigest: false, digestHour: 8 },
    inApp: { enabled: true, soundEnabled: true },
    ...overrides,
  };
}

/** Creates a mock IUserRepository. */
function makeUserRepo(resolvedUser: unknown = makeUserDoc()) {
  return {
    findById: jest.fn().mockResolvedValue(resolvedUser),
    update:   jest.fn().mockResolvedValue(undefined),
  };
}

/** Creates a mock Mongoose Model for UserPreferences. */
function makePrefsModel(resolvedPrefs: unknown = makePrefsDoc()) {
  const findOneAndUpdate = jest.fn().mockResolvedValue(resolvedPrefs);
  const findOne          = jest.fn().mockResolvedValue(resolvedPrefs);
  return { findOne, findOneAndUpdate } as any;
}

// ─── GetMeUseCase ─────────────────────────────────────────────────────────────

describe('GetMeUseCase', () => {
  it('returns a full UserProfileResponse when user and prefs exist', async () => {
    const repo  = makeUserRepo();
    const model = makePrefsModel();
    const uc    = new GetMeUseCase(repo as any, model);

    const result = await uc.execute(TENANT_ID, USER_ID);

    expect(repo.findById).toHaveBeenCalledWith(TENANT_ID, USER_ID);
    expect(result.id).toBe(USER_ID);
    expect(result.email).toBe('student@example.com');
    expect(result.preferredLocale).toBe('ar');
    expect(result.notificationPreferences!.emailEnabled).toBe(true);
    expect(result.notificationPreferences!.inAppEnabled).toBe(true);
    expect(result.notificationPreferences!.enabledChannels).toContain(NotificationChannel.EMAIL);
  });

  it('applies sensible defaults when no UserPreferences document exists yet', async () => {
    const repo  = makeUserRepo();
    const model = makePrefsModel(null); // no prefs doc
    const uc    = new GetMeUseCase(repo as any, model);

    const result = await uc.execute(TENANT_ID, USER_ID);

    expect(result.notificationPreferences!.enabledChannels).toEqual([NotificationChannel.IN_APP]);
    expect(result.notificationPreferences!.mutedTypes).toEqual([]);
    expect(result.notificationPreferences!.emailEnabled).toBe(true);
    expect(result.notificationPreferences!.emailDailyDigest).toBe(false);
    expect(result.notificationPreferences!.emailDigestHour).toBe(8);
    expect(result.notificationPreferences!.inAppSoundEnabled).toBe(true);
  });

  it('throws NotFoundException when the user does not exist in this tenant', async () => {
    const repo  = makeUserRepo(null);
    const model = makePrefsModel();
    const uc    = new GetMeUseCase(repo as any, model);

    await expect(uc.execute(TENANT_ID, USER_ID)).rejects.toThrow(NotFoundException);
  });

  it('scopes the findById call to both tenantId and userId from the JWT', async () => {
    const repo  = makeUserRepo();
    const model = makePrefsModel();
    const uc    = new GetMeUseCase(repo as any, model);

    await uc.execute(TENANT_ID, USER_ID);

    const [tid, uid] = repo.findById.mock.calls[0];
    expect(tid).toBe(TENANT_ID);
    expect(uid).toBe(USER_ID);
  });

  it('returns tenantId in the response', async () => {
    const repo   = makeUserRepo();
    const model  = makePrefsModel();
    const uc     = new GetMeUseCase(repo as any, model);
    const result = await uc.execute(TENANT_ID, USER_ID);
    expect(result.tenantId).toBe(TENANT_ID);
  });
});

// ─── UpdateMeUseCase ──────────────────────────────────────────────────────────

describe('UpdateMeUseCase', () => {
  it('calls repo.update with the correct tenant/user scope and returns success message', async () => {
    const repo = makeUserRepo();
    const uc   = new UpdateMeUseCase(repo as any);

    const dto    = { fullName: 'Ahmed Ali', avatarUrl: 'https://cdn.example.com/avatar.jpg' };
    const result = await uc.execute(TENANT_ID, USER_ID, dto as any);

    expect(repo.update).toHaveBeenCalledWith(TENANT_ID, USER_ID, expect.objectContaining({ fullName: 'Ahmed Ali' }));
    expect(result.message).toMatch(/updated/i);
  });

  it('throws NotFoundException when user does not exist', async () => {
    const repo = makeUserRepo(null);
    const uc   = new UpdateMeUseCase(repo as any);

    await expect(uc.execute(TENANT_ID, USER_ID, {} as any)).rejects.toThrow(NotFoundException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('passes gender field through to the repository', async () => {
    const repo = makeUserRepo();
    const uc   = new UpdateMeUseCase(repo as any);

    await uc.execute(TENANT_ID, USER_ID, { gender: 'female' } as any);

    expect(repo.update).toHaveBeenCalledWith(TENANT_ID, USER_ID, expect.objectContaining({ gender: 'female' }));
  });
});

// ─── UpdateLanguagePreferencesUseCase ─────────────────────────────────────────

describe('UpdateLanguagePreferencesUseCase', () => {
  it('updates preferredLocale on the user document', async () => {
    const repo = makeUserRepo();
    const uc   = new UpdateLanguagePreferencesUseCase(repo as any);

    const result = await uc.execute(TENANT_ID, USER_ID, { locale: 'en' } as any);

    expect(repo.update).toHaveBeenCalledWith(TENANT_ID, USER_ID, { preferredLocale: 'en' });
    expect(result.message).toMatch(/updated/i);
  });

  it('throws NotFoundException when user does not exist', async () => {
    const repo = makeUserRepo(null);
    const uc   = new UpdateLanguagePreferencesUseCase(repo as any);

    await expect(uc.execute(TENANT_ID, USER_ID, { locale: 'ar' } as any)).rejects.toThrow(NotFoundException);
  });

  it('supports Arabic locale (ar)', async () => {
    const repo = makeUserRepo();
    const uc   = new UpdateLanguagePreferencesUseCase(repo as any);

    await uc.execute(TENANT_ID, USER_ID, { locale: 'ar' } as any);

    const [, , update] = repo.update.mock.calls[0];
    expect(update.preferredLocale).toBe('ar');
  });
});

// ─── UpdateNotificationPreferencesUseCase ─────────────────────────────────────

describe('UpdateNotificationPreferencesUseCase', () => {
  it('upserts the UserPreferences document with correct tenant + user scope', async () => {
    const repo  = makeUserRepo();
    const model = makePrefsModel();
    const uc    = new UpdateNotificationPreferencesUseCase(repo as any, model);

    const dto    = { emailEnabled: false, inAppSoundEnabled: false };
    const result = await uc.execute(TENANT_ID, USER_ID, dto as any);

    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: expect.any(Types.ObjectId), userId: expect.any(Types.ObjectId) }),
      expect.objectContaining({ $set: expect.objectContaining({ 'email.enabled': false, 'inApp.soundEnabled': false }) }),
      { upsert: true, new: true },
    );
    expect(result.message).toMatch(/updated/i);
  });

  it('only sends fields present in the DTO (partial update)', async () => {
    const repo  = makeUserRepo();
    const model = makePrefsModel();
    const uc    = new UpdateNotificationPreferencesUseCase(repo as any, model);

    await uc.execute(TENANT_ID, USER_ID, { emailDailyDigest: true } as any);

    const [, { $set }] = model.findOneAndUpdate.mock.calls[0];
    // The use-case stores flat dot-notation keys (e.g. 'email.dailyDigest'),
    // not nested objects — access via bracket notation.
    expect($set['email.dailyDigest']).toBe(true);
    expect($set['email.enabled']).toBeUndefined();
    expect($set['inApp.enabled']).toBeUndefined();
  });

  it('throws NotFoundException when user does not exist', async () => {
    const repo  = makeUserRepo(null);
    const model = makePrefsModel();
    const uc    = new UpdateNotificationPreferencesUseCase(repo as any, model);

    await expect(uc.execute(TENANT_ID, USER_ID, {} as any)).rejects.toThrow(NotFoundException);
    expect(model.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('handles updating enabledChannels array', async () => {
    const repo    = makeUserRepo();
    const model   = makePrefsModel();
    const uc      = new UpdateNotificationPreferencesUseCase(repo as any, model);
    const channels = [NotificationChannel.EMAIL];

    await uc.execute(TENANT_ID, USER_ID, { enabledChannels: channels } as any);

    const [, { $set }] = model.findOneAndUpdate.mock.calls[0];
    expect($set.enabledChannels).toEqual(channels);
  });

  it('handles updating mutedTypes array', async () => {
    const repo  = makeUserRepo();
    const model = makePrefsModel();
    const uc    = new UpdateNotificationPreferencesUseCase(repo as any, model);

    await uc.execute(TENANT_ID, USER_ID, { mutedTypes: [NotificationType.ATTENDANCE] } as any);

    const [, { $set }] = model.findOneAndUpdate.mock.calls[0];
    expect($set.mutedTypes).toContain(NotificationType.ATTENDANCE);
  });
});
