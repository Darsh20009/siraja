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

  tenancy: {
    strategy: process.env.TENANCY_STRATEGY || 'path',
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

  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL || '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
  },

  cors: {
    origins: (process.env.CORS_ORIGINS || '').split(',').filter(Boolean),
  },

  logLevel: process.env.LOG_LEVEL || 'debug',
});
