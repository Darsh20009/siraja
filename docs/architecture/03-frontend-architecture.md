# Frontend Architecture (Flutter)

## Layering (per feature)

```
lib/features/<feature>/
  data/
    datasources/    # Remote (Dio/REST) and local (secure storage/cache) sources
    models/         # DTOs — fromJson/toJson, mapped to/from domain entities
    repositories/   # Implements domain/repositories/*, returns Either<Failure, T>
  domain/
    entities/       # Plain Dart classes, no JSON/serialization concerns
    repositories/   # Abstract repository contracts consumed by use cases
    usecases/       # Extends core/usecases/usecase.dart's UseCase<Type, Params>
  presentation/
    pages/          # Screens
    widgets/        # Feature-local widgets
    state/          # Bloc/Cubit state management
```

## Cross-cutting

- `lib/app` — app shell: `app.dart` (MaterialApp), `theme/` (Material 3
  light/dark), `routes/` (go_router, tenant-aware paths), `di/`
  (get_it + injectable service locator), `localization/` (ar/en, RTL).
- `lib/core` — `network/api_client.dart` (Dio client with tenant + auth
  interceptors), `errors/failures.dart` (typed failures surfaced to the
  UI), `usecases/usecase.dart` (shared use case contract), `utils/`,
  reusable `widgets/`.

## Features (maps to backend bounded contexts)

`auth`, `tenant`, `academy`, `circle`, `sheikh`, `student`, `parent`,
`memorization`, `notifications`, `profile`.

This is a deliberate, non-1:1 mapping to the backend's bounded contexts,
not a mirror:

- `profile` is the client-side aggregate for the backend's `users` context
  (self-profile view/edit for whichever role is logged in), rather than a
  separate `users` feature — the app never manages other users' identity
  records directly outside role-specific screens (e.g. a sheikh managing
  students lives under `student`/`circle`, not a generic `users` feature).
- `subscriptions` (tenant billing/plan) has no corresponding frontend
  feature yet — it is managed by tenant admins and is out of scope until
  a billing UI is planned; it will be added as its own feature
  (`lib/features/subscriptions`) when that work starts, not folded into
  an existing one.

## Responsive design

Layouts adapt via breakpoints (mobile / tablet / desktop-web) using
`LayoutBuilder`/`MediaQuery` in shared widgets — Flutter targets Android,
iOS, and Web from one codebase.

## RTL support

Arabic is the primary/default locale (`app.dart` sets `locale: Locale('ar')`).
`Directionality` follows the active locale automatically via
`GlobalMaterialLocalizations`; English is supported as a secondary LTR
locale. All feature UIs must use directional-agnostic widgets
(`EdgeInsetsDirectional`, `Alignment.startEnd` equivalents) rather than
hardcoded left/right.

## State management

`flutter_bloc` (Bloc/Cubit) per feature's `presentation/state`, fed by
use cases — no direct data-layer access from widgets.

## Dependency injection

`get_it` + `injectable` code generation (`build_runner`) registers
data sources, repositories, and use cases; `app/di/injection.dart` is the
single bootstrap entry point called from `main.dart`.
