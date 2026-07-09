# Siraja Frontend (Flutter)

Responsive, Material 3, RTL-first Flutter client for the Siraja platform.

## Architecture

Feature-first Clean Architecture:

```
lib/features/<name>/
  data/          # datasources (remote/local), models (DTOs), repository impls
  domain/        # entities, repository interfaces, use cases
  presentation/  # pages, widgets, state (bloc/cubit)
```

Cross-cutting: `lib/core` (network, errors, usecases, utils, widgets),
`lib/app` (theming, routing, DI, localization).

## Status

Project structure only — no screens/business logic implemented yet.
Flutter SDK is not installed in this environment; install it locally or
via a Flutter-enabled workspace to run `flutter pub get` / `flutter run`.

## Multi-tenancy

The app resolves the tenant from the URL path segment (web) or a
selected/stored tenant slug (mobile), matching the backend's path-based
tenancy strategy (e.g. `siraja.website/tuwaiq`).
