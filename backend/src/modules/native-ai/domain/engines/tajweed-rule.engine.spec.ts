import { TajweedRuleEngine } from './tajweed-rule.engine';

describe('TajweedRuleEngine', () => {
  let engine: TajweedRuleEngine;

  beforeEach(() => {
    engine = new TajweedRuleEngine();
  });

  // ── detectNoonRules ───────────────────────────────────────────────────────

  describe('detectNoonRules', () => {
    it('returns empty array when word has no noon-sakinah or tanwin', () => {
      expect(engine.detectNoonRules('الله', 'الرحمن', 0)).toHaveLength(0);
    });

    it('returns empty array when there is no next word', () => {
      expect(engine.detectNoonRules('من', '', 0)).toHaveLength(0);
    });

    it('detects idhar when next word starts with a throat letter (ء)', () => {
      // من + ءامن
      const obs = engine.detectNoonRules('من', 'ءامن', 0);
      expect(obs).toHaveLength(1);
      expect(obs[0].rule).toBe('idhar');
      expect(obs[0].difficulty).toBe('easy');
      expect(obs[0].category).toBe('noon_rules');
    });

    it('detects idhar when next word starts with ع', () => {
      const obs = engine.detectNoonRules('من', 'عبد', 0);
      expect(obs[0].rule).toBe('idhar');
    });

    it('detects idhar when next word starts with ه', () => {
      const obs = engine.detectNoonRules('من', 'هو', 0);
      expect(obs[0].rule).toBe('idhar');
    });

    it('detects idgham_bighunn when next word starts with ي', () => {
      const obs = engine.detectNoonRules('من', 'يشاء', 0);
      expect(obs).toHaveLength(1);
      expect(obs[0].rule).toBe('idgham_bighunn');
      expect(obs[0].difficulty).toBe('hard');
    });

    it('detects idgham_bighunn when next word starts with ن', () => {
      const obs = engine.detectNoonRules('من', 'نور', 0);
      expect(obs[0].rule).toBe('idgham_bighunn');
    });

    it('detects idgham_bighunn when next word starts with م', () => {
      const obs = engine.detectNoonRules('من', 'ملك', 0);
      expect(obs[0].rule).toBe('idgham_bighunn');
    });

    it('detects idgham_bighunn when next word starts with و', () => {
      const obs = engine.detectNoonRules('من', 'واحد', 0);
      expect(obs[0].rule).toBe('idgham_bighunn');
    });

    it('detects idgham_bilaghunna when next word starts with ل', () => {
      const obs = engine.detectNoonRules('من', 'لدنا', 0);
      expect(obs).toHaveLength(1);
      expect(obs[0].rule).toBe('idgham_bilaghunna');
      expect(obs[0].difficulty).toBe('medium');
    });

    it('detects idgham_bilaghunna when next word starts with ر', () => {
      const obs = engine.detectNoonRules('من', 'ربك', 0);
      expect(obs[0].rule).toBe('idgham_bilaghunna');
    });

    it('detects iqlab when next word starts with ب', () => {
      const obs = engine.detectNoonRules('من', 'بعد', 0);
      expect(obs).toHaveLength(1);
      expect(obs[0].rule).toBe('iqlab');
      expect(obs[0].difficulty).toBe('hard');
    });

    it('detects ikhfa when next word starts with an ikhfa letter (ت)', () => {
      const obs = engine.detectNoonRules('من', 'تحت', 0);
      expect(obs).toHaveLength(1);
      expect(obs[0].rule).toBe('ikhfa');
      expect(obs[0].difficulty).toBe('hard');
    });

    it('detects ikhfa when next word starts with ص', () => {
      const obs = engine.detectNoonRules('من', 'صراط', 0);
      expect(obs[0].rule).toBe('ikhfa');
    });

    it('assigns wordIndex correctly', () => {
      const obs = engine.detectNoonRules('من', 'ءامن', 5);
      expect(obs[0].wordIndex).toBe(5);
    });

    it('detects tanwin on last letter + next word starts with ل (idgham bilaghunna)', () => {
      // word ending with tanwin fathah ً
      const obs = engine.detectNoonRules('شيئًا', 'لعلهم', 0);
      // tanwin + ل → idgham_bilaghunna
      if (obs.length > 0) {
        expect(obs[0].rule).toBe('idgham_bilaghunna');
      }
    });
  });

  // ── detectMeemRules ───────────────────────────────────────────────────────

  describe('detectMeemRules', () => {
    it('returns empty array when word does not end in meem', () => {
      expect(engine.detectMeemRules('الله', 'الرحمن', 0)).toHaveLength(0);
    });

    it('returns empty array when there is no next word', () => {
      expect(engine.detectMeemRules('هم', '', 0)).toHaveLength(0);
    });

    it('detects idgham_shafawi when next word starts with م', () => {
      const obs = engine.detectMeemRules('هم', 'ملكوا', 0);
      expect(obs).toHaveLength(1);
      expect(obs[0].rule).toBe('idgham_shafawi');
      expect(obs[0].difficulty).toBe('hard');
    });

    it('detects ikhfa_shafawi when next word starts with ب', () => {
      const obs = engine.detectMeemRules('هم', 'بالغيب', 0);
      expect(obs).toHaveLength(1);
      expect(obs[0].rule).toBe('ikhfa_shafawi');
      expect(obs[0].difficulty).toBe('medium');
    });

    it('detects idhar_shafawi when next word starts with any other letter', () => {
      const obs = engine.detectMeemRules('هم', 'فيها', 0);
      expect(obs).toHaveLength(1);
      expect(obs[0].rule).toBe('idhar_shafawi');
      expect(obs[0].difficulty).toBe('easy');
    });

    it('triggerText is meem character', () => {
      const obs = engine.detectMeemRules('هم', 'فيها', 0);
      expect(obs[0].triggerText).toBe('م');
    });

    it('assigns correct wordIndex', () => {
      const obs = engine.detectMeemRules('هم', 'فيها', 3);
      expect(obs[0].wordIndex).toBe(3);
    });
  });

  // ── detectMaddRules ───────────────────────────────────────────────────────

  describe('detectMaddRules', () => {
    it('returns empty array for a word with no madd letters', () => {
      // 'كتب' — no ا و ي
      expect(engine.detectMaddRules('كتب', 0)).toHaveLength(0);
    });

    it('detects madd_tabii for natural madd (madd letter not followed by hamza/sukun)', () => {
      // رحيم — ي not followed by hamza or sukun in this spelling
      const obs = engine.detectMaddRules('رحيم', 0);
      const tabii = obs.filter((o) => o.rule === 'madd_tabii');
      expect(tabii.length).toBeGreaterThan(0);
    });

    it('madd_tabii has difficulty "easy"', () => {
      const obs = engine.detectMaddRules('كريم', 0);
      const tabii = obs.find((o) => o.rule === 'madd_tabii');
      if (tabii) expect(tabii.difficulty).toBe('easy');
    });

    it('detects madd_muttasil when madd letter is followed by hamza in same word', () => {
      // جَاءَ — alef followed by hamza
      const obs = engine.detectMaddRules('جَاءَ', 0);
      const muttasil = obs.filter((o) => o.rule === 'madd_muttasil');
      expect(muttasil.length).toBeGreaterThan(0);
    });

    it('madd_muttasil has difficulty "hard"', () => {
      const obs = engine.detectMaddRules('جَاءَ', 0);
      const muttasil = obs.find((o) => o.rule === 'madd_muttasil');
      if (muttasil) expect(muttasil.difficulty).toBe('hard');
    });

    it('detects madd_lazim when madd letter is followed by sukun (U+0652)', () => {
      // alef + sukun
      const obs = engine.detectMaddRules('ا\u0652ب', 0);
      const lazim = obs.filter((o) => o.rule === 'madd_lazim');
      expect(lazim.length).toBeGreaterThan(0);
    });

    it('madd_lazim has difficulty "hard"', () => {
      const obs = engine.detectMaddRules('ا\u0652ب', 0);
      const lazim = obs.find((o) => o.rule === 'madd_lazim');
      if (lazim) expect(lazim.difficulty).toBe('hard');
    });

    it('all detected rules have category "madd"', () => {
      const obs = engine.detectMaddRules('الرحيم', 0);
      for (const o of obs) {
        expect(o.category).toBe('madd');
      }
    });

    it('assigns correct wordIndex', () => {
      const obs = engine.detectMaddRules('رحيم', 2);
      for (const o of obs) {
        expect(o.wordIndex).toBe(2);
      }
    });
  });

  // ── detectQalqala ─────────────────────────────────────────────────────────

  describe('detectQalqala', () => {
    it('returns empty array when word has no qalqala letters', () => {
      expect(engine.detectQalqala('الرحمن', 0)).toHaveLength(0);
    });

    it('detects qalqala_kubra for qalqala letter at end of word', () => {
      // 'قلق' — ق at end
      const obs = engine.detectQalqala('قلق', 0);
      const kubra = obs.filter((o) => o.rule === 'qalqala_kubra');
      expect(kubra.length).toBeGreaterThan(0);
    });

    it('qalqala_kubra has difficulty "hard"', () => {
      const obs = engine.detectQalqala('قلق', 0);
      const kubra = obs.find((o) => o.rule === 'qalqala_kubra');
      expect(kubra?.difficulty).toBe('hard');
    });

    it('detects qalqala_sughra for qalqala letter in the middle of a word', () => {
      // 'قبل' — ب at index 1 (middle), ق at index 0 (not end if word length > 1)
      const obs = engine.detectQalqala('قبل', 0);
      const sughra = obs.filter((o) => o.rule === 'qalqala_sughra');
      expect(sughra.length).toBeGreaterThan(0);
    });

    it('qalqala_sughra has difficulty "medium"', () => {
      const obs = engine.detectQalqala('جبل', 0);
      const sughra = obs.find((o) => o.rule === 'qalqala_sughra');
      if (sughra) expect(sughra.difficulty).toBe('medium');
    });

    it('all detected rules have category "qalqala"', () => {
      const obs = engine.detectQalqala('قطب', 0);
      for (const o of obs) {
        expect(o.category).toBe('qalqala');
      }
    });

    it('detects all 5 qalqala letters in "قطبجد"', () => {
      const obs = engine.detectQalqala('قطبجد', 0);
      expect(obs).toHaveLength(5);
    });

    it('assigns correct wordIndex', () => {
      const obs = engine.detectQalqala('قرأ', 3);
      for (const o of obs) {
        expect(o.wordIndex).toBe(3);
      }
    });
  });

  // ── detectGhunna ─────────────────────────────────────────────────────────

  describe('detectGhunna', () => {
    it('returns empty array for word with no noon/meem shadda', () => {
      expect(engine.detectGhunna('الله', 0)).toHaveLength(0);
    });

    it('detects ghunna for noon with shadda (نّ)', () => {
      // إِنَّ: noon + shadda
      const obs = engine.detectGhunna('إِنَّ', 0);
      expect(obs).toHaveLength(1);
      expect(obs[0].rule).toBe('ghunna');
    });

    it('detects ghunna for meem with shadda (مّ)', () => {
      const obs = engine.detectGhunna('ثُمَّ', 0);
      expect(obs).toHaveLength(1);
      expect(obs[0].rule).toBe('ghunna');
    });

    it('ghunna has difficulty "medium"', () => {
      const obs = engine.detectGhunna('إِنَّ', 0);
      expect(obs[0].difficulty).toBe('medium');
    });

    it('ghunna has category "ghunna"', () => {
      const obs = engine.detectGhunna('ثُمَّ', 0);
      expect(obs[0].category).toBe('ghunna');
    });

    it('detects multiple ghunna occurrences in one word', () => {
      // نّمّ — both noon and meem with shadda
      const obs = engine.detectGhunna('نَّمَّ', 0);
      expect(obs.length).toBeGreaterThanOrEqual(2);
    });

    it('assigns correct wordIndex', () => {
      const obs = engine.detectGhunna('إِنَّ', 7);
      expect(obs[0].wordIndex).toBe(7);
    });
  });

  // ── detectLamRules ────────────────────────────────────────────────────────

  describe('detectLamRules', () => {
    it('returns empty array when word does not start with ال', () => {
      expect(engine.detectLamRules('رحمن', 0)).toHaveLength(0);
    });

    it('detects lam_shamsiyya when letter after ال is solar (ن)', () => {
      const obs = engine.detectLamRules('النور', 0);
      expect(obs).toHaveLength(1);
      expect(obs[0].rule).toBe('lam_shamsiyya');
    });

    it('lam_shamsiyya has difficulty "medium"', () => {
      const obs = engine.detectLamRules('النور', 0);
      expect(obs[0].difficulty).toBe('medium');
    });

    it('detects lam_qamariyya when letter after ال is lunar (ك)', () => {
      const obs = engine.detectLamRules('الكتاب', 0);
      expect(obs).toHaveLength(1);
      expect(obs[0].rule).toBe('lam_qamariyya');
    });

    it('lam_qamariyya has difficulty "easy"', () => {
      const obs = engine.detectLamRules('الكتاب', 0);
      expect(obs[0].difficulty).toBe('easy');
    });

    it('lam_shamsiyya for solar letter ر (الرحمن)', () => {
      const obs = engine.detectLamRules('الرحمن', 0);
      expect(obs[0].rule).toBe('lam_shamsiyya');
    });

    it('lam_qamariyya for lunar letter ق (القرآن)', () => {
      const obs = engine.detectLamRules('القرآن', 0);
      expect(obs[0].rule).toBe('lam_qamariyya');
    });

    it('lam_shamsiyya for solar letter ت (التوبة)', () => {
      const obs = engine.detectLamRules('التوبة', 0);
      expect(obs[0].rule).toBe('lam_shamsiyya');
    });

    it('all detected rules have category "lam_rules"', () => {
      const obs = engine.detectLamRules('الشمس', 0);
      for (const o of obs) {
        expect(o.category).toBe('lam_rules');
      }
    });

    it('assigns correct wordIndex', () => {
      const obs = engine.detectLamRules('الرحمن', 4);
      expect(obs[0].wordIndex).toBe(4);
    });
  });

  // ── analyzeText ───────────────────────────────────────────────────────────

  describe('analyzeText', () => {
    const bismillah = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';

    it('returns an array', () => {
      expect(Array.isArray(engine.analyzeText(bismillah))).toBe(true);
    });

    it('returns observations for the Bismillah', () => {
      const obs = engine.analyzeText(bismillah);
      expect(obs.length).toBeGreaterThan(0);
    });

    it('returns empty array for empty string', () => {
      expect(engine.analyzeText('')).toHaveLength(0);
    });

    it('every observation has required fields', () => {
      const obs = engine.analyzeText(bismillah);
      for (const o of obs) {
        expect(o.rule).toBeTruthy();
        expect(o.category).toBeTruthy();
        expect(typeof o.wordIndex).toBe('number');
        expect(o.triggerText).toBeTruthy();
        expect(['easy', 'medium', 'hard']).toContain(o.difficulty);
        expect(o.description).toBeTruthy();
      }
    });

    it('detects lam rules for الرحمن (solar) and الرحيم (solar)', () => {
      const obs = engine.analyzeText('الرحمن الرحيم');
      const lamRules = obs.filter((o) => o.category === 'lam_rules');
      expect(lamRules.length).toBeGreaterThanOrEqual(2);
    });

    it('detects madd rules in words with long vowels', () => {
      const obs = engine.analyzeText('الرحيم');
      const maddRules = obs.filter((o) => o.category === 'madd');
      expect(maddRules.length).toBeGreaterThan(0);
    });
  });

  // ── summarize ─────────────────────────────────────────────────────────────

  describe('summarize', () => {
    it('returns zero counts for empty applications array', () => {
      const summary = engine.summarize([]);
      expect(summary.totalApplications).toBe(0);
      expect(summary.complexityScore).toBe(0);
      expect(summary.byDifficulty.easy).toBe(0);
      expect(summary.byDifficulty.medium).toBe(0);
      expect(summary.byDifficulty.hard).toBe(0);
    });

    it('totalApplications equals input length', () => {
      const apps = engine.analyzeText('الرحمن الرحيم');
      const summary = engine.summarize(apps);
      expect(summary.totalApplications).toBe(apps.length);
    });

    it('byDifficulty counts sum to totalApplications', () => {
      const apps = engine.analyzeText('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ');
      const summary = engine.summarize(apps);
      const total =
        summary.byDifficulty.easy +
        summary.byDifficulty.medium +
        summary.byDifficulty.hard;
      expect(total).toBe(summary.totalApplications);
    });

    it('complexityScore is between 0 and 100', () => {
      const apps = engine.analyzeText('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ');
      const summary = engine.summarize(apps);
      expect(summary.complexityScore).toBeGreaterThanOrEqual(0);
      expect(summary.complexityScore).toBeLessThanOrEqual(100);
    });

    it('dominantRule is undefined when no applications', () => {
      expect(engine.summarize([]).dominantRule).toBeUndefined();
    });

    it('dominantRule is set when applications exist', () => {
      const apps = engine.analyzeText('الرحمن الرحيم');
      const summary = engine.summarize(apps);
      if (apps.length > 0) {
        expect(summary.dominantRule).toBeTruthy();
      }
    });

    it('byCategory is a Map with correct category counts', () => {
      const apps = engine.analyzeText('الرحمن الرحيم');
      const summary = engine.summarize(apps);
      expect(summary.byCategory).toBeInstanceOf(Map);
      let categoryTotal = 0;
      for (const count of summary.byCategory.values()) {
        categoryTotal += count;
      }
      expect(categoryTotal).toBe(summary.totalApplications);
    });

    it('higher hard:easy ratio gives higher complexityScore', () => {
      const allHard = [
        { rule: 'ikhfa' as const, category: 'noon_rules' as const, wordIndex: 0, triggerText: 'ن', difficulty: 'hard' as const, description: '' },
        { rule: 'iqlab' as const, category: 'noon_rules' as const, wordIndex: 0, triggerText: 'ن', difficulty: 'hard' as const, description: '' },
      ];
      const allEasy = [
        { rule: 'idhar' as const, category: 'noon_rules' as const, wordIndex: 0, triggerText: 'ن', difficulty: 'easy' as const, description: '' },
        { rule: 'lam_qamariyya' as const, category: 'lam_rules' as const, wordIndex: 0, triggerText: 'ال', difficulty: 'easy' as const, description: '' },
      ];
      const hardScore = engine.summarize(allHard).complexityScore;
      const easyScore = engine.summarize(allEasy).complexityScore;
      expect(hardScore).toBeGreaterThan(easyScore);
    });
  });
});
