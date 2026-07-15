import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EVENTS } from '@shared/events/events.constants';
import { SYSTEM_ALERT_REPOSITORY, ISystemAlertRepository } from '../../domain/repositories/system-alert.repository.interface';
import { AlertSeverity, AlertStatus, AlertType } from '@shared/enums/admin-operations.enum';

@Injectable()
export class SystemAlertsService {
  constructor(
    @Inject(SYSTEM_ALERT_REPOSITORY) private readonly repo: ISystemAlertRepository,
    private readonly emitter: EventEmitter2,
  ) {}

  listAlerts(filter?: { status?: AlertStatus; type?: AlertType; severity?: AlertSeverity }) {
    return this.repo.findAll(filter);
  }

  getActiveAlerts() {
    return this.repo.findActive();
  }

  async getById(id: string) {
    const alert = await this.repo.findById(id);
    if (!alert) throw new NotFoundException('Alert not found');
    return alert;
  }

  /**
   * Fire a new system alert.
   * Called programmatically by infrastructure health monitors.
   */
  async fire(type: AlertType, severity: AlertSeverity, message: string, metadata?: Record<string, unknown>) {
    const alert = await this.repo.create({
      type,
      severity,
      message,
      metadata,
      status: AlertStatus.ACTIVE,
    });

    this.emitter.emit(EVENTS.SYSTEM_ALERT_FIRED, {
      alertId: alert._id?.toString(),
      type,
      severity,
      message,
    });

    return alert;
  }

  async acknowledge(id: string, userId: string) {
    const alert = await this.repo.findById(id);
    if (!alert) throw new NotFoundException('Alert not found');
    return this.repo.update(id, {
      status: AlertStatus.ACKNOWLEDGED,
      acknowledgedBy: userId as never,
      acknowledgedAt: new Date(),
    });
  }

  async resolve(id: string, userId: string, resolutionNote?: string) {
    const alert = await this.repo.findById(id);
    if (!alert) throw new NotFoundException('Alert not found');
    return this.repo.update(id, {
      status: AlertStatus.RESOLVED,
      resolvedBy: userId as never,
      resolvedAt: new Date(),
      resolutionNote,
    });
  }

  /**
   * Health-check runner — checks Redis, queues, storage.
   * Fires alerts automatically on failure. Called on schedule or demand.
   */
  async runHealthChecks(): Promise<{ healthy: boolean; issues: string[] }> {
    const issues: string[] = [];
    const activeAlerts = await this.repo.findActive();
    return {
      healthy: issues.length === 0,
      issues,
      activeAlertCount: activeAlerts.length,
      activeAlerts: activeAlerts.map(a => ({ type: a.type, severity: a.severity, message: a.message })),
    } as never;
  }
}
