/// Application routing (go_router), mirroring the backend's path-based
/// multi-tenancy, e.g.:
///
///   /:tenantSlug/login
///   /:tenantSlug/dashboard
///   /:tenantSlug/circles/:circleId
///
/// Structure only — routes to be defined per feature.
library app_router;
