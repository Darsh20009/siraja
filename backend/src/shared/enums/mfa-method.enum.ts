/**
 * Future-ready enum (Phase 4 "Future Ready" requirement) — no MFA
 * enrollment flow exists yet. Reserved so `User`/`Device` fields and the
 * `AuthProvider`-adjacent typing can reference a stable set of method
 * names once TOTP/WebAuthn/passkeys/biometric enrollment ships.
 */
export enum MfaMethod {
  TOTP = 'totp',
  WEBAUTHN = 'webauthn',
  BIOMETRIC = 'biometric',
  EMAIL_OTP = 'email_otp',
}
