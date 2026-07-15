import { Injectable } from '@nestjs/common';
import { AgeGroup } from '@shared/enums/gamification.enum';

export interface AgeProfileMetadata {
  ageGroup: AgeGroup;
  /** Frontend can use these hints to adapt the UX (avatar style, animations, language register). */
  hints: {
    animationsLevel: 'high' | 'medium' | 'low';
    colorScheme: 'vibrant' | 'balanced' | 'subtle';
    languageRegister: 'simple' | 'standard' | 'advanced';
    motivationStyle: 'character' | 'social' | 'achievement' | 'mastery';
    showStreak: boolean;
    showLeaderboard: boolean;
    showBadges: boolean;
    showAchievements: boolean;
    celebrationIntensity: 'high' | 'medium' | 'low';
  };
}

const PROFILE_MAP: Record<AgeGroup, AgeProfileMetadata['hints']> = {
  [AgeGroup.CHILD]: {
    animationsLevel: 'high',
    colorScheme: 'vibrant',
    languageRegister: 'simple',
    motivationStyle: 'character',
    showStreak: true,
    showLeaderboard: false, // protect young children from competitive pressure
    showBadges: true,
    showAchievements: true,
    celebrationIntensity: 'high',
  },
  [AgeGroup.TEEN]: {
    animationsLevel: 'medium',
    colorScheme: 'balanced',
    languageRegister: 'standard',
    motivationStyle: 'social',
    showStreak: true,
    showLeaderboard: true,
    showBadges: true,
    showAchievements: true,
    celebrationIntensity: 'medium',
  },
  [AgeGroup.ADULT]: {
    animationsLevel: 'low',
    colorScheme: 'subtle',
    languageRegister: 'advanced',
    motivationStyle: 'achievement',
    showStreak: true,
    showLeaderboard: true,
    showBadges: true,
    showAchievements: true,
    celebrationIntensity: 'low',
  },
  [AgeGroup.SENIOR]: {
    animationsLevel: 'low',
    colorScheme: 'subtle',
    languageRegister: 'standard',
    motivationStyle: 'mastery',
    showStreak: false,
    showLeaderboard: false,
    showBadges: false,
    showAchievements: true,
    celebrationIntensity: 'low',
  },
};

@Injectable()
export class AgeAdaptiveService {
  /** Derive age group from date of birth string (YYYY-MM-DD or Date). */
  getAgeGroup(dateOfBirth: string | Date): AgeGroup {
    const dob = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;
    const now = new Date();
    const age = now.getFullYear() - dob.getFullYear() -
      (now.getMonth() < dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate()) ? 1 : 0);

    if (age < 13) return AgeGroup.CHILD;
    if (age < 18) return AgeGroup.TEEN;
    if (age < 60) return AgeGroup.ADULT;
    return AgeGroup.SENIOR;
  }

  getProfileMetadata(ageGroup: AgeGroup): AgeProfileMetadata {
    return { ageGroup, hints: PROFILE_MAP[ageGroup] };
  }

  /** Convenience: derive group and return full metadata from DOB. */
  getMetadataFromDob(dateOfBirth: string | Date): AgeProfileMetadata {
    const ageGroup = this.getAgeGroup(dateOfBirth);
    return this.getProfileMetadata(ageGroup);
  }
}
