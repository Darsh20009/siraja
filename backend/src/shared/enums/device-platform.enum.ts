/**
 * Client platform a device/session originates from — captured at login
 * for the "active sessions" list and device-trust heuristics.
 */
export enum DevicePlatform {
  IOS = 'ios',
  ANDROID = 'android',
  WEB = 'web',
  DESKTOP = 'desktop',
  UNKNOWN = 'unknown',
}
