import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_AI, JOB_AI_INSIGHT, JOB_AI_WEAKNESS_REPORT, JOB_AI_FORECAST_EXPLANATION } from '../queue.constants';
import type { AiInsightJob, AiWeaknessReportJob, AiForecastExplanationJob } from '../jobs/ai.jobs';

/**
 * AiQueueProcessor — processes async AI jobs.
 *
 * All LLM calls are routed through this processor so they never block
 * the HTTP response cycle. The processor calls the existing
 * AiInsightOrchestratorService (Phase 11) which handles cost control,
 * caching, and Moonshot API calls.
 *
 * Note: AiInsightOrchestratorService is not injected here to avoid a
 * circular dependency through the queue module. Instead, we use a lazy
 * module reference pattern — the processor logs the intent and the
 * service will be wired in Phase 13 when the full async pipeline is
 * production-validated.
 */
@Processor(QUEUE_AI)
export class AiQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(AiQueueProcessor.name);

  async process(job: Job): Promise<void> {
    this.logger.debug(`Processing AI job ${job.name} [${job.id}]`);

    switch (job.name) {
      case JOB_AI_INSIGHT:
        return this.handleInsight(job.data as AiInsightJob);
      case JOB_AI_WEAKNESS_REPORT:
        return this.handleWeaknessReport(job.data as AiWeaknessReportJob);
      case JOB_AI_FORECAST_EXPLANATION:
        return this.handleForecastExplanation(job.data as AiForecastExplanationJob);
      default:
        this.logger.warn(`Unknown AI job: ${job.name}`);
    }
  }

  private async handleInsight(data: AiInsightJob): Promise<void> {
    // Phase 13: wire to AiInsightOrchestratorService
    this.logger.log(
      `[AI Insight] tenant=${data.tenantId} student=${data.studentId} type=${data.insightType}`,
    );
  }

  private async handleWeaknessReport(data: AiWeaknessReportJob): Promise<void> {
    this.logger.log(
      `[AI Weakness Report] tenant=${data.tenantId} student=${data.studentId}`,
    );
  }

  private async handleForecastExplanation(data: AiForecastExplanationJob): Promise<void> {
    this.logger.log(
      `[AI Forecast Explanation] tenant=${data.tenantId} student=${data.studentId}`,
    );
  }
}
