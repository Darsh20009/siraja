import { baseEmailTemplate, BaseTemplateData } from './base.template';

export interface WelcomeTemplateData extends BaseTemplateData {
  fullName: string;
  loginUrl: string;
  role?: string;
}

export function welcomeEmailTemplate(data: WelcomeTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const { fullName, loginUrl, tenantName = 'سراج' } = data;

  const subject = `🌟 مرحباً بك في ${tenantName} — حسابك جاهز!`;

  const body = `
    <h2>أهلاً وسهلاً، ${fullName}! 🌙</h2>

    <p>
      يسعدنا انضمامك إلى <strong>${tenantName}</strong> — منصتك الذكية لحفظ القرآن الكريم
      وتتبع تقدمك مع شيخك وحلقتك.
    </p>

    <p>
      حسابك جاهز الآن ويمكنك البدء فوراً:
    </p>

    <ul class="feature-list">
      <li>📖 &nbsp;تتبع حفظك وتسميعك يومياً</li>
      <li>🧑‍🏫 &nbsp;التواصل مع شيخك ومتابعة تقييماتك</li>
      <li>📊 &nbsp;تحليل ذكي لأخطائك وتقدمك</li>
      <li>🏆 &nbsp;مشاركة في لوحات الشرف</li>
      <li>🤖 &nbsp;مساعد ذكاء اصطناعي لدعم رحلة الحفظ</li>
    </ul>

    <div class="btn-wrap">
      <a href="${loginUrl}" class="btn">🚀 ابدأ رحلتك مع القرآن</a>
    </div>

    <hr class="section-divider"/>

    <p style="font-size:14px;color:#555;text-align:center;">
      بارك الله فيك ووفقك لما يحبه ويرضاه 🤲
    </p>

    <p style="font-size:13px;color:#888;">
      للمساعدة تواصل معنا على
      <a href="mailto:support@siraja.website" style="color:#1A6B4A;">support@siraja.website</a>
    </p>
  `;

  const text = `أهلاً وسهلاً، ${fullName}!\n\nمرحباً بك في منصة سراج.\n\nابدأ رحلتك عبر: ${loginUrl}\n\nبارك الله فيك.\nفريق ${tenantName}`;

  return { subject, html: baseEmailTemplate(body, data), text };
}
