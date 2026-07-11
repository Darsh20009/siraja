# Phase 11 — Subscriptions & Billing Engine (Architecture Plan)

**Status:** Proposed — planning only, no implementation. Waiting on approval per project convention (`replit.md` "wait for explicit approval before implementing any feature beyond structure/scaffolding").

## Why this is the next phase

Every prior phase's "out of scope" notes name Payments/Subscriptions and AI as the remaining major surfaces. Of the two, Subscriptions & Billing is already partially scaffolded and has no unresolved dependency on features that don't exist yet:

- `backend/src/modules/subscriptions/` exists as an empty Clean Architecture skeleton (`domain/application/infrastructure` folders, all `.gitkeep`).
- Phase 2's database blueprint already reserved four schemas for this: `plan.schema.ts`, `subscription.schema.ts`, `payment.schema.ts`, `push-subscription.schema.ts`.
- Phase 3's RBAC already reserved a `BILLING` permission category (`READ`, `UPDATE`, `EXPORT`, `APPROVE`).

AI features remain explicitly out of scope until a later phase, per every phase's scope notes to date — this plan does not include them.

## Scope

### 1. Plans Module (or sub-domain of Subscriptions)
- Tenant-level subscription plans (e.g. Free/Basic/Pro tiers), each with feature limits (max circles, max students, max sheikhs) and billing interval (monthly/yearly).
- Super Admin manages the global plan catalog; Tenant Admin reads their tenant's current plan only.

### 2. Subscriptions Module
- One active subscription per tenant, referencing a Plan.
- Lifecycle: `TRIALING → ACTIVE → PAST_DUE → CANCELED / EXPIRED`.
- Renewal date tracking, cancellation (immediate vs. end-of-period), upgrade/downgrade between plans.
- Tenant Admin can view/manage their own tenant's subscription; Super Admin has full cross-tenant visibility and override.

### 3. Payments Module
- Payment record history per subscription (amount, currency, status, provider reference, invoice period).
- **Provider abstraction is mandatory**, mirroring the `IEmailProvider` pattern established in Phase 10: an `IPaymentProvider` interface + DI token, with a concrete adapter (e.g. Stripe) bound in a `PaymentsModule`. No call site talks to a specific payment gateway directly.
- Payment provider credentials via environment variables / Replit secrets only — never hardcoded, consistent with the Phase 10 audit's "no hardcoded credentials" finding.
- Webhook endpoint to receive async payment status updates (payment succeeded/failed/refunded) from the provider, signature-verified.

### 4. Feature Gating / Entitlements
- A shared guard or resolver (`SubscriptionScopeGuard`, mirroring `TenantScopeGuard`) that checks a tenant's active plan limits before allowing actions gated by plan (e.g. creating a new Circle beyond the plan's cap).
- This is the main new cross-cutting concern this phase introduces — needs care to avoid becoming a second RBAC system. Proposed approach: a single `assertWithinPlanLimit(tenantId, resource)` helper called explicitly at the specific creation use-cases that need it (Circles, Students, Sheikhs), not a global guard — keeps blast radius small and auditable.

### 5. RBAC
- `BILLING` category already reserved; extend role-permission matrix:
  - Super Admin: full CRUD across all tenants' billing data.
  - Tenant Admin: `READ`/`UPDATE` their own tenant's subscription, `EXPORT` their own invoices, `APPROVE` a plan change (e.g. confirming an upgrade that changes cost).
  - No other role gets `BILLING` access — students/parents/sheikhs/supervisors have no billing visibility.

## Explicit non-goals for Phase 11

- No AI features.
- No self-serve plan comparison/marketing pages (frontend concern, deferred to Flutter work).
- No proration engine beyond what the chosen payment provider computes natively — don't hand-roll proration math.
- No multi-payment-method wallets — one active payment method per tenant subscription is sufficient for v1.

## Open questions before implementation (need your input)

1. Which payment provider should the first `IPaymentProvider` adapter target — Stripe is the common default and Replit has a Stripe integration/skill, but confirming before building the adapter avoids rework.
2. Should trial periods exist (e.g. 14-day free trial per new tenant), or does every tenant start on a paid or free-tier plan immediately?
3. Are plan limits (max circles/students/sheikhs) fixed per plan tier, or should Super Admin be able to override a specific tenant's limits independent of their plan?

## Deliverable when approved

Same format as prior phases: full Clean Architecture (domain → application → infrastructure) for Plans/Subscriptions/Payments, wired into `AppModule`, RBAC matrix updated, `tsc --noEmit` clean, workflow boots against live MongoDB, and a `docs/architecture/13-...` blueprint doc plus a `replit.md` status update — mirroring exactly how Phases 5–10 were delivered and audited.
