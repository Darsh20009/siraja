import { OperationalSnapshot } from '@database/mongoose/schemas';

export const OPERATIONAL_SNAPSHOT_REPOSITORY = 'OPERATIONAL_SNAPSHOT_REPOSITORY';

export interface IOperationalSnapshotRepository {
  findByDate(date: string): Promise<OperationalSnapshot | null>;
  findRange(fromDate: string, toDate: string): Promise<OperationalSnapshot[]>;
  findLatest(): Promise<OperationalSnapshot | null>;
  upsert(date: string, data: Partial<OperationalSnapshot>): Promise<OperationalSnapshot>;
}
