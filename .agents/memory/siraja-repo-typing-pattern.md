---
name: Siraja repository typing pattern
description: FlattenMaps<T> incompatibilities with Map/Record fields, toRecord/toItem call-site rules, supertest import style, and Role enum values.
---

## toRecord / toItem function signatures

All 29 repositories use `.lean()` on reads, so `toRecord`/`toItem` parameter type is:
```ts
FlattenMaps<SchemaClass> & { _id: Types.ObjectId }
```

**Why:** `.lean()` returns plain objects with Maps flattened to Records — `FlattenMaps<T>` models this precisely.

## FlattenMaps vs hydrated documents at call sites

`FlattenMaps<T>` is NOT assignable from a hydrated `HydratedDocument<T>` when T contains `Map<K,V>` or `Record<string, unknown>` fields (TypeScript's recursive FlattenMaps produces a different index signature).

**Four repositories call toRecord/toItem on `.create()` output** (not lean):
- `notification.repository.ts`, `message.repository.ts`, `message-thread.repository.ts`, `ai-insight.repository.ts`

**Fix pattern:** call `.toObject()` then cast:
```ts
toItem(doc.toObject() as unknown as FlattenMaps<T> & { _id: Types.ObjectId })
```

**Why:** `.toObject()` performs the same Map→Record flattening as `.lean()` at runtime; the cast is safe.

## FlattenMaps<Record<string, unknown>> incompatibility

`FlattenMaps<Record<string, unknown>>` ≠ `Record<string, unknown>` in TypeScript's type system.
Fields like `summary: Record<string, unknown>` or `data: Record<string, unknown>` in schemas cause TS2345 when the field is accessed on a `FlattenMaps<T>` value.

**Fix:** cast the specific field access:
```ts
(doc.summary?.content as string) ?? ''
(doc.summary?.structured as Record<string, unknown>) ?? {}
```

## Nullable lean results passed to typed helpers

`.findOneAndUpdate().lean()` returns `T | null`. Functions typed as `(doc: T & ...)` reject null.

**Fix:** Change helper signature to accept null:
```ts
function extractSm2(doc: (FlattenMaps<AyahPerformance> & { _id: Types.ObjectId }) | null): Sm2State
```

## supertest import with esModuleInterop

With `esModuleInterop: true` (as in this project), use default import:
```ts
import request from 'supertest';   // ✅ correct
import * as request from 'supertest'; // ❌ causes "This expression is not callable"
```

## Role enum values

`Role` enum (`shared/enums/roles.enum.ts`) values:
- `Role.SUPER_ADMIN = 'super_admin'`
- `Role.TENANT_ADMIN = 'tenant_admin'`  ← NOT `Role.ADMIN`
- `Role.SHEIKH = 'sheikh'`
- `Role.STUDENT = 'student'`

## Audit documents location

All three audit docs live at:
- `backend/docs/audits/final-code-quality.md`
- `backend/docs/audits/final-security-review.md`
- `backend/docs/audits/final-performance-review.md`
