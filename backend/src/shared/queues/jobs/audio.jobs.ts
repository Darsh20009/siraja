/** Placeholder — audio processing pipeline is deferred to a future phase. */
export interface AudioProcessJob {
  tenantId: string;
  studentId: string;
  storageKey: string;
  surahNumber: number;
  ayahStart: number;
  ayahEnd: number;
  durationSeconds: number;
}
