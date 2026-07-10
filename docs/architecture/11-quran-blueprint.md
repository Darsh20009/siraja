# Quran Foundation Engine Blueprint — Phase 5

## Status

**Phase 5 complete: Surahs, Ayahs, Quran Metadata, Tafsir, Quran Search,
Quran Bookmarks, Quran Notes — working code, not just structure.** Every
route, use case, repository, and index described below exists and
type-checks (`tsc --noEmit` passes against `backend/tsconfig.json`). The
AI Engine, Memorization Engine, and Teacher Features are explicitly
**out of scope** for this phase. Waiting on approval before Phase 6.

## 1. Scope

| In scope | Out of scope (explicitly) |
|---|---|
| Surahs (114 chapters, metadata) | Memorization tracking/progress |
| Ayahs (6,236 verses, Arabic text) | AI-assisted recitation/tajweed correction |
| Quran Metadata (Juz/Page navigation) | Audio recitation streaming |
| Tafsir (multi-source commentary) | Teacher assignment/review workflows |
| Quran Search (Surah + Ayah full-text) | — |
| Quran Bookmarks + Favorites + Last Read | — |
| Quran Notes (personal, Ayah/Surah-scoped) | — |

## 2. Bounded contexts

Seven modules, split along the same "platform-global reference data" vs
"tenant + user personal data" line that runs through every schema in
this phase:

| Context | Owns | Data kind | Controller |
|---|---|---|---|
| **Surahs** | 114 chapter records (name, revelation type, ayah count, order) | Platform-global | `SurahsController` (`/quran/surahs`) |
| **Ayahs** | 6,236 verse records (Arabic text + normalized search text) | Platform-global | `AyahsController` (`/quran/surahs/:n/ayahs`, `/quran/pages/:n/ayahs`, `/quran/juz/:n/ayahs`) |
| **Quran Metadata** | Juz (30) and Mushaf page (604) boundary tables | Platform-global | `QuranMetadataController` (`/quran/juz`, `/quran/pages`) |
| **Tafsir** | Multi-source commentary per Ayah | Platform-global | `TafsirController` (`/quran/surahs/:n/ayahs/:n/tafsir`) |
| **Quran Search** | No schema of its own — composes Surah + Ayah repositories | — | `QuranSearchController` (`/quran/search`) |
| **Quran Bookmarks** | Bookmarks, Favorites (one schema, `type` flag) + Last Read Position (separate schema) | Tenant + user scoped | `QuranBookmarksController` (`/quran/bookmarks`, `/quran/bookmarks/last-read`) |
| **Quran Notes** | Personal Ayah/Surah notes | Tenant + user scoped | `QuranNotesController` (`/quran/notes`) |

```
backend/src/modules/<surahs|ayahs|quran-metadata|tafsir>/
├── domain/repositories/         # interface + DI token, e.g. SURAH_REPOSITORY
├── application/
│   ├── dto/
│   └── use-cases/
└── infrastructure/
    ├── controllers/
    └── repositories/            # Mongoose implementation

backend/src/modules/quran-search/
├── application/
│   ├── dto/
│   ├── services/                # TextNormalizerService (Arabic diacritic stripping)
│   └── use-cases/                # SearchQuranUseCase — injects SURAH_REPOSITORY + AYAH_REPOSITORY
└── infrastructure/controllers/
                                  # no domain/ or repositories/ — no schema of its own

backend/src/modules/<quran-bookmarks|quran-notes>/
├── domain/repositories/
├── application/{dto,use-cases}
└── infrastructure/{controllers,repositories}
```

Why Quran Reference content (Surahs/Ayahs/Metadata/Tafsir) is
**platform-global** (`BaseGlobalSchema`, no `tenantId`) rather than
per-tenant: the Quran text itself does not vary by academy/circle — a
Surah, Ayah, or Juz boundary is the same for every tenant on the
platform. Duplicating 6,236 Ayah documents per tenant would be pure
waste with zero benefit. Personal data layered on top of that shared
text (bookmarks, notes, last-read position) **is** tenant + user scoped
(`BaseSchema`), because the same physical user account can exist as
distinct tenant memberships and a bookmark made while using one
academy's circle should not leak into another.

## 3. Data model (Phase 2 schemas, extended in Phase 5)

| Schema | Scope | Purpose |
|---|---|---|
| `Surah` | Platform-global | 114 chapters: number, Arabic/English/transliterated name, revelation type (Meccan/Medinan), ayah count, order revealed |
| `Ayah` | Platform-global | 6,236 verses: surah/ayah number, global ayah number, page/juz/hizb number, `arabicText` (as-is) + `arabicTextNormalized` (diacritics stripped, for search) |
| `Juz` | Platform-global | 30 Juz boundary records: start/end surah+ayah |
| `QuranPage` | Platform-global | 604 Mushaf page boundary records: start surah+ayah, containing juz |
| `Tafsir` | Platform-global | Commentary per Ayah, tagged by `source` (enum) + `language` — many-to-one against `Ayah` |
| `QuranBookmark` | Tenant + user | One doc per saved position or favorited Ayah, distinguished by `type` (`bookmark` \| `favorite`) |
| `QuranLastRead` | Tenant + user | Single upserted doc per user: current surah/ayah/page — auto-tracked, not user-curated |
| `QuranNote` | Tenant + user | Personal note attached to an Ayah or a whole Surah (`scope` enum), free text |

`arabicTextNormalized` is computed once at ingestion time (diacritics
stripped, Alef/Yaa/Taa-Marbuta variants folded) and stored alongside the
untouched `arabicText`, rather than normalized on every read — see §4.

## 4. Search architecture

```mermaid
flowchart LR
    Q[Client query] --> N[TextNormalizerService.normalizeArabic]
    N --> S1[MongoDB $text search\non Surah.name fields]
    N --> S2[MongoDB $text search\non Ayah.arabicTextNormalized]
    S1 --> M[SearchQuranUseCase merges results]
    S2 --> M
    M --> R[QuranSearchResult\n{ surahs[], ayahs[] }]
```

- **Normalization, not query-time regex**: `TextNormalizerService`
  strips tashkeel (`\u064B`-`\u065F`, `\u0670`, `\u06D6`-`\u06ED`),
  folds Alef/Hamza variants (`أ إ آ ٱ` → `ا`), Taa Marbuta (`ة` → `ه`),
  Alef Maqsura (`ى` → `ي`), and Tatweel (`ـ`). The same function is
  applied once at ingestion (producing `Ayah.arabicTextNormalized`) and
  again at query time — so a user typing without full diacritics (the
  overwhelming majority of real input) matches text stored with full
  diacritics, without a regex scan per query.
- **Indexes**: a MongoDB `$text` index on `Ayah.arabicTextNormalized`
  and a `$text` index across `Surah`'s name fields (Arabic, English,
  transliterated) — both declared directly on the Mongoose schemas
  (Phase 2), giving native relevance scoring (`textScore`) instead of a
  hand-rolled ranking.
- **No dedicated search schema**: `QuranSearchModule` owns no
  collection. It imports `SurahsModule`/`AyahsModule` and injects their
  exported `SURAH_REPOSITORY`/`AYAH_REPOSITORY` tokens — keeping
  single-entity CRUD in those modules and cross-cutting search concerns
  (normalization, merged ranking) in one place, rather than duplicating
  query logic or forcing Ayah/Surah repositories to know about search
  presentation.
- **Result shape**: `{ surahs: SurahRecord[], ayahs: AyahRecord[] }` —
  deliberately un-merged (not a single flattened relevance-ranked list)
  since a Surah-name match and an Ayah-text match serve different UI
  affordances on the client (jump to Surah vs. jump to Ayah).

## 5. Bookmark & personal-data architecture

```mermaid
flowchart TD
    U[User] -->|POST /quran/bookmarks| CB[CreateBookmarkUseCase]
    CB --> QB[(QuranBookmark\ntype: bookmark|favorite)]
    U -->|PUT /quran/bookmarks/last-read| UL[UpdateLastReadUseCase]
    UL --> QL[(QuranLastRead\none doc per user, upserted)]
    U -->|POST /quran/notes| CN[CreateNoteUseCase]
    CN --> QN[(QuranNote\nscope: ayah|surah)]
```

- **Bookmarks vs. Favorites vs. Last Read** — three different lifecycle
  shapes, modeled as two schemas:
  - `QuranBookmark` (`type: BOOKMARK | FAVORITE`) — user-curated,
    multiple per user, created/deleted explicitly. One schema instead of
    two because both are "a user-curated pointer to an Ayah" with
    identical shape; a unique index on
    `(tenantId, user, surahNumber, ayahNumber, type)` prevents duplicate
    bookmarks of the same type on the same Ayah (`ConflictException` on
    violation).
  - `QuranLastRead` — exactly one document per user, upserted on every
    reading-position update. Intentionally **not** a `QuranBookmark`
    type: it is auto-tracked infrastructure state, not something the
    user creates or deletes.
- **Ownership enforcement** — bookmarks and notes are always strictly
  self-owned (never assigned to a user by a teacher/supervisor, unlike
  e.g. a `MemorizationRecord`). Every repository method takes
  `(tenantId, userId, ...)` explicitly and every controller pulls both
  from `@CurrentUser()` (the JWT payload), rather than routing through
  the Phase 3 `ResourceOwnershipGuard`/`OwnershipResolver` built for
  hierarchical ownership (student → sheikh → supervisor). Delete/update
  use cases additionally re-fetch by `(tenantId, userId, id)` before
  mutating, so a bookmark/note ID belonging to another user 404s instead
  of leaking existence via a 403.
- **Notes scope** — `QuranNoteScope.AYAH` requires `ayahNumber`;
  `QuranNoteScope.SURAH` omits it (a note about the whole chapter).

## 6. Authorization

Extends the Phase 3 permission registry with three new categories,
granted read (Quran) / full CRUD (Bookmarks, Notes) to every
authenticated role (Supervisor, Sheikh, Parent, Student) — Quran
reference content and personal reading tools have no reason to be
restricted by role, unlike administrative resources:

| Category | Actions | Granted to |
|---|---|---|
| `quran` | `read` | Supervisor, Sheikh, Parent, Student |
| `quran_bookmarks` | `create`, `read`, `update`, `delete` | Supervisor, Sheikh, Parent, Student |
| `quran_notes` | `create`, `read`, `update`, `delete` | Supervisor, Sheikh, Parent, Student |

Tenant Admin and Super Admin inherit access per the existing Phase 3
rules (Tenant Admin: tenant-scoped but otherwise unrestricted; Super
Admin: bypasses all checks) — no Quran-specific override was needed.

## 7. What Phase 6 will need from this phase

The Memorization Engine (next phase, not yet approved) will reference
Ayahs/Surahs by number (`surahNumber`/`ayahNumber`, not by re-deriving
Quran text), and will very likely want to reuse
`AYAH_REPOSITORY`/`SURAH_REPOSITORY` the same way `QuranSearchModule`
does today — import the module, inject the exported token, no need to
duplicate reference-data access.
