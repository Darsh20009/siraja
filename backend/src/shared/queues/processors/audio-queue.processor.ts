import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_AUDIO, JOB_AUDIO_PROCESS } from '../queue.constants';
import type { AudioProcessJob } from '../jobs/audio.jobs';

/** Placeholder processor — audio pipeline is deferred to a future phase. */
@Processor(QUEUE_AUDIO)
export class AudioQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(AudioQueueProcessor.name);

  async process(job: Job): Promise<void> {
    if (job.name === JOB_AUDIO_PROCESS) {
      const data = job.data as AudioProcessJob;
      this.logger.log(
        `[Audio] tenant=${data.tenantId} student=${data.studentId} ` +
          `key=${data.storageKey} — deferred to Phase 13.`,
      );
    } else {
      this.logger.warn(`Unknown audio job: ${job.name}`);
    }
  }
}
