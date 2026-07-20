import { baseEmailTemplate, BaseTemplateData } from './base.template';
import { getButtonHtml, SIRAJA_BRAND_DEFAULTS } from '../brand/brand-config';

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
  const {
    fullName,
    loginUrl,
    tenantName   = SIRAJA_BRAND_DEFAULTS.tenantName,
    primaryColor = SIRAJA_BRAND_DEFAULTS.primaryColor,
    accentColor  = SIRAJA_BRAND_DEFAULTS.accentColor,
  } = data;

  const subject = `🌟 مرحباً بك في ${tenantName} — حسابك جاهز!`;

  const ctaButton = getButtonHtml({
    href:         loginUrl,
    label:        '🚀 ابدأ رحلتك مع القرآن',
    primaryColor,
    accentColor,
    width:        260,
  });

  const body = `
    <h2 style="color:${primaryColor};font-size:21px;font-weight:700;margin:0 0 20px;
               padding-bottom:10px;border-bottom:2px solid #EEF0EC;
               font-family:'Cairo',Tahoma,Arial,sans-serif;">
      أهلاً وسهلاً، ${fullName}! 🌙
    </h2>

    <p style="margin:0 0 16px;color:#4B5563;font-size:15px;line-height:1.9;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      يسعدنا انضمامك إلى <strong style="color:#1F2937;">${tenantName}</strong> — منصتك الذكية لحفظ القرآن الكريم
      وتتبع تقدمك مع شيخك وحلقتك.
    </p>

    <p style="margin:0 0 12px;color:#4B5563;font-size:15px;font-family:'Cairo',Tahoma,Arial,sans-serif;">
      حسابك جاهز الآن ويمكنك البدء فوراً:
    </p>

    <ul class="feature-list" style="list-style:none;padding:0;margin:0 0 16px;">
      <li style="padding:9px 4px;border-bottom:1px solid #EEF0EC;font-size:14px;color:#4B5563;font-family:'Cairo',Tahoma,Arial,sans-serif;">📖&nbsp;&nbsp;تتبع حفظك وتسميعك يومياً</li>
      <li style="padding:9px 4px;border-bottom:1px solid #EEF0EC;font-size:14px;color:#4B5563;font-family:'Cairo',Tahoma,Arial,sans-serif;">🧑‍🏫&nbsp;&nbsp;التواصل مع شيخك ومتابعة تقييماتك</li>
      <li style="padding:9px 4px;border-bottom:1px solid #EEF0EC;font-size:14px;color:#4B5563;font-family:'Cairo',Tahoma,Arial,sans-serif;">📊&nbsp;&nbsp;تحليل ذكي لأخطائك وتقدمك</li>
      <li style="padding:9px 4px;border-bottom:1px solid #EEF0EC;font-size:14px;color:#4B5563;font-family:'Cairo',Tahoma,Arial,sans-serif;">🏆&nbsp;&nbsp;مشاركة في لوحات الشرف</li>
      <li style="padding:9px 4px;font-size:14px;color:#4B5563;font-family:'Cairo',Tahoma,Arial,sans-serif;">🤖&nbsp;&nbsp;مساعد ذكاء اصطناعي لدعم رحلة الحفظ</li>
    </ul>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
      <tr><td align="center" style="padding:28px 0 0;">${ctaButton}</td></tr>
    </table>

    <hr style="border:none;border-top:1px solid #EEF0EC;margin:28px 0 20px;"/>

    <p style="font-size:14px;color:#6B7280;text-align:center;margin:0;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      بارك الله فيك ووفقك لما يحبه ويرضاه 🤲
    </p>
  `;

  const text = `أهلاً وسهلاً، ${fullName}!\n\nمرحباً بك في منصة ${tenantName}.\n\nابدأ رحلتك عبر: ${loginUrl}\n\nبارك الله فيك.\nفريق ${tenantName}`;

  return { subject, html: baseEmailTemplate(body, data), text };
}
