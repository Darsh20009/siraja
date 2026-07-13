/**
 * Quran Foundation Data Seeder — Phase 12A
 *
 * Seeds the following platform-global collections:
 *  - surahs       (114 documents)
 *  - ayahs        (6,236 documents, batched)
 *  - juzs         (30 documents)
 *  - quran_pages  (604 documents, derived from ayah metadata)
 *
 * Data source: https://api.alquran.cloud/v1/ (free, no auth required)
 *   Edition: quran-uthmani  (Uthmani script with full tashkeel)
 *
 * Run: npm run seed:quran
 *
 * Idempotent: skips collections that already have the expected count.
 */

import mongoose, { Connection } from 'mongoose';
import * as https from 'https';

// ---------------------------------------------------------------------------
// Arabic text normalisation (strip tashkeel / harakat + tatweel)
// ---------------------------------------------------------------------------
function normalizeArabic(text: string): string {
  return text
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g, '') // harakat + extended
    .replace(/\u0640/g, '') // tatweel
    .replace(/\u0671/g, '\u0627') // alef wasla → alef
    .trim();
}

// ---------------------------------------------------------------------------
// HTTP fetch helper (no external deps — uses built-in https)
// ---------------------------------------------------------------------------
function fetchJson<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 30000 }, (res) => {
      let data = '';
      res.on('data', (chunk: string) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data) as T;
          resolve(parsed);
        } catch (e) {
          reject(new Error(`Failed to parse JSON from ${url}: ${String(e)}`));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timed out: ${url}`));
    });
  });
}

// ---------------------------------------------------------------------------
// Inline schemas (lightweight — seeder runs outside NestJS DI)
// ---------------------------------------------------------------------------
const SurahSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId },
  isDeleted: { type: Boolean, default: false },
  surahNumber: { type: Number, required: true, unique: true },
  arabicName: { type: String, required: true },
  englishName: { type: String, required: true },
  englishTranslationName: { type: String, required: true },
  revelationType: { type: String, required: true },
  ayahCount: { type: Number, required: true },
  revelationOrder: { type: Number },
}, { timestamps: true, collection: 'surahs' });

const AyahSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId },
  isDeleted: { type: Boolean, default: false },
  globalAyahNumber: { type: Number, required: true, unique: true },
  surahNumber: { type: Number, required: true },
  ayahNumber: { type: Number, required: true },
  pageNumber: { type: Number, required: true },
  juzNumber: { type: Number, required: true },
  hizbNumber: { type: Number, required: true },
  arabicText: { type: String, required: true },
  arabicTextNormalized: { type: String, required: true },
}, { timestamps: true, collection: 'ayahs' });

const JuzSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId },
  isDeleted: { type: Boolean, default: false },
  juzNumber: { type: Number, required: true, unique: true },
  startSurah: { type: Number, required: true },
  startAyah: { type: Number, required: true },
  endSurah: { type: Number, required: true },
  endAyah: { type: Number, required: true },
  startGlobalAyah: { type: Number, required: true },
  endGlobalAyah: { type: Number, required: true },
  ayahCount: { type: Number, required: true },
}, { timestamps: true, collection: 'juzs' });

const QuranPageSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId },
  isDeleted: { type: Boolean, default: false },
  pageNumber: { type: Number, required: true, unique: true },
  startSurah: { type: Number, required: true },
  startAyah: { type: Number, required: true },
  endSurah: { type: Number, required: true },
  endAyah: { type: Number, required: true },
  startGlobalAyah: { type: Number, required: true },
  endGlobalAyah: { type: Number, required: true },
  juzNumber: { type: Number, required: true },
  ayahCount: { type: Number, required: true },
}, { timestamps: true, collection: 'quran_pages' });

// ---------------------------------------------------------------------------
// AlQuran Cloud API response types
// ---------------------------------------------------------------------------
interface AlQuranSurah {
  number: number;
  name: string;           // Arabic name
  englishName: string;
  englishNameTranslation: string;
  revelationType: 'Meccan' | 'Medinan';
  numberOfAyahs: number;
}

interface AlQuranAyah {
  number: number;         // global ayah number
  numberInSurah: number;
  text: string;
  page: number;
  juz: number;
  hizbQuarter: number;
  surah: { number: number; name: string; englishName: string };
}

interface AlQuranResponse<T> {
  code: number;
  status: string;
  data: T;
}

// ---------------------------------------------------------------------------
// Seeder function
// ---------------------------------------------------------------------------
export async function seedQuranFoundation(conn: Connection): Promise<void> {
  const log = (msg: string) => console.log(`[QuranSeeder] ${msg}`);
  const warn = (msg: string) => console.warn(`[QuranSeeder] WARN: ${msg}`);

  const SurahModel = conn.model('Surah', SurahSchema);
  const AyahModel = conn.model('Ayah', AyahSchema);
  const JuzModel = conn.model('Juz', JuzSchema);
  const QuranPageModel = conn.model('QuranPage', QuranPageSchema);

  // ---- Surahs ----
  const surahCount = await SurahModel.countDocuments();
  if (surahCount >= 114) {
    log(`Surahs: already seeded (${surahCount} docs) — skipping.`);
  } else {
    log('Fetching surah list from alquran.cloud...');
    const surahRes = await fetchJson<AlQuranResponse<AlQuranSurah[]>>(
      'https://api.alquran.cloud/v1/surah',
    );
    if (surahRes.code !== 200) throw new Error(`AlQuran API error: ${surahRes.status}`);

    const surahDocs = surahRes.data.map((s) => ({
      surahNumber: s.number,
      arabicName: s.name,
      englishName: s.englishName,
      englishTranslationName: s.englishNameTranslation,
      revelationType: s.revelationType === 'Meccan' ? 'meccan' : 'medinan',
      ayahCount: s.numberOfAyahs,
    }));

    await SurahModel.deleteMany({});
    await SurahModel.insertMany(surahDocs);
    log(`Surahs: seeded ${surahDocs.length} documents.`);
  }

  // ---- Ayahs ----
  const ayahCount = await AyahModel.countDocuments();
  if (ayahCount >= 6236) {
    log(`Ayahs: already seeded (${ayahCount} docs) — skipping.`);
  } else {
    log('Fetching full Quran text (quran-uthmani) from alquran.cloud — this may take 30–60s...');
    const quranRes = await fetchJson<AlQuranResponse<{ surahs: { ayahs: AlQuranAyah[] }[] }>>(
      'https://api.alquran.cloud/v1/quran/quran-uthmani',
    );
    if (quranRes.code !== 200) throw new Error(`AlQuran API error: ${quranRes.status}`);

    const allAyahs: AlQuranAyah[] = quranRes.data.surahs.flatMap((s) => s.ayahs);
    log(`Fetched ${allAyahs.length} ayahs. Building documents...`);

    const ayahDocs = allAyahs.map((a) => ({
      globalAyahNumber: a.number,
      surahNumber: a.surah.number,
      ayahNumber: a.numberInSurah,
      pageNumber: a.page,
      juzNumber: a.juz,
      hizbNumber: Math.ceil(a.hizbQuarter / 2), // hizbQuarter → hizb (1-60)
      arabicText: a.text,
      arabicTextNormalized: normalizeArabic(a.text),
    }));

    await AyahModel.deleteMany({});

    // Insert in batches of 500 to avoid MongoDB 16MB document limit
    const batchSize = 500;
    for (let i = 0; i < ayahDocs.length; i += batchSize) {
      await AyahModel.insertMany(ayahDocs.slice(i, i + batchSize));
      log(`Ayahs: inserted ${Math.min(i + batchSize, ayahDocs.length)} / ${ayahDocs.length}`);
    }
    log(`Ayahs: seeded ${ayahDocs.length} documents.`);

    // ---- Juz metadata (derived from ayah data) ----
    log('Building juz metadata...');
    const juzMap = new Map<number, { start: AlQuranAyah; end: AlQuranAyah; count: number }>();
    for (const a of allAyahs) {
      const entry = juzMap.get(a.juz);
      if (!entry) {
        juzMap.set(a.juz, { start: a, end: a, count: 1 });
      } else {
        entry.end = a;
        entry.count++;
      }
    }

    const juzDocs = Array.from(juzMap.entries()).map(([juzNum, { start, end, count }]) => ({
      juzNumber: juzNum,
      startSurah: start.surah.number,
      startAyah: start.numberInSurah,
      endSurah: end.surah.number,
      endAyah: end.numberInSurah,
      startGlobalAyah: start.number,
      endGlobalAyah: end.number,
      ayahCount: count,
    }));

    await JuzModel.deleteMany({});
    await JuzModel.insertMany(juzDocs);
    log(`Juz: seeded ${juzDocs.length} documents.`);

    // ---- Page metadata (derived from ayah data) ----
    log('Building page metadata...');
    const pageMap = new Map<number, { start: AlQuranAyah; end: AlQuranAyah; count: number; juz: number }>();
    for (const a of allAyahs) {
      const entry = pageMap.get(a.page);
      if (!entry) {
        pageMap.set(a.page, { start: a, end: a, count: 1, juz: a.juz });
      } else {
        entry.end = a;
        entry.count++;
      }
    }

    const pageDocs = Array.from(pageMap.entries()).map(([pageNum, { start, end, count, juz }]) => ({
      pageNumber: pageNum,
      startSurah: start.surah.number,
      startAyah: start.numberInSurah,
      endSurah: end.surah.number,
      endAyah: end.numberInSurah,
      startGlobalAyah: start.number,
      endGlobalAyah: end.number,
      juzNumber: juz,
      ayahCount: count,
    }));

    await QuranPageModel.deleteMany({});
    await QuranPageModel.insertMany(pageDocs);
    log(`Pages: seeded ${pageDocs.length} documents.`);
  }

  log('Quran foundation seeding complete ✓');
}
