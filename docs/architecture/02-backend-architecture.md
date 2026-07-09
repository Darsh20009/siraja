# Backend Architecture (NestJS)

## Layering (per module)

```
modules/<context>/
  domain/
    entities/          # AggregateRoot / BaseEntity subclasses — pure TS, no decorators from Nest/Mongoose
    value-objects/      # Immutable, structurally-compared types (e.g. Email, PhoneNumber, TenantSlug)
    repositories/        # Interfaces only (IXxxRepository), consumed by application layer
  application/
    use-cases/          # One class per business operation, implements IUseCase<Req, Res>
    dto/                 # class-validator DTOs for controller input/output shaping
  infrastructure/
    controllers/         # HTTP surface — thin, delegates to use cases
    repositories/        # Mongoose-backed implementations of domain repository interfaces
    schemas/              # @Schema() Mongoose models (extend database/mongoose/schemas/base.schema.ts)
    strategies/            # Passport strategies (jwt, google, apple) where relevant (auth module)
  <context>.module.ts
```

## Cross-cutting (`src/core`, `src/common`)

- `core/domain` — `BaseEntity`, `AggregateRoot`, `ValueObject`, `IBaseRepository<T>`:
  shared domain primitives with zero framework dependencies.
- `core/application` — `IUseCase<TRequest, TResponse>` contract.
- `core/infrastructure/tenancy` — `TenantContext` (request-scoped) and
  `TenantMiddleware`, resolving the tenant from the URL path before any
  controller runs.
- `common/guards` — `JwtAuthGuard`, `RolesGuard` (RBAC via `@Roles()`).
- `common/decorators` — `@CurrentUser()`, `@CurrentTenant()`, `@Roles()`.
- `common/filters` / `common/interceptors` — uniform error and success
  response envelopes.

## Bounded contexts (modules)

| Module          | Responsibility                                                        |
|-----------------|-------------------------------------------------------------------------|
| `auth`          | Login (email/phone/Google/Apple), JWT issuance, refresh token rotation |
| `tenants`       | Tenant (academy/circle organization) lifecycle, slug resolution         |
| `users`         | Shared user identity/profile underlying every role                      |
| `academies`     | Quran academy entities, staff, structure                                |
| `circles`       | Quran circles (halaqat) within a tenant                                 |
| `sheikhs`       | Sheikh profiles, assignments to circles/students                        |
| `students`      | Student profiles, enrollment                                            |
| `parents`       | Parent profiles, linkage to student(s)                                  |
| `memorization`  | Memorization plans, progress, and evaluation records                    |
| `notifications` | In-app/push/email/SMS notification dispatch                             |
| `subscriptions` | Tenant billing/subscription plans and entitlements                      |

Every module is registered once in `AppModule` (composition root) and
exports only what other modules are explicitly allowed to consume.

## Dependency rule

`infrastructure` → `application` → `domain`. Never the reverse. Domain
layer imports nothing from `@nestjs/*` or `mongoose`.

## Dependency Injection

NestJS's IoC container binds interface tokens (e.g. `USER_REPOSITORY`) to
concrete infrastructure implementations at the module level via
`providers: [{ provide: USER_REPOSITORY, useClass: MongoUserRepository }]`,
so use cases depend only on the interface.
