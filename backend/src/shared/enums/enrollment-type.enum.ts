/**
 * The kind of event recorded in a `StudentEnrollment` document.
 * Every time a student is assigned to or moved between a circle or
 * sheikh, one of these records is created — forming an auditable
 * assignment history.
 */
export enum EnrollmentType {
  CIRCLE_ASSIGNMENT = 'circle_assignment',     // first assignment to a circle
  SHEIKH_ASSIGNMENT = 'sheikh_assignment',     // direct one-on-one sheikh link (no circle)
  CIRCLE_REASSIGNMENT = 'circle_reassignment', // moved from one circle to another
  CIRCLE_REMOVAL = 'circle_removal',           // removed from a circle (no replacement)
  SHEIKH_REMOVAL = 'sheikh_removal',           // direct one-on-one sheikh link removed
}
