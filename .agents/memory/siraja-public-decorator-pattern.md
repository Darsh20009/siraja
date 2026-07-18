---
name: Siraja @Public() decorator must be explicit on all anonymous endpoints
description: JwtAuthGuard is global — any endpoint without @Public() returns 401. Four controllers were missing it (fixed Jul 2026).
---

## Pattern
`JwtAuthGuard` is registered as `APP_GUARD` in `AuthorizationModule`.
It checks `IS_PUBLIC_KEY` metadata via Reflector.
Without `@Public()`, every route requires a valid JWT — including routes named "public" in comments.

## Controllers Fixed
- `DonationsController`: `@Public()` on getPublicCampaigns, getPublicCampaign, getFundraisingProgress, submitDonation
- `PresentationController`: `@Public()` at class level (entire controller anonymous)
- `FeedbackController`: `@Public()` on submit, listPublic
- `FeatureVotingController`: `@Public()` on list, getTopVoted, getById, suggest

**Why:** Guard is global-first (opt-out, not opt-in). A comment saying "no auth required" does nothing.

**How to apply:** Before adding any new controller, check if any endpoint should be unauthenticated. If yes, import and apply `@Public()` from `@modules/auth/infrastructure/decorators/public.decorator`.
