# Siraja Backend

NestJS + TypeScript API for the Siraja Quran education platform.

## Architecture

Clean Architecture / Domain-Driven Design, organized by bounded context
under `src/modules/*`. See `/docs/architecture` at the repo root for the
full blueprints (backend, database, multi-tenancy, API).

Each module follows:

```
modules/<name>/
  domain/          # Entities, value objects, repository interfaces (no framework deps)
  application/     # Use cases (business rules) + DTOs
  infrastructure/  # Controllers, Mongoose schemas/repositories, strategies
  <name>.module.ts
```

## Status

Project structure only — no business logic has been implemented yet.

## Getting started (once dependencies are installed)

```bash
npm install
cp .env.example .env   # fill in real secrets
npm run start:dev
```
