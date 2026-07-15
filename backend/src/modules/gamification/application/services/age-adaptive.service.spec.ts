import { Test, TestingModule } from '@nestjs/testing';
import { AgeAdaptiveService } from './age-adaptive.service';
import { AgeGroup } from '@shared/enums/gamification.enum';

describe('AgeAdaptiveService', () => {
  let service: AgeAdaptiveService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AgeAdaptiveService],
    }).compile();
    service = module.get(AgeAdaptiveService);
  });

  describe('getAgeGroup', () => {
    it('classifies child < 13', () => {
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - 10);
      expect(service.getAgeGroup(dob)).toBe(AgeGroup.CHILD);
    });

    it('classifies teen 13–17', () => {
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - 15);
      expect(service.getAgeGroup(dob)).toBe(AgeGroup.TEEN);
    });

    it('classifies adult 18–59', () => {
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - 30);
      expect(service.getAgeGroup(dob)).toBe(AgeGroup.ADULT);
    });

    it('classifies senior 60+', () => {
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - 65);
      expect(service.getAgeGroup(dob)).toBe(AgeGroup.SENIOR);
    });

    it('accepts string DOB', () => {
      expect(service.getAgeGroup('1990-01-01')).toBe(AgeGroup.ADULT);
    });
  });

  describe('getProfileMetadata', () => {
    it('returns correct hints for CHILD', () => {
      const meta = service.getProfileMetadata(AgeGroup.CHILD);
      expect(meta.ageGroup).toBe(AgeGroup.CHILD);
      expect(meta.hints.animationsLevel).toBe('high');
      expect(meta.hints.showLeaderboard).toBe(false);
      expect(meta.hints.celebrationIntensity).toBe('high');
    });

    it('returns correct hints for SENIOR', () => {
      const meta = service.getProfileMetadata(AgeGroup.SENIOR);
      expect(meta.hints.showStreak).toBe(false);
      expect(meta.hints.showLeaderboard).toBe(false);
      expect(meta.hints.motivationStyle).toBe('mastery');
    });

    it('getMetadataFromDob is consistent with getAgeGroup', () => {
      const meta = service.getMetadataFromDob('2000-01-01');
      const group = service.getAgeGroup('2000-01-01');
      expect(meta.ageGroup).toBe(group);
    });
  });
});
