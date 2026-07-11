import { Injectable } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { AiFeatureType } from '@shared/enums/ai.enum';
import { GetCompletionForecastUseCase } from '@modules/forecast/application/use-cases/get-completion-forecast.use-case';
import { AiInsightOrchestratorService } from '../services/ai-insight-orchestrator.service';
import { AI_SYSTEM_PREAMBLE } from '../prompts/ai-prompt.constants';

/**
 * GenerateForecastExplanationUseCase — "Completion Forecast Explanations"
 * (deliverable #6). Wraps `GetCompletionForecastUseCase`'s deterministic
 * numbers (pace, projections, estimated completion date) in a plain-Arabic
 * narrative; never recomputes or overrides the forecast itself — the AI
 * only explains numbers that already exist.
 */
@Injectable()
export class GenerateForecastExplanationUseCase {
  constructor(
    private readonly forecastUseCase: GetCompletionForecastUseCase,
    private readonly orchestrator: AiInsightOrchestratorService,
  ) {}

  async execute(user: AccessTokenPayload, studentId: string, force = false) {
    // Ownership/RBAC already fully enforced inside GetCompletionForecastUseCase.
    const forecast = await this.forecastUseCase.execute(user, studentId);

    return this.orchestrator.getOrGenerate({
      tenantId: user.tenantId,
      userId: user.sub,
      studentId,
      type: AiFeatureType.FORECAST_EXPLANATION,
      sourceData: forecast,
      structured: { forecast },
      force,
      buildPrompt: () => ({
        system: AI_SYSTEM_PREAMBLE,
        user: `اشرح توقّع إتمام الحفظ التالي لطالب واحد بلغة مبسطة ومشجّعة لولي الأمر، مع توضيح ماذا يعنيه معدّل التقدّم ودرجة الانتظام دون تكرار الأرقام حرفيًا فقط:\n\n${JSON.stringify(forecast)}`,
      }),
    });
  }
}
