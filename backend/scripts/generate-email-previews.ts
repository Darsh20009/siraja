/**
 * generate-email-previews.ts
 * ──────────────────────────
 * Renders all Siraja email templates to static HTML files under email-previews/.
 *
 * Run via:
 *   npm run email:preview          (from backend/)
 *
 * Or manually:
 *   cd backend && npx ts-node -P tsconfig.json --require tsconfig-paths/register scripts/generate-email-previews.ts
 *
 * Output (email-previews/):
 *   index.html                       Gallery navigation
 *   welcome.html                     Welcome email
 *   verification.html                Email verification (link only)
 *   verification-with-otp.html       Email verification (link + OTP code)
 *   otp.html                         Standalone OTP verification
 *   password-reset.html              Password reset
 *   notification-info.html           Notification — info
 *   notification-success.html        Notification — success
 *   notification-warning.html        Notification — warning
 *   system-alert-info.html           System alert — info
 *   system-alert-warning.html        System alert — warning
 *   system-alert-critical.html       System alert — critical
 *   invitation.html                  Invitation to join
 *   weekly-summary.html              Weekly progress summary
 *   monthly-report.html              Monthly report
 *   security-alert-login.html        Security alert — new login
 *   security-alert-suspicious.html   Security alert — suspicious activity
 *   achievement-juz.html             Achievement — juz memorized
 *   achievement-streak.html          Achievement — streak milestone
 *   gamification-badge.html          Gamification — badge earned
 *   gamification-leaderboard.html    Gamification — leaderboard rank
 *   tenant-branded.html              Welcome with custom tenant palette
 */

import * as fs   from 'fs';
import * as path from 'path';

import { welcomeEmailTemplate }           from '@shared/email/templates/welcome.template';
import { verificationEmailTemplate }      from '@shared/email/templates/verification.template';
import { otpEmailTemplate }               from '@shared/email/templates/otp.template';
import { passwordResetEmailTemplate }     from '@shared/email/templates/password-reset.template';
import { notificationEmailTemplate }      from '@shared/email/templates/notification.template';
import { systemAlertEmailTemplate }       from '@shared/email/templates/system-alert.template';
import { invitationEmailTemplate }        from '@shared/email/templates/invitation.template';
import { weeklySummaryEmailTemplate }     from '@shared/email/templates/weekly-summary.template';
import { monthlyReportEmailTemplate }     from '@shared/email/templates/monthly-report.template';
import { securityAlertEmailTemplate }     from '@shared/email/templates/security-alert.template';
import { achievementEmailTemplate }       from '@shared/email/templates/achievement.template';
import { gamificationRewardEmailTemplate }from '@shared/email/templates/gamification-reward.template';
import { SIRAJA_BRAND_DEFAULTS }          from '@shared/email/brand/brand-config';

// ─── Output directory ─────────────────────────────────────────────────────────

const OUT_DIR = path.resolve(__dirname, '../../email-previews');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

function write(filename: string, html: string): void {
  fs.writeFileSync(path.join(OUT_DIR, filename), html, 'utf-8');
  console.log(`  ✓  ${filename}`);
}

// ─── Brand datasets ───────────────────────────────────────────────────────────

const BRAND = { ...SIRAJA_BRAND_DEFAULTS };

// Example tenant with custom palette (royal-blue Quran academy)
const TENANT_BRAND = {
  tenantName:    'دار الحفاظ',
  tenantTagline: 'حلقات القرآن الكريم',
  primaryColor:  '#1B4F8A',
  accentColor:   '#D4A84B',
  supportEmail:  'info@daralhuffaz.com',
  websiteUrl:    'https://daralhuffaz.com',
  socialLinks: [
    { label: 'الموقع',   url: 'https://daralhuffaz.com' },
    { label: 'تويتر',   url: 'https://twitter.com/daralhuffaz' },
  ],
  footerText: 'أكاديمية دار الحفاظ للقرآن الكريم — المملكة العربية السعودية',
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
  preheader: 'لديك جلسة مراجعة مجدولة — الإثنين 4:00 مساءً',
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
  preheader: 'مبروك! أكملتِ حفظ الجزء الثلاثين بتقييم ممتاز',
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
  preheader: 'تحذير: تسجيل دخول من جهاز غير معروف',
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

// 12 — Invitation
write('invitation.html', invitationEmailTemplate({
  ...BRAND,
  inviteeName:     'نورة سالم',
  inviterName:     'الشيخ عبد الله الحامد',
  role:            'طالبة',
  inviteUrl:       'https://siraja.website/invite?token=inv_abc123',
  expiresInDays:   7,
  personalMessage: 'يسعدني دعوتك للانضمام إلى حلقتنا — أتمنى لك رحلة موفقة في حفظ كتاب الله.',
  academyName:     'حلقة الفجر الصباحية',
  preheader: 'لديك دعوة للانضمام إلى حلقة القرآن الكريم',
}).html);

// 13 — Weekly Summary
write('weekly-summary.html', weeklySummaryEmailTemplate({
  ...BRAND,
  studentName: 'أحمد محمد',
  weekLabel:   '١٤ – ٢٠ يناير ٢٠٢٦',
  stats: {
    sessionsCompleted: 5,
    versesMemorized:   42,
    revisionScore:     87,
    attendanceRate:    100,
    streak:            12,
  },
  topAchievement: 'أتممت حفظ سورة الملك كاملةً بلا أخطاء في جلسة واحدة! 🎉',
  nextGoal:       'إتمام مراجعة الجزء التاسع والعشرين بنسبة 90%+',
  dashboardUrl:   'https://siraja.website/dashboard',
  preheader: 'ملخص أسبوعك: 42 آية محفوظة، 12 يومًا متواصلة 🔥',
}).html);

// 14 — Monthly Report
write('monthly-report.html', monthlyReportEmailTemplate({
  ...BRAND,
  studentName: 'فاطمة علي',
  monthLabel:  'يناير ٢٠٢٦',
  summary: {
    totalSessions:   22,
    totalVerses:     186,
    completedJuz:    1,
    averageScore:    91,
    perfectSessions: 8,
    longestStreak:   18,
  },
  highlights: [
    'إتمام حفظ الجزء الثلاثين بالكامل',
    '8 جلسات مثالية بدون أي أخطاء',
    'أطول سلسلة متواصلة: 18 يوماً',
    'تصدّر لوحة الشرف الأسبوعية مرتين',
  ],
  reportUrl:   'https://siraja.website/reports/jan-2026',
  preheader: 'تقريرك الشهري جاهز — يناير كان شهراً رائعاً! 🌟',
}).html);

// 15 — Security Alert: New Login
write('security-alert-login.html', securityAlertEmailTemplate({
  ...BRAND,
  fullName:  'خالد إبراهيم',
  alertType: 'login',
  details: {
    device:   'Safari / iPhone 15 Pro',
    location: 'الرياض، المملكة العربية السعودية',
    ip:       '102.134.81.55',
    time:     new Date().toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' }),
  },
  preheader: 'تسجيل دخول جديد إلى حسابك من iPhone في الرياض',
}).html);

// 16 — Security Alert: Suspicious Activity
write('security-alert-suspicious.html', securityAlertEmailTemplate({
  ...BRAND,
  fullName:  'عمر حسن',
  alertType: 'suspicious_activity',
  details: {
    device:   'Chrome / Linux',
    location: 'لندن، المملكة المتحدة',
    ip:       '185.220.101.42',
    time:     new Date().toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' }),
  },
  actionUrl:   'https://siraja.website/account/security',
  actionLabel: '🔒 تأمين الحساب فوراً',
  preheader: '[تحذير] نشاط مريب رُصد على حسابك — يُرجى المراجعة',
}).html);

// 17 — Achievement: Juz Memorized
write('achievement-juz.html', achievementEmailTemplate({
  ...BRAND,
  studentName:            'أحمد محمد',
  achievementTitle:       'إتمام حفظ الجزء الثلاثين 📖',
  achievementDescription: 'لقد أتممت حفظ الجزء الثلاثين كاملاً بتقييم ممتاز. هذا إنجاز عظيم في مسيرتك مع كتاب الله.',
  achievementType:        'juz',
  points:                 500,
  level:                  'حافظ متقدم',
  dashboardUrl:           'https://siraja.website/dashboard',
  shareUrl:               'https://siraja.website/share/achievement/juz-30',
  preheader: 'تهانينا! أكملت حفظ الجزء الثلاثين بتقييم ممتاز 🎉',
}).html);

// 18 — Achievement: Streak
write('achievement-streak.html', achievementEmailTemplate({
  ...BRAND,
  studentName:            'فاطمة علي',
  achievementTitle:       'سلسلة 30 يوماً متواصلاً 🔥',
  achievementDescription: 'واصلت التعلم 30 يوماً متتالياً دون انقطاع. هذا الثبات هو مفتاح الإتقان.',
  achievementType:        'streak',
  points:                 200,
  dashboardUrl:           'https://siraja.website/dashboard',
  preheader: '🔥 30 يوماً متواصلاً — عزيمتك لا تُقهر!',
}).html);

// 19 — Gamification: Badge
write('gamification-badge.html', gamificationRewardEmailTemplate({
  ...BRAND,
  studentName:       'خالد إبراهيم',
  rewardTitle:       'شارة الحافظ الذهبية',
  rewardDescription: 'حصلت على الشارة الذهبية تقديراً لتميزك المستمر في حفظ القرآن الكريم.',
  rewardType:        'badge',
  badgeLevel:        'gold',
  pointsEarned:      300,
  totalPoints:       2450,
  dashboardUrl:      'https://siraja.website/dashboard',
  preheader: '🥇 مبروك! حصلت على الشارة الذهبية',
}).html);

// 20 — Gamification: Leaderboard
write('gamification-leaderboard.html', gamificationRewardEmailTemplate({
  ...BRAND,
  studentName:       'نورة سالم',
  rewardTitle:       'المرتبة الأولى هذا الأسبوع! 🏆',
  rewardDescription: 'تصدّرتِ لوحة الشرف الأسبوعية بجدارة. استمري في هذا الأداء الرائع!',
  rewardType:        'leaderboard',
  rank:              1,
  pointsEarned:      150,
  totalPoints:       3200,
  dashboardUrl:      'https://siraja.website/dashboard',
  preheader: '🏆 أنتِ رقم 1 في لوحة الشرف هذا الأسبوع!',
}).html);

// 21 — Tenant-branded Welcome
write('tenant-branded.html', welcomeEmailTemplate({
  ...TENANT_BRAND,
  fullName: 'نورة سالم',
  loginUrl: 'https://daralhuffaz.com/auth/login',
  preheader: 'مرحباً بك في دار الحفاظ — حسابك جاهز',
}).html);

// ─── Index gallery ────────────────────────────────────────────────────────────

const PREVIEWS = [
  // Auth
  { file: 'welcome.html',                label: 'ترحيب',                   cat: 'auth' },
  { file: 'verification.html',           label: 'تأكيد البريد',            cat: 'auth' },
  { file: 'verification-with-otp.html',  label: 'تأكيد البريد + رمز',      cat: 'auth' },
  { file: 'otp.html',                    label: 'رمز التحقق (OTP)',         cat: 'auth' },
  { file: 'password-reset.html',         label: 'إعادة تعيين كلمة المرور', cat: 'auth' },
  { file: 'invitation.html',             label: 'دعوة للانضمام',            cat: 'auth' },
  // Notifications
  { file: 'notification-info.html',      label: 'إشعار — معلومات',         cat: 'notification' },
  { file: 'notification-success.html',   label: 'إشعار — نجاح',            cat: 'notification' },
  { file: 'notification-warning.html',   label: 'إشعار — تحذير',           cat: 'notification' },
  // Security
  { file: 'security-alert-login.html',   label: 'تنبيه — دخول جديد',       cat: 'security' },
  { file: 'security-alert-suspicious.html', label: 'تنبيه — نشاط مريب',   cat: 'security' },
  // Progress
  { file: 'weekly-summary.html',         label: 'ملخص أسبوعي',             cat: 'progress' },
  { file: 'monthly-report.html',         label: 'تقرير شهري',              cat: 'progress' },
  // Achievements
  { file: 'achievement-juz.html',        label: 'إنجاز — حفظ جزء',         cat: 'achievement' },
  { file: 'achievement-streak.html',     label: 'إنجاز — سلسلة متواصلة',   cat: 'achievement' },
  { file: 'gamification-badge.html',     label: 'مكافأة — شارة ذهبية',     cat: 'achievement' },
  { file: 'gamification-leaderboard.html', label: 'مكافأة — لوحة الشرف',   cat: 'achievement' },
  // System
  { file: 'system-alert-info.html',      label: 'تنبيه نظام — معلومات',    cat: 'system' },
  { file: 'system-alert-warning.html',   label: 'تنبيه نظام — تحذير',      cat: 'system' },
  { file: 'system-alert-critical.html',  label: 'تنبيه نظام — حرج',        cat: 'system' },
  // Tenant
  { file: 'tenant-branded.html',         label: 'مستأجر مخصص (دار الحفاظ)', cat: 'tenant' },
];

const CAT_LABELS: Record<string, string> = {
  auth:         '🔐 المصادقة والوصول',
  notification: '📢 الإشعارات',
  security:     '🛡️ التنبيهات الأمنية',
  progress:     '📊 تقارير التقدم',
  achievement:  '🏆 الإنجازات والمكافآت',
  system:       '🚨 تنبيهات النظام',
  tenant:       '🏫 العلامة التجارية المخصصة',
};

const cats    = ['auth', 'notification', 'security', 'progress', 'achievement', 'system', 'tenant'];
const COUNT   = PREVIEWS.length;
const NOW_STR = new Date().toLocaleDateString('ar-SA');

const sections = cats.map(cat => {
  const items = PREVIEWS.filter(p => p.cat === cat);
  const cards = items.map(p => `
    <a href="${p.file}" target="${p.file.replace('.html', '')}"
       style="text-decoration:none;display:block;background:#fff;border:1px solid #DDE6E0;
              border-radius:10px;overflow:hidden;transition:box-shadow 0.15s,transform 0.15s;
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

const indexHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Siraja — Email Preview Gallery</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet"/>
<style>
  body { margin:0;padding:32px 24px 64px;background:#F8F7F3;font-family:'Cairo',Arial,sans-serif;direction:rtl; }
  .hdr { background:linear-gradient(135deg,#0d4a32,#1A6B4A);color:#fff;padding:28px 32px;border-radius:14px;margin-bottom:32px;box-shadow:0 4px 24px rgba(26,107,74,0.16); }
  .hdr h1 { margin:0 0 6px;font-size:26px;letter-spacing:0.5px; }
  .hdr p  { margin:0;font-size:12.5px;color:rgba(201,168,76,0.92); }
  .badge  { display:inline-block;background:rgba(201,168,76,0.22);color:#C9A84C;font-size:11px;padding:3px 12px;border-radius:20px;margin-left:10px;font-weight:600; }
  a:hover { transform:translateY(-2px);box-shadow:0 6px 20px rgba(26,107,74,0.15)!important; }
  .cmd    { background:#1F2937;color:#D1FAE5;font-family:monospace;font-size:12px;padding:10px 16px;border-radius:8px;margin:0 0 28px;display:block;direction:ltr;text-align:left; }
</style>
</head>
<body>
<div class="hdr">
  <h1>📧 معرض قوالب البريد — سراج</h1>
  <p>
    <span class="badge">${COUNT} قالب</span>
    Siraja Email Design System · Generated ${NOW_STR}
  </p>
</div>
<code class="cmd">cd backend &amp;&amp; npm run email:preview</code>
${sections}
</body>
</html>`;

write('index.html', indexHtml);

console.log(`\n✅  Done — ${COUNT + 1} files written to email-previews/\n`);
console.log(`   Open email-previews/index.html in your browser to explore.\n`);
