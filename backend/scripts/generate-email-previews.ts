/**
 * generate-email-previews.ts
 * ──────────────────────────
 * Renders all Siraja email templates to static HTML files under email-previews/.
 * Run from the repo root:
 *
 *   cd backend && npx ts-node -P tsconfig.json --require tsconfig-paths/register scripts/generate-email-previews.ts
 *
 * Output (email-previews/):
 *   index.html                     Gallery navigation
 *   welcome.html                   Welcome email
 *   verification.html              Email verification (link only)
 *   verification-with-otp.html     Email verification (link + OTP code)
 *   otp.html                       Standalone OTP verification
 *   password-reset.html            Password reset
 *   notification-info.html         Notification — info
 *   notification-success.html      Notification — success
 *   notification-warning.html      Notification — warning
 *   system-alert-info.html         System alert — info
 *   system-alert-warning.html      System alert — warning
 *   system-alert-critical.html     System alert — critical
 *   tenant-branded.html            Welcome with custom tenant palette
 */

import * as fs   from 'fs';
import * as path from 'path';

import { welcomeEmailTemplate }       from '@shared/email/templates/welcome.template';
import { verificationEmailTemplate }  from '@shared/email/templates/verification.template';
import { otpEmailTemplate }           from '@shared/email/templates/otp.template';
import { passwordResetEmailTemplate } from '@shared/email/templates/password-reset.template';
import { notificationEmailTemplate }  from '@shared/email/templates/notification.template';
import { systemAlertEmailTemplate }   from '@shared/email/templates/system-alert.template';
import { SIRAJA_BRAND_DEFAULTS }      from '@shared/email/brand/brand-config';

// ─── Output directory ─────────────────────────────────────────────────────────

const OUT_DIR = path.resolve(__dirname, '../../email-previews');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

function write(filename: string, html: string): void {
  fs.writeFileSync(path.join(OUT_DIR, filename), html, 'utf-8');
  console.log(`  ✓  ${filename}`);
}

// ─── Brand datasets ───────────────────────────────────────────────────────────

const BRAND = { ...SIRAJA_BRAND_DEFAULTS };

// Example tenant with custom palette (royal blue Quran academy)
const TENANT_BRAND = {
  tenantName:    'دار الحفاظ',
  tenantTagline: 'حلقات القرآن الكريم',
  primaryColor:  '#1B4F8A',
  accentColor:   '#D4A84B',
  supportEmail:  'info@daralhuffaz.com',
  websiteUrl:    'https://daralhuffaz.com',
};

// ─── Render previews ──────────────────────────────────────────────────────────

console.log('\n📧  Generating Siraja email previews …\n');

// 1 — Welcome
write('welcome.html', welcomeEmailTemplate({
  ...BRAND,
  fullName: 'أحمد محمد',
  loginUrl: 'https://siraja.website/auth/login',
  preheader: 'حسابك في منصة سراج جاهز — ابدأ رحلة الحفظ اليوم',
}).html);

// 2 — Email Verification (link only)
write('verification.html', verificationEmailTemplate({
  ...BRAND,
  fullName: 'أحمد محمد',
  verificationUrl: 'https://siraja.website/auth/verify-email?token=abc123xyz',
  expiresInHours: 24,
  preheader: 'تأكيد بريدك الإلكتروني — خطوة واحدة تفصلك عن بدء رحلتك',
}).html);

// 3 — Email Verification (link + OTP)
write('verification-with-otp.html', verificationEmailTemplate({
  ...BRAND,
  fullName: 'فاطمة علي',
  verificationUrl: 'https://siraja.website/auth/verify-email?token=def456uvw',
  verificationCode: '842917',
  expiresInHours: 24,
  preheader: 'رمز التحقق: 842917 — صالح لمدة 24 ساعة',
}).html);

// 4 — OTP (standalone)
write('otp.html', otpEmailTemplate({
  ...BRAND,
  fullName: 'خالد إبراهيم',
  otpCode: '391746',
  expiresInMinutes: 10,
  purpose: 'تسجيل الدخول',
  preheader: 'رمز التحقق: 391746 — صالح لمدة 10 دقائق',
}).html);

// 5 — Password Reset
write('password-reset.html', passwordResetEmailTemplate({
  ...BRAND,
  fullName: 'خالد إبراهيم',
  resetUrl: 'https://siraja.website/auth/reset-password?token=rst789ghi',
  expiresInMinutes: 60,
  requestIp: '102.134.81.55',
  preheader: 'طلب إعادة تعيين كلمة المرور — صالح لمدة 60 دقيقة',
}).html);

// 6 — Notification: Info
write('notification-info.html', notificationEmailTemplate({
  ...BRAND,
  recipientName: 'أحمد محمد',
  type: 'info',
  title: 'جلسة مراجعة جديدة',
  message: `تمت جدولة جلسة مراجعة جديدة مع الشيخ عبد الله الحامد.<br/><br/>
    <strong>الموعد:</strong> الإثنين 22 يناير 2026 — 4:00 مساءً<br/>
    <strong>الحلقة:</strong> حلقة الفجر الصباحية`,
  actionUrl:   'https://siraja.website/dashboard/sessions',
  actionLabel: 'عرض الجلسة',
}).html);

// 7 — Notification: Success
write('notification-success.html', notificationEmailTemplate({
  ...BRAND,
  recipientName: 'فاطمة علي',
  type: 'success',
  title: 'تم تسليم حفظ الجزء الثلاثين! 🏆',
  message: `أحسنتِ! لقد أتممتِ حفظ الجزء الثلاثين بنجاح وحصلتِ على شهادة الإتمام.<br/><br/>
    <strong>التقييم:</strong> ممتاز ✨<br/>
    <strong>عدد الأخطاء:</strong> 2 أخطاء فقط`,
  actionUrl:   'https://siraja.website/dashboard/certificates',
  actionLabel: 'عرض الشهادة',
}).html);

// 8 — Notification: Warning
write('notification-warning.html', notificationEmailTemplate({
  ...BRAND,
  recipientName: 'عمر حسن',
  type: 'warning',
  title: 'تسجيل دخول غير مألوف',
  message: `لاحظنا تسجيل دخول إلى حسابك من موقع أو جهاز غير مألوف:<br/><br/>
    <strong>عنوان IP:</strong> 185.220.101.42<br/>
    <strong>الجهاز:</strong> Chrome / Linux<br/><br/>
    إذا لم تكن أنت، <strong>غيّر كلمة مرورك فوراً</strong> وراجع الأجهزة المرتبطة بحسابك.`,
}).html);

// 9 — System Alert: Info
write('system-alert-info.html', systemAlertEmailTemplate({
  ...BRAND,
  severity: 'info',
  title: 'اكتمال عملية النسخ الاحتياطي',
  message: 'تمت عملية النسخ الاحتياطي اليومية للبيانات بنجاح.',
  details: {
    'حجم النسخة': '2.4 GB',
    'المدة':      '4m 12s',
    'البيئة':     'production',
    'الموقع':     'Cloudflare R2 — eu-west',
  },
  timestamp: new Date().toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' }),
}).html);

// 10 — System Alert: Warning
write('system-alert-warning.html', systemAlertEmailTemplate({
  ...BRAND,
  severity: 'warning',
  title: 'معدل استخدام API مرتفع',
  message: 'تجاوز معدل طلبات Moonshot AI 85% من الحصة الشهرية.',
  details: {
    'الطلبات المستخدمة': '8,500',
    'الحصة الكاملة':     '10,000',
    'نسبة الاستهلاك':    '85%',
    'إعادة التعيين':     '1 فبراير 2026',
  },
  timestamp: new Date().toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' }),
}).html);

// 11 — System Alert: Critical
write('system-alert-critical.html', systemAlertEmailTemplate({
  ...BRAND,
  severity: 'critical',
  title: 'فشل الاتصال بقاعدة البيانات',
  message: 'فشل الاتصال بـ MongoDB Atlas بعد 3 محاولات متتالية. قد تكون الخدمة متأثرة.',
  details: {
    'رمز الخطأ':   'ECONNREFUSED',
    'المضيف':      'cluster0.siraja.mongodb.net',
    'المحاولات':   '3 / 3',
    'آخر نجاح':    'منذ 5 دقائق',
  },
  timestamp: new Date().toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' }),
}).html);

// 12 — Tenant-branded
write('tenant-branded.html', welcomeEmailTemplate({
  ...TENANT_BRAND,
  fullName: 'نورة سالم',
  loginUrl: 'https://daralhuffaz.com/auth/login',
  preheader: 'مرحباً بك في دار الحفاظ — حسابك جاهز',
}).html);

// ─── Index gallery ─────────────────────────────────────────────────────────────

const PREVIEWS = [
  { file: 'welcome.html',               label: 'ترحيب',                   cat: 'auth' },
  { file: 'verification.html',          label: 'تأكيد البريد',            cat: 'auth' },
  { file: 'verification-with-otp.html', label: 'تأكيد البريد + OTP',      cat: 'auth' },
  { file: 'otp.html',                   label: 'رمز التحقق OTP',           cat: 'auth' },
  { file: 'password-reset.html',        label: 'إعادة تعيين كلمة المرور', cat: 'auth' },
  { file: 'notification-info.html',     label: 'إشعار — معلومات',         cat: 'notification' },
  { file: 'notification-success.html',  label: 'إشعار — نجاح',            cat: 'notification' },
  { file: 'notification-warning.html',  label: 'إشعار — تحذير',           cat: 'notification' },
  { file: 'system-alert-info.html',     label: 'تنبيه نظام — معلومات',    cat: 'system' },
  { file: 'system-alert-warning.html',  label: 'تنبيه نظام — تحذير',      cat: 'system' },
  { file: 'system-alert-critical.html', label: 'تنبيه نظام — حرج',        cat: 'system' },
  { file: 'tenant-branded.html',        label: 'مستأجر مخصص (دار الحفاظ)', cat: 'tenant' },
];

const CAT_LABELS: Record<string, string> = {
  auth:         '🔐 المصادقة',
  notification: '📢 الإشعارات',
  system:       '🚨 تنبيهات النظام',
  tenant:       '🏫 المستأجر المخصص',
};

const cats = ['auth', 'notification', 'system', 'tenant'];

const sections = cats.map(cat => {
  const items = PREVIEWS.filter(p => p.cat === cat);
  const cards = items.map(p => `
    <a href="${p.file}" target="${p.file.replace('.html', '')}"
       style="text-decoration:none;display:block;background:#fff;border:1px solid #DDE6E0;
              border-radius:10px;overflow:hidden;transition:box-shadow 0.15s;
              box-shadow:0 2px 8px rgba(26,107,74,0.07);">
      <div style="background:linear-gradient(135deg,#0d4a32,#1A6B4A);height:4px;"></div>
      <div style="padding:14px 16px;font-family:'Cairo',Arial,sans-serif;font-size:13.5px;
                  color:#1A6B4A;font-weight:600;direction:rtl;">${p.label}</div>
      <div style="padding:0 12px 12px;font-size:11px;color:#9CA3AF;direction:ltr;">${p.file}</div>
    </a>`).join('');
  return `
    <div style="margin-bottom:32px;">
      <h2 style="font-size:15px;color:#1A6B4A;margin:0 0 14px;
                 font-family:'Cairo',Arial,sans-serif;font-weight:700;">${CAT_LABELS[cat]}</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;">
        ${cards}
      </div>
    </div>`;
}).join('');

const COUNT   = PREVIEWS.length;
const NOW_STR = new Date().toLocaleDateString('ar-SA');

const indexHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Siraja — Email Preview Gallery</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet"/>
<style>
  body { margin:0;padding:32px 24px 64px;background:#F8F7F3;font-family:'Cairo',Arial,sans-serif;direction:rtl; }
  .hdr { background:linear-gradient(135deg,#0d4a32,#1A6B4A);color:#fff;padding:28px 32px;border-radius:12px;margin-bottom:32px; }
  .hdr h1 { margin:0 0 6px;font-size:24px;letter-spacing:0.5px; }
  .hdr p  { margin:0;font-size:12px;color:rgba(201,168,76,0.9); }
  .badge { display:inline-block;background:rgba(201,168,76,0.25);color:#C9A84C;font-size:11px;padding:3px 10px;border-radius:20px;margin-right:10px; }
</style>
</head>
<body>
<div class="hdr">
  <h1>📧 معرض قوالب بريد سراج</h1>
  <p>
    <span class="badge">${COUNT} قوالب</span>
    Siraja Email Template Preview Gallery · Generated ${NOW_STR}
  </p>
</div>
${sections}
</body>
</html>`;

write('index.html', indexHtml);

console.log(`\n✅  Done — ${COUNT + 1} files written to email-previews/\n`);
console.log(`   Open email-previews/index.html in your browser to explore.\n`);
