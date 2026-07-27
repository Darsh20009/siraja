# Siraja Backend

Siraja is a Quran education & memorization platform with a multi-tenant NestJS backend.

## Stack
- **Framework**: NestJS (TypeScript)
- **Database**: MongoDB (Atlas)
- **Cache/Queues**: Redis via Upstash + BullMQ
- **Auth**: JWT (access + refresh), Google OAuth, Apple OAuth
- **Storage**: Cloudflare R2 (S3-compatible)
- **AI**: Internal Siraja AI engine boundary (not configured yet)

## How to run

The **Start application** workflow starts the backend. It compiles TypeScript with the NestJS CLI and listens on port 5000.

```
cd backend && nest start
```

- **API docs (Swagger)**: `/docs`
- **Health check**: `GET /api/v1/health`
- **API prefix**: `/api/v1`

All tenant-scoped routes require the `X-Tenant-Slug` header.

## Environment

Non-sensitive environment settings are configured in `.replit` under
`[userenv.shared]`. Credentials and signing keys must be stored in Replit
Secrets, not in project configuration. Key ones:

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string (Secret) |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | JWT signing keys (Secrets) |
| `REDIS_URL` | Redis connection string (Secret) |
| `SESSION_SECRET` | Session signing secret (Secret) |
| `STORAGE_*` | Cloudflare R2 file storage |
| `EMAIL_*` | SMTP email delivery |

Optional (app starts without them): Google/Apple OAuth, SMS provider,
external AI providers. The local Siraja AI engine currently reports
`AI_UNAVAILABLE` without making external network calls.

## Notable quirks
- `argon2` v0.45+ changed its TypeScript types — `password.service.ts` uses named imports (`hash`, `verify`, `argon2id`, `HashOptions`) instead of the namespace import.
- A Redis quota or connectivity failure disables BullMQ queues and uses the
  in-process cache fallback; the API itself continues to serve requests.

## Seeding
```bash
cd backend
npm run seed:quran          # Seed Quran data (surahs/ayahs)
npm run seed:permissions    # Seed RBAC permissions
npm run seed:beta-demo      # Seed demo tenant + users
```

## User preferences
- Keep existing project structure and stack — no restructuring unless explicitly asked.
