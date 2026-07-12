---
name: Siraja compound sparse unique index gotcha
description: sparse:true on a compound unique index does NOT skip a doc unless it's missing ALL indexed fields — critical when one field (e.g. tenantId) is always present.
---

## The bug pattern
`sparse: true` on a **compound** MongoDB index only excludes a document from the index if the document is missing **every** field in the index key. If even one indexed field is always present (e.g. `tenantId`, which every tenant-scoped doc has), the document is never excluded — the other, optional field(s) get indexed as `null`, and a `unique: true` compound sparse index then allows only **one** document per tenant with that field absent, ever. Every subsequent doc missing that field collides with `E11000 duplicate key ... phone: null` (or whichever field).

Found via Beta smoke testing: `User` schema's `{tenantId, email}` / `{tenantId, phone}` unique+sparse indexes blocked the *second* email-only (or phone-only) registration per tenant. Same latent pattern existed on `Attendance`'s `{tenantId, session, student}` unique+sparse index (session-less attendance capped at one per student per tenant).

**Fix:** use `partialFilterExpression: { <optionalField>: { $type: '<type>' } }` instead of `sparse: true` on compound indexes where uniqueness should only apply when the optional field is actually present. Requires dropping and letting the app recreate the old index (Mongoose won't auto-migrate an existing index's options if the name is unchanged).

**How to apply:** Grep `sparse: true` on any *compound* (multi-field) unique index before trusting it — single-field sparse indexes don't have this problem.
