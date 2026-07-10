---
name: Siraja RBAC architecture
description: Key durable decisions in Siraja's authorization system (permission resolution, super-admin bypass, multi-role) — read before modifying guards, resolvers, or the User schema.
---

- Users can hold multiple roles (`User.roles: Role[]`, non-empty) — not a single `role` field. Every guard/resolver must read the array and use `.some()`/`.includes()`/OR-across-roles semantics, never assume one role. **Why:** a code review caught a half-implemented single-role path (JWT payload, schema) that silently broke the "multiple roles per user" requirement.

- Super Admin bypass in any guard must be decided directly from the JWT-asserted `user.roles`, never via a tenant-scoped DB lookup (e.g. `findOne({_id, tenantId})`). **Why:** a Super Admin's own `tenantId` is a reserved platform tenant that won't match the tenant resolved from the URL when acting cross-tenant, so a tenant-filtered lookup silently fails to find them and incorrectly denies. **How to apply:** any new guard/resolver that needs "is this a super admin" must check the array membership up front, before any tenant-scoped query.

- Ownership resolution ("may this user act on this specific instance") is a separate composable check from permission resolution ("can this role/user do this kind of action at all") — both are needed because e.g. a sheikh with `sessions.update` still shouldn't update another sheikh's session. Resource-type-specific existence checks (including for the `USER` resource type itself) must confirm tenant-scoped existence before granting — fail closed on missing/deleted/cross-tenant ids, never match on bare id equality.
