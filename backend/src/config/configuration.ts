/**
 * Centralized, typed application configuration loader.
 * Consumed via @nestjs/config's ConfigService (registered in app.module.ts).
 *
 * Structure only — values are read from environment variables at runtime.
 */
export default () => ({
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  appUrl: process.env.APP_URL || 'http://localhost:3000',

  database: {
    uri: process.env.MONGODB_URI,
    dbName: process.env.MONGODB_DB_NAME || 'siraja',
  },

  // Not currently read by any code path — TenantMiddleware always resolves
  // via the `X-Tenant-Slug` header (see tenant.middleware.ts). Kept as a
  // documented placeholder for when a subdomain-based strategy is added.
  tenancy: {
    strategy: process.env.TENANCY_STRATEGY || 'header',
    defaultTenantSlug: process.env.DEFAULT_TENANT_SLUG || 'platform',
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl: process.env.GOOGLE_CALLBACK_URL,
    },
    apple: {
      clientId: process.env.APPLE_CLIENT_ID,
      teamId: process.env.APPLE_TEAM_ID,
      keyId: process.env.APPLE_KEY_ID,
      privateKey: process.env.APPLE_PRIVATE_KEY,
      callbackUrl: process.env.APPLE_CALLBACK_URL,
    },
  },

  sms: {
    accountSid: process.env.SMS_PROVIDER_ACCOUNT_SID,
    authToken: process.env.SMS_PROVIDER_AUTH_TOKEN,
    fromNumber: process.env.SMS_PROVIDER_FROM_NUMBER,
  },

  // Phase 10 — Email delivery (provider-agnostic SMTP abstraction).
  // Switch providers by pointing these variables at any SMTP relay
  // (SendGrid, Mailgun, SES, Postmark, etc.) — no code changes required.
  email: {
    host: process.env.EMAIL_HOST || '',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
    from: process.env.EMAIL_FROM || 'noreply@siraja.com',
    fromName: process.env.EMAIL_FROM_NAME || 'Siraja',
  },

  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL || '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
  },

  // Phase 11 — AI Learning Intelligence Architecture. Moonshot AI is the
  // only LLM vendor (see docs/architecture/13-phase-11-ai-learning-intelligence-plan.md).
  // If MOONSHOT_API_KEY is unset, MoonshotProvider logs a warning and every
  // AI endpoint responds 503 AI_UNAVAILABLE — the app still boots cleanly,
  // mirroring the SmtpEmailProvider no-op-when-unconfigured pattern.
  moonshot: {
    apiKey: process.env.MOONSHOT_API_KEY || '',
    baseUrl: process.env.MOONSHOT_BASE_URL || 'https://api.moonshot.ai/v1',
    model: process.env.MOONSHOT_MODEL || 'moonshot-v1-8k',
    // Approximate USD price per 1M tokens — used only to estimate cost for
    // the usage ledger/budget guard, not billed directly by this app.
    // Adjust to match Moonshot's current published pricing.
    pricePerMillionInputTokensUsd: parseFloat(process.env.MOONSHOT_PRICE_PER_M_INPUT_USD || '2'),
    pricePerMillionOutputTokensUsd: parseFloat(process.env.MOONSHOT_PRICE_PER_M_OUTPUT_USD || '10'),
    requestTimeoutMs: parseInt(process.env.MOONSHOT_TIMEOUT_MS || '15000', 10),
  },

  // Conservative platform-wide default per approved Phase 11 decisions:
  // start of the approved $50–100/month range, tune after real usage data.
  ai: {
    dailyBudgetUsd: parseFloat(process.env.AI_DAILY_BUDGET_USD || '3'),
    monthlyBudgetUsd: parseFloat(process.env.AI_MONTHLY_BUDGET_USD || '75'),
    cacheEnabled: process.env.AI_CACHE_ENABLED !== 'false',
    maxCompletionTokens: parseInt(process.env.AI_MAX_COMPLETION_TOKENS || '700', 10),
  },

  cors: {
    origins: (process.env.CORS_ORIGINS || '').split(',').filter(Boolean),
  },

  logLevel: process.env.LOG_LEVEL || 'debug',
});
