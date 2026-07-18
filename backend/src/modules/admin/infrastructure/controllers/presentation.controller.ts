import { Controller, Get } from '@nestjs/common';
import { PresentationService } from '../../application/services/presentation.service';

/**
 * Public presentation endpoints — no auth required.
 * Powers the /presentation landing page and any public-facing data widgets.
 */
@Controller('presentation')
export class PresentationController {
  constructor(private readonly service: PresentationService) {}

  /** Full presentation payload — mission, features, stats, fundraising, roadmap, testimonials. */
  @Get()
  getAll() {
    return this.service.getPresentationData();
  }

  @Get('mission')
  getMission() {
    return this.service.getMission();
  }

  @Get('features')
  getFeatures() {
    return this.service.getFeatures();
  }

  @Get('roadmap')
  getRoadmap() {
    return this.service.getRoadmap();
  }

  @Get('success-metrics')
  getSuccessMetrics() {
    return this.service.getSuccessMetrics();
  }

  @Get('testimonials')
  getTestimonials() {
    return this.service.getTestimonials();
  }

  @Get('donation-milestones')
  getDonationMilestones() {
    return this.service.getDonationMilestones();
  }
}
