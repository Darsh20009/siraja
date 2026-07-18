---
name: Siraja GetMe 500 bug — tenantId type assumption
description: GetMeUseCase assumed user.tenantId was Types.ObjectId but Mongoose returns a string; fix is String(user.tenantId)
---

## The Bug
`GetMeUseCase.execute` called `user.tenantId.toHexString()`.
Mongoose returns `tenantId` as a plain string from `findById`, not a `Types.ObjectId`.
Symptom: `GET /users/me` returns 500 for every authenticated user.

## Fix Applied
`user.tenantId.toHexString()` → `String(user.tenantId)`
File: `src/modules/users/application/use-cases/get-me.use-case.ts:37`

**Why:** Mongoose does not guarantee ObjectId type on retrieved fields — depends on schema virtuals and lean/non-lean mode. Always use `String()` when you only need the hex string value.

**How to apply:** Any use case calling `.toHexString()` on a repo-returned field should use `String()` instead unless the field is explicitly cast in the schema and verified.
