import { SystemAlert } from '@database/mongoose/schemas';
import { AlertStatus, AlertType, AlertSeverity } from '@shared/enums/admin-operations.enum';

export const SYSTEM_ALERT_REPOSITORY = 'SYSTEM_ALERT_REPOSITORY';

export interface ISystemAlertRepository {
  findAll(filter?: { status?: AlertStatus; type?: AlertType; severity?: AlertSeverity }): Promise<SystemAlert[]>;
  findActive(): Promise<SystemAlert[]>;
  findById(id: string): Promise<SystemAlert | null>;
  create(data: Partial<SystemAlert>): Promise<SystemAlert>;
  update(id: string, data: Partial<SystemAlert>): Promise<SystemAlert | null>;
  countActive(): Promise<number>;
}
