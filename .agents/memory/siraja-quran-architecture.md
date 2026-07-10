---
name: Siraja Quran Foundation Engine architecture
description: Platform-global vs tenant-scoped split for Quran content, search normalization strategy, and bookmark/note ownership model — read before touching Quran-related modules.
---

## Platform-global vs. tenant-scoped split

Quran reference content (Surah, Ayah, Juz, QuranPage, Tafsir) is modeled
as **platform-global** (`BaseGlobalSchema`, no `tenantId`) — the Quran
text does not vary by tenant, so duplicating it per tenant would be pure
storage waste with zero benefit.

Personal data layered on top (QuranBookmark, QuranLastRead, QuranNote)
is **tenant + user scoped** (`BaseSchema`), because the same physical
user account can hold distinct memberships across tenants and their
bookmarks/notes must not leak between them.

**Why:** keeps the 6,236-document Ayah collection singular platform-wide
while still isolating personal reading state per tenant membership.

**How to apply:** any new Quran reference table (e.g. a future word-by-word
translation table) should default to platform-global unless there's a
concrete reason a tenant needs its own variant.

## Search normalization

Arabic full-text search needs diacritic normalization applied
**identically** at ingestion time (producing a stored
`arabicTextNormalized` field) and at query time — a MongoDB `$text`
index alone does not strip tashkeel/Alef variants, and most real user
input omits full diacritics. Do this once at write-time, not via a
regex scan on every read.

**Why:** without normalization, a `$text` search on raw `arabicText`
would only match queries typed with the exact same diacritics as the
stored text, which is not how anyone actually types Arabic search
queries.

**How to apply:** any future free-text Arabic search feature should
reuse `TextNormalizerService.normalizeArabic()` rather than reinventing
normalization rules.

## Bookmark/note ownership

Bookmarks and notes are strictly self-owned (never assigned to a user
by a teacher/supervisor). Ownership is enforced by scoping every
repository call to `(tenantId, userId)` pulled from `@CurrentUser()`
directly, **not** via the RBAC `ResourceOwnershipGuard`/
`OwnershipResolver` built for hierarchical ownership chains
(student → sheikh → supervisor).

**Why:** the generic ownership resolver exists for resources assigned
across a hierarchy; bookmarks/notes have no such hierarchy, so routing
through it would add indirection with no benefit.

**How to apply:** any future "always self-owned, never delegated"
resource (e.g. personal settings, personal reminders) should follow the
same direct-scoping pattern rather than register an `OwnershipResolver`.
