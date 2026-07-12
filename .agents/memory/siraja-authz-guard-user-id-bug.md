---
name: Siraja AccessTokenPayload field name (sub, not id)
description: AccessTokenPayload uses `sub` for the user id (standard JWT claim name) — request.user.id does not exist; watch for guards/resolvers written against the wrong name.
---

## The bug pattern
`AccessTokenPayload` (`modules/auth/domain/value-objects/jwt-payload.ts`) uses `sub` for the user id — the standard JWT claim name — not `id`. `JwtStrategy.validate()` returns the payload as-is, so `request.user.id` is always `undefined`.

Found via Beta smoke testing: `PermissionsGuard` and `ResourceOwnershipGuard` were written checking/using `user.id`, so every permission-checked or ownership-checked route rejected every authenticated user with "No authenticated user on request" or resolved ownership against `undefined`. Routes with no `@RequirePermissions`/`@CheckOwnership` metadata were unaffected (those guards short-circuit `return true` before touching `user.id`), which is why this went unnoticed until a route requiring real permission checks was smoke-tested.

**How to apply:** Any new authorization guard or resolver that reads the JWT-derived `request.user` must use `user.sub` for the user id, never `user.id`. If you see `.id` used against `request.user` anywhere, it's almost certainly this bug.
