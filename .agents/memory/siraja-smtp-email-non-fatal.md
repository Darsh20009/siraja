---
name: Siraja SMTP email non-fatal pattern
description: SMTP errors must never crash auth flows; three use cases and the provider itself required patching.
---

## Rule
All calls to `MailerService` in auth use cases must be wrapped in `try/catch` with `logger.warn`. Email delivery is best-effort — the account and session are created regardless of SMTP availability.

**Why:** When `EMAIL_HOST` is set but `EMAIL_PASS` is absent, `SmtpEmailProvider` creates a transporter without auth, the relay rejects with `530 authentication Required`, and the raw throw propagated as HTTP 500, crashing registration and login entirely.

## Applied fixes (2026-07-18)

1. **`SmtpEmailProvider`** — guard added: if `host` is set but `!(user && pass)`, set `transporter = null` (same no-op path as missing EMAIL_HOST). Never attempt unauthenticated SMTP when credentials are partial.
2. **`RegisterUseCase`** — `sendVerificationEmail()` wrapped in try/catch + logger.warn + logger field added.
3. **`LoginUseCase`** — `sendSuspiciousLoginAlert()` wrapped in try/catch + logger.warn + logger field added.
4. **`RequestPasswordResetUseCase`** — `sendPasswordResetEmail()` wrapped in try/catch + logger.warn + logger field added.

## How to apply
Any future auth use case that calls `MailerService` must wrap the call. Never let SMTP I/O block the user-facing HTTP response.

## SMTP env var mapping
- `EMAIL_HOST` → `email.host` — set to `smtp.resend.com` in shared env
- `EMAIL_PASS` → `email.pass` — **not yet set** (P1 blocker); must be Resend API key
- `EMAIL_USER` → `email.user` — set to `resend`
- Pattern to enable: set `EMAIL_PASS` secret with Resend API key
