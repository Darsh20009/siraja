/**
 * Purpose of a single-use, time-limited token sent by email. Kept as one
 * generic `VerificationToken` collection (see database schema) rather
 * than two, since both are "prove control of this email address" tokens
 * that only differ in what happens after they're redeemed.
 */
export enum TokenPurpose {
  EMAIL_VERIFICATION = 'email_verification',
  PASSWORD_RESET = 'password_reset',
}
