# Siraja — Architecture Overview

## What Siraja is

A multi-tenant SaaS platform for Quran education and memorization, serving:
Quran circles, Quran academies, independent sheikhs, parents, and students.

## Guiding principles

1. **Clean Architecture** — dependencies point inward. Domain has zero
   framework knowledge; application orchestrates domain logic via use cases;
   infrastructure (HTTP, database, external services) is a swappable detail.
2. **Domain-Driven Design** — the system is decomposed into bounded contexts
   (see `02-backend-architecture.md`), each owning its own entities, value
   objects, and repository contracts.
3. **Repository Pattern** — application/domain code depends on repository
   interfaces (`IBaseRepository<T>`), never on Mongoose/MongoDB directly.
4. **Dependency Injection** — NestJS's DI container wires infrastructure
   implementations into application use cases at runtime (constructor
   injection only, no service locators in domain/application code).
5. **Modular Architecture** — every bounded context is a self-contained
   Nest module; modules communicate through exported providers or domain
   events, never by reaching into each other's internals.

## Repositories in this project

```
/backend    NestJS + TypeScript API (Clean Architecture / DDD)
/frontend   Flutter client (feature-first Clean Architecture)
/docs       Architecture blueprints (this folder)
```

## Stack

| Layer      | Technology                                   |
|------------|-----------------------------------------------|
| Frontend   | Flutter, Material 3, responsive, RTL-first    |
| Backend    | Node.js, NestJS, TypeScript                   |
| Database   | MongoDB Atlas (Mongoose ODM)                  |
| Auth       | Email, Phone (OTP), Google, Apple, JWT + refresh tokens |
| Tenancy    | Path-based (`siraja.website/:tenantSlug`)     |

## Status

This phase delivers **structure only**: folder layout, module skeletons,
configuration scaffolding, and the blueprints in this folder. No business
logic, no database migrations, no working auth flow yet. Each blueprint
below is the contract the real implementation will follow.

## Blueprint index

- [Backend architecture](./02-backend-architecture.md)
- [Frontend architecture](./03-frontend-architecture.md)
- [Database blueprint](./04-database-blueprint.md)
- [Multi-tenant blueprint](./05-multi-tenant-blueprint.md)
- [API structure blueprint](./06-api-structure.md)
- [Environment configuration](./07-environment-configuration.md)
- [Schema diagrams (ER)](./08-schema-diagrams.md)
- [Authorization blueprint (RBAC)](./09-authorization-blueprint.md)

## Phase progress

- **Phase 1 (complete)**: folder architecture, module/feature skeletons,
  configuration scaffolding.
- **Phase 2 (complete)**: full MongoDB Atlas database architecture — all
  33 Mongoose schemas implemented under
  `backend/src/database/mongoose/schemas/`, shared-database +
  `tenantId`-isolation model, indexing, validation, enums, soft delete.
  Schema architecture only — no services/controllers/APIs. See
  [database blueprint](./04-database-blueprint.md).
- **Phase 3 (complete)**: full RBAC authorization architecture — permission
  registry (18 categories × 7 actions), permission seeder, role
  permission matrix (6 system roles), permission/tenant-scope/resource-
  ownership guards, `@RequirePermissions()`/`@CheckOwnership()`
  decorators, Super Admin bypass, per-role ownership rules. Architecture
  only — no controllers/APIs/business logic. See
  [authorization blueprint](./09-authorization-blueprint.md).
- **Phase 4+**: not started — waiting on approval.
