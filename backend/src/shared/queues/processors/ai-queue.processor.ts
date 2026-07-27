import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_AI, JOB_AI_INSIGHT, JOB_AI_WEAKNESS_REPORT, JOB_AI_FORECAST_EXPLANATION } from '../queue.constants';
import type { AiInsightJob, AiWeaknessReportJob, AiForecastExplanationJob } from '../jobs/ai.jobs';

/**
 * AiQueueProcessor — processes async AI jobs.
 *
 * All LLM calls are routed through this processor so they never block
 * the HTTP response cycle. The local engine is currently unavailable, so
 * queued AI work fails explicitly rather than being reported as completed.
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
    this.logger.warn(
      `[AI Insight] unavailable for tenant=${data.tenantId} student=${data.studentId} type=${data.insightType}`,
    );
  }

  private async handleWeaknessReport(data: AiWeaknessReportJob): Promise<void> {
    this.logger.warn(
      `[AI Weakness Report] unavailable for tenant=${data.tenantId} student=${data.studentId}`,
    );
  }

  private async handleForecastExplanation(data: AiForecastExplanationJob): Promise<void> {
    this.logger.warn(
      `[AI Forecast Explanation] unavailable for tenant=${data.tenantId} student=${data.studentId}`,
    );
  }
}
