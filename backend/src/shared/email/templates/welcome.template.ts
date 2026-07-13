import { baseEmailTemplate, BaseTemplateData } from './base.template';

export interface WelcomeTemplateData extends BaseTemplateData {
  fullName: string;
  loginUrl: string;
}

export function welcomeEmailTemplate(data: WelcomeTemplateData): { subject: string; html: string; text: string } {
  const { fullName, loginUrl, tenantName = 'Siraja' } = data;

  const subject = `مرحباً بك في ${tenantName} — حسابك جاهز 🌟`;

  const body = `
    <h2>أهلاً وسهلاً، ${fullName}!</h2>
    <p>
      يسعدنا انضمامك إلى <strong>${tenantName}</strong> — منصتك الذكية لحفظ القرآن الكريم وتتبع التقدم.
    </p>
    <p>
      يمكنك الآن تسجيل الدخول والبدء في رحلتك مع القرآن الكريم:
    </p>
    <p style="text-align: center; margin: 28px 0;">
      <a href="${loginUrl}" class="btn">تسجيل الدخول</a>
    </p>
    <p>
      إذا كان لديك أي استفسار، لا تتردد في التواصل مع فريق الدعم.
    </p>
    <p>
      بارك الله فيكم ووفقكم لما يحبه ويرضاه.
    </p>
    <p>فريق ${tenantName}</p>
  `;

  const text = `أهلاً وسهلاً، ${fullName}!\n\nمرحباً بك في ${tenantName}. يمكنك تسجيل الدخول عبر: ${loginUrl}\n\nفريق ${tenantName}`;

  return { subject, html: baseEmailTemplate(body, data), text };
}
