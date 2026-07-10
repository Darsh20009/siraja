---
name: Siraja authentication architecture
description: Key durable decisions in Siraja's auth/session/device system (token strategy, public-route guard bypass, phone scope) — read before touching AuthModule or the global guard chain.
---

- Refresh tokens are opaque random values, hashed (SHA-256) before storage, never JWTs. **Why:** avoids a decodable/inspectable client-side payload and lets rotation-reuse detection revoke a whole token family by lookup. **How to apply:** any new "issue a long-lived credential" flow should follow the same opaque+hash pattern, not sign a JWT for it.

- Phone is an identity field only (phone+password login) — there is no SMS OTP, phone verification, or phone-based password reset anywhere in the system, by explicit product decision. All verification/recovery is email-only. **How to apply:** don't add SMS-based flows without re-confirming this has changed; `.env.example` deliberately has no SMS provider vars.

- The global guard chain (RolesGuard, PermissionsGuard, TenantScopeGuard, ResourceOwnershipGuard, from Phase 3) was written assuming every request has an authenticated `user`. Adding public routes (register/login/refresh/OAuth) required explicitly checking the `@Public()` metadata in `TenantScopeGuard` (the other three already no-op when their own decorator metadata is absent, so only the guard with an unconditional "no user -> false" needed the fix). **Why:** first pass of Phase 4 controllers reached `TenantScopeGuard`'s `if (!user) return false` and would have 403'd every public auth route. **How to apply:** whenever a new global guard is added to the chain, check whether it needs a `@Public()` bypass before assuming JwtAuthGuard always ran first.
