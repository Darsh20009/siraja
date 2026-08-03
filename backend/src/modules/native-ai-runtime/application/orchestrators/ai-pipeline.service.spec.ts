import { AiPipelineService } from './ai-pipeline.service';

describe('AiPipelineService', () => {
  let service: AiPipelineService;

  beforeEach(() => {
    service = new AiPipelineService();
    service.registerStep('double', (x: unknown) => (x as number) * 2, true, 0);
    service.registerStep('addTen', (x: unknown) => (x as number) + 10, true, 1);
    service.registerStep('stringify', (x: unknown) => String(x), true, 2);
  });

  // ── registerStep / getStep ─────────────────────────────────────────────────

  describe('registerStep / getStep', () => {
    it('registers a step and makes it retrievable', () => {
      service.registerStep('noop', (x) => x, false, 99);
      expect(service.getStep('noop')).toBeDefined();
    });

    it('returns undefined for an unregistered step', () => {
      expect(service.getStep('ghost')).toBeUndefined();
    });
  });

  // ── run — sequential ──────────────────────────────────────────────────────

  describe('run (sequential)', () => {
    it('passes output of each step to the next', () => {
      const config = { name: 'test', steps: ['double', 'addTen'], mode: 'sequential' as const };
      const result = service.run(config, 5);
      // 5 * 2 = 10, 10 + 10 = 20
      expect(result.output).toBe(20);
    });

    it('marks success = true when all steps succeed', () => {
      const config = { name: 'test', steps: ['double', 'addTen'], mode: 'sequential' as const };
      expect(service.run(config, 3).success).toBe(true);
    });

    it('records all step outcomes', () => {
      const config = { name: 'test', steps: ['double', 'addTen'], mode: 'sequential' as const };
      const result = service.run(config, 5);
      expect(result.stepOutcomes).toHaveLength(2);
      expect(result.stepOutcomes[0].stepName).toBe('double');
    });

    it('records an error when a required step is missing', () => {
      const config = { name: 'test', steps: ['missing_step'], mode: 'sequential' as const };
      const result = service.run(config, 0);
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('stops pipeline on a required step failure', () => {
      service.registerStep('throws', () => { throw new Error('fail'); }, true, 0);
      const config = { name: 'test', steps: ['throws', 'double'], mode: 'sequential' as const };
      const result = service.run(config, 5);
      expect(result.success).toBe(false);
      expect(result.stepOutcomes.find((s) => s.stepName === 'double')).toBeUndefined();
    });

    it('continues past a non-required failing step', () => {
      service.registerStep('optFail', () => { throw new Error('optional fail'); }, false, 0);
      const config = {
        name: 'test',
        steps: ['optFail', 'double'],
        mode: 'sequential' as const,
      };
      const result = service.run(config, 5);
      const doubleOutcome = result.stepOutcomes.find((s) => s.stepName === 'double');
      expect(doubleOutcome?.success).toBe(true);
    });
  });

  // ── run — parallel ────────────────────────────────────────────────────────

  describe('run (parallel)', () => {
    it('runs all steps with the same input', () => {
      const config = { name: 'par', steps: ['double', 'addTen'], mode: 'parallel' as const };
      const result = service.run(config, 5);
      const output = result.output as Record<string, unknown>;
      expect(output['double']).toBe(10);   // 5 * 2
      expect(output['addTen']).toBe(15);   // 5 + 10
    });

    it('marks success = true when all parallel steps succeed', () => {
      const config = { name: 'par', steps: ['double'], mode: 'parallel' as const };
      expect(service.run(config, 2).success).toBe(true);
    });

    it('records errors but continues when a step throws', () => {
      service.registerStep('parFail', () => { throw new Error('par fail'); }, true, 0);
      const config = { name: 'par', steps: ['parFail', 'double'], mode: 'parallel' as const };
      const result = service.run(config, 5);
      expect(result.errors.length).toBeGreaterThan(0);
      // double should still have run
      const doubleOutcome = result.stepOutcomes.find((s) => s.stepName === 'double');
      expect(doubleOutcome?.success).toBe(true);
    });
  });

  // ── runSteps ──────────────────────────────────────────────────────────────

  describe('runSteps', () => {
    it('runs steps sequentially without a PipelineConfig', () => {
      const result = service.runSteps(['double', 'addTen'], 3);
      expect(result.output).toBe(16); // 3 * 2 = 6, 6 + 10 = 16
    });
  });
});
