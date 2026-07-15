import { Controller, Get } from '@nestjs/common';
import { PresentationService } from '../../application/services/presentation.service';

/** /presentation — public platform overview endpoint */
@Controller('presentation')
export class PresentationController {
  constructor(private readonly service: PresentationService) {}

  @Get()
  getPresentationData() {
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
}
