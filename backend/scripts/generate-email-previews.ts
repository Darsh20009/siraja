#!/usr/bin/env ts-node
/**
 * Siraja Email Preview Generator
 * ───────────────────────────────
 * Renders every email template with realistic sample data and writes
 * static HTML files to /email-previews/ at the repo root.
 *
 * Usage:
 *   npm run email:preview          (from /backend)
 *   npx ts-node scripts/generate-email-previews.ts
 *
 * Output:
 *   /email-previews/
 *     index.html                  — browsable catalogue of all templates
 *     welcome.html
 *     verification.html
 *     otp.html
 *     password-reset.html
 *     notification-info.html
 *     notification-success.html
 *     notification-warning.html
 *     system-alert-info.html
 *     system-alert-warning.html
 *     system-alert-critical.html
 *     invitation.html
 *     weekly-summary.html
 *     monthly-report.html
 *     security-alert-new-login.html
 *     security-alert-suspicious.html
 *     achievement.html
 *     gamification-reward.html
 *     tenant-branded.html         — all fields with custom tenant branding
 */

import * as fs   from 'fs';
import * as path from 'path';

// ─── Templates ───────────────────────────────────────────────────────────────
import { welcomeEmailTemplate }           from '../src/shared/email/templates/welcome.template';
import { verificationEmailTemplate }      from '../src/shared/email/templates/verification.template';
import { otpEmailTemplate }               from '../src/shared/email/templates/otp.template';
import { passwordResetEmailTemplate }     from '../src/shared/email/templates/password-reset.template';
import { notificationEmailTemplate }      from '../src/shared/email/templates/notification.template';
import { systemAlertEmailTemplate }       from '../src/shared/email/templates/system-alert.template';
import { invitationEmailTemplate }        from '../src/shared/email/templates/invitation.template';
import { weeklySummaryEmailTemplate }     from '../src/shared/email/templates/weekly-summary.template';
import { monthlyReportEmailTemplate }     from '../src/shared/email/templates/monthly-report.template';
import { securityAlertEmailTemplate }     from '../src/shared/email/templates/security-alert.template';
import { achievementEmailTemplate }       from '../src/shared/email/templates/achievement.template';
import { gamificationRewardEmailTemplate } from '../src/shared/email/templates/gamification-reward.template';

// ─── Shared sample brand data ─────────────────────────────────────────────────

const BASE = {
  tenantName:   'سِراجا',
  primaryColor: '#1A6B4A',
  accentColor:  '#C9A84C',
  supportEmail: 'support@siraja.website',
  websiteUrl:   'https://siraja.website',
};

const TENANT_BRAND = {
  tenantName:    'دار الحفاظ',
  tenantTagline: 'أكاديمية متخصصة في حفظ القرآن الكريم',
  primaryColor:  '#1B4F72',
  accentColor:   '#F39C12',
  supportEmail:  'support@daralhuffaz.com',
  websiteUrl:    'https://daralhuffaz.com',
  socialLinks: [
    { icon: '🐦', label: 'تويتر',      url: 'https://twitter.com/daralhuffaz' },
    { icon: '📸', label: 'إنستغرام',   url: 'https://instagram.com/daralhuffaz' },
    { icon: '💬', label: 'واتساب',     url: 'https://wa.me/966500000000' },
  ],
  footerText: 'مرخصة من وزارة التعليم — رقم الترخيص: ١٢٣٤٥',
};

// ─── Render map ───────────────────────────────────────────────────────────────

type Preview = { file: string; label: string; html: string };
const previews: Preview[] = [];

function add(file: string, label: string, result: { html: string }): void {
  previews.push({ file, label, html: result.html });
}

// Welcome
add('welcome', 'ترحيب',
  welcomeEmailTemplate({ ...BASE, fullName: 'أحمد محمد الشمري', loginUrl: 'https://siraja.website/login' }));

// Verification
add('verification', 'تحقق من البريد',
  verificationEmailTemplate({
    ...BASE,
    fullName:         'فاطمة عبدالله',
    verificationUrl:  'https://siraja.website/verify?token=abc123',
    verificationCode: 'A7B2C9',
    expiresInHours:   24,
  }));

// OTP
add('otp', 'رمز التحقق OTP',
  otpEmailTemplate({
    ...BASE,
    fullName:         'محمد العتيبي',
    otpCode:          '847 291',
    expiresInMinutes: 10,
    purpose:          'تسجيل الدخول',
  }));

// Password Reset
add('password-reset', 'إعادة تعيين كلمة المرور',
  passwordResetEmailTemplate({
    ...BASE,
    fullName:          'عبدالرحمن السالم',
    resetUrl:          'https://siraja.website/reset?token=xyz789',
    expiresInMinutes:  30,
    requestIp:         '102.43.21.11',
  }));

// Notification – info
add('notification-info', 'إشعار — معلومة',
  notificationEmailTemplate({
    ...BASE,
    recipientName: 'سارة الغامدي',
    title:         'تحديث جدول الحلقة',
    message:       'تم تحديث جدول حلقتك الأسبوعية. سيبدأ الجدول الجديد من الأحد القادم الساعة 8:00 صباحاً.',
    type:          'info',
    actionUrl:     'https://siraja.website/schedule',
    actionLabel:   'عرض الجدول الجديد',
  }));

// Notification – success
add('notification-success', 'إشعار — نجاح',
  notificationEmailTemplate({
    ...BASE,
    recipientName: 'سارة الغامدي',
    title:         'اكتملت عملية الدفع بنجاح',
    message:       'تم تجديد اشتراكك في المنصة بنجاح. يمكنك الاستمرار في رحلة الحفظ دون انقطاع.',
    type:          'success',
  }));

// Notification – warning
add('notification-warning', 'إشعار — تحذير',
  notificationEmailTemplate({
    ...BASE,
    recipientName: 'سارة الغامدي',
    title:         'تذكير: اشتراكك على وشك الانتهاء',
    message:       'ينتهي اشتراكك خلال 3 أيام. جدد الآن للاستمرار في الاستفادة من جميع ميزات المنصة.',
    type:          'warning',
    actionUrl:     'https://siraja.website/renew',
    actionLabel:   'تجديد الاشتراك',
  }));

// System Alert – info
add('system-alert-info', 'تنبيه نظام — معلومة',
  systemAlertEmailTemplate({
    ...BASE,
    severity:  'info',
    title:     'تحديث مجدول للمنصة',
    message:   'سيتم إجراء تحديث للنظام يوم الجمعة 2:00-4:00 صباحاً بتوقيت الرياض. قد تتعذر بعض العمليات خلال هذه الفترة.',
    details:   { 'نوع التحديث': 'قاعدة البيانات', 'المدة المتوقعة': '2 ساعة', 'التأثير': 'محدود' },
    timestamp: new Date().toISOString(),
  }));

// System Alert – warning
add('system-alert-warning', 'تنبيه نظام — تحذير',
  systemAlertEmailTemplate({
    ...BASE,
    severity:  'warning',
    title:     'ارتفاع غير معتاد في استخدام الذاكرة',
    message:   'رصدنا ارتفاعاً في استخدام الذاكرة وصل إلى 78%. يُرجى المراجعة.',
    details:   { 'الاستخدام الحالي': '78%', 'الحد الأقصى': '16 GB', 'الوقت': '14:32 UTC' },
    timestamp: new Date().toISOString(),
  }));

// System Alert – critical
add('system-alert-critical', 'تنبيه نظام — حرج',
  systemAlertEmailTemplate({
    ...BASE,
    severity:  'critical',
    title:     'فشل الاتصال بقاعدة البيانات',
    message:   'انقطع الاتصال بقاعدة بيانات MongoDB Atlas. الخدمة متوقفة جزئياً.',
    details:   { 'الخطأ': 'ECONNREFUSED', 'المضيف': 'cluster0.mongodb.net', 'المحاولات': 5 },
    timestamp: new Date().toISOString(),
  }));

// Invitation
add('invitation', 'دعوة',
  invitationEmailTemplate({
    ...BASE,
    inviteeName:     'نورة الزهراني',
    inviterName:     'الشيخ عبدالله القحطاني',
    role:            'طالبة',
    inviteUrl:       'https://siraja.website/invite?token=inv_abc',
    expiresInDays:   7,
    personalMessage: 'يسعدني دعوتك للانضمام إلى حلقتنا المتميزة في حفظ القرآن الكريم.',
    academyName:     'دار الحفاظ',
  }));

// Weekly Summary
add('weekly-summary', 'ملخص أسبوعي',
  weeklySummaryEmailTemplate({
    ...BASE,
    studentName:    'خالد العمري',
    weekLabel:      'الأسبوع 14-20 يوليو 2026',
    stats: {
      sessionsCompleted: 6,
      versesMemorized:   22,
      revisionScore:     88,
      attendanceRate:    92,
      streak:            12,
    },
    topAchievement: 'أكمل حفظ سورة الكهف كاملة خلال هذا الأسبوع',
    nextGoal:       'البدء في حفظ سورة مريم مع مراجعة يومية',
    dashboardUrl:   'https://siraja.website/dashboard',
  }));

// Monthly Report
add('monthly-report', 'تقرير شهري',
  monthlyReportEmailTemplate({
    ...BASE,
    studentName: 'ريم السلمي',
    monthLabel:  'يونيو 2026',
    summary: {
      totalSessions:   24,
      totalVerses:     89,
      completedJuz:    2,
      averageScore:    91,
      perfectSessions: 8,
      longestStreak:   18,
    },
    highlights: [
      'أكملت حفظ الجزء الثالث والرابع من القرآن الكريم',
      'حضور مثالي 100% خلال الأسبوعين الأخيرين',
      'حصلت على المركز الأول في لوحة الشرف الشهرية',
      'سجلت أعلى درجة مراجعة في تاريخ الحلقة: 98%',
    ],
    reportUrl: 'https://siraja.website/reports/june-2026',
  }));

// Security Alert – new login
add('security-alert-new-login', 'تنبيه أمني — دخول جديد',
  securityAlertEmailTemplate({
    ...BASE,
    fullName:  'عمر الحربي',
    alertType: 'new-login',
    details: {
      device:   'iPhone 15 Pro — iOS 17',
      location: 'الرياض، المملكة العربية السعودية',
      ip:       '105.163.0.42',
      time:     new Date().toLocaleString('ar-SA'),
    },
    actionUrl: 'https://siraja.website/security',
  }));

// Security Alert – suspicious
add('security-alert-suspicious', 'تنبيه أمني — نشاط مشبوه',
  securityAlertEmailTemplate({
    ...BASE,
    fullName:    'عمر الحربي',
    alertType:   'suspicious-activity',
    details: {
      device:   'جهاز غير معروف',
      location: 'Dubai, UAE',
      ip:       '185.220.101.7',
      time:     new Date().toLocaleString('ar-SA'),
    },
    actionUrl:   'https://siraja.website/security/lock',
    actionLabel: 'تأمين الحساب فوراً',
  }));

// Achievement
add('achievement', 'إنجاز',
  achievementEmailTemplate({
    ...BASE,
    studentName:            'يوسف الرشيدي',
    achievementTitle:       'حافظ الجزء العاشر',
    achievementDescription: 'أتممت حفظ الجزء العاشر من القرآن الكريم كاملاً مع ضبط التجويد بإتقان تام.',
    achievementType:        'memorization',
    points:                 500,
    level:                  'المستوى الذهبي',
    dashboardUrl:           'https://siraja.website/achievements',
    shareUrl:               'https://siraja.website/share/achievement/123',
  }));

// Gamification Reward
add('gamification-reward', 'مكافأة',
  gamificationRewardEmailTemplate({
    ...BASE,
    studentName:       'منى الجهني',
    rewardTitle:       'بطل الأسبوع',
    rewardDescription: 'حصلت على المركز الأول في لوحة الشرف هذا الأسبوع بفضل مثابرتك وتفوقك المستمر.',
    rewardType:        'weekly-top',
    pointsEarned:      250,
    totalPoints:       3840,
    badgeLevel:        'gold',
    rank:              1,
    dashboardUrl:      'https://siraja.website/leaderboard',
  }));

// Tenant-branded (all overrides)
add('tenant-branded', 'تصميم مخصص للمستأجر',
  welcomeEmailTemplate({
    ...TENANT_BRAND,
    fullName: 'أحمد ناصر',
    loginUrl: 'https://daralhuffaz.com/login',
  }));

// ─── Write output files ───────────────────────────────────────────────────────

const outDir = path.join(__dirname, '../../email-previews');
fs.mkdirSync(outDir, { recursive: true });

for (const p of previews) {
  fs.writeFileSync(path.join(outDir, `${p.file}.html`), p.html, 'utf8');
  console.log(`  ✅  ${p.file}.html`);
}

// ─── Generate index.html ──────────────────────────────────────────────────────

const primaryColor = '#1A6B4A';
const accentColor  = '#C9A84C';

const cards = previews.map(p => `
  <a href="${p.file}.html" class="card" target="_blank">
    <div class="card-icon">✉️</div>
    <div class="card-label">${p.label}</div>
    <div class="card-file">${p.file}.html</div>
  </a>`).join('');

const indexHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Siraja Email Preview Catalogue</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet"/>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0; padding: 0;
      background: #F8F7F3;
      font-family: 'Cairo', Tahoma, Arial, sans-serif;
      direction: rtl;
      color: #1F2937;
    }
    .header {
      background: linear-gradient(160deg, #0d4a32 0%, ${primaryColor} 55%, #22896a 100%);
      padding: 48px 32px;
      text-align: center;
      color: #fff;
    }
    .header h1 { margin: 0 0 8px; font-size: 36px; font-weight: 900; letter-spacing: -0.5px; }
    .header p  { margin: 0; color: ${accentColor}; font-size: 15px; font-weight: 500; }
    .badge {
      display: inline-block;
      background: ${accentColor}22; color: ${accentColor};
      border: 1.5px solid ${accentColor}55; border-radius: 99px;
      font-size: 12px; font-weight: 700; padding: 3px 14px; margin-top: 14px;
    }
    .container { max-width: 960px; margin: 0 auto; padding: 40px 24px; }
    .meta {
      background: #fff; border: 1px solid #EEF0EC; border-radius: 12px;
      padding: 18px 24px; margin: 0 0 32px;
      display: flex; align-items: center; gap: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    }
    .meta-dot { width: 10px; height: 10px; border-radius: 50%; background: ${primaryColor}; flex-shrink: 0; }
    .meta p { margin: 0; font-size: 13.5px; color: #4B5563; line-height: 1.6; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
    }
    .card {
      display: flex; flex-direction: column; align-items: center;
      background: #fff; border: 1px solid #EEF0EC; border-radius: 16px;
      padding: 28px 16px 22px;
      text-decoration: none; color: inherit;
      transition: all 0.18s ease;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    }
    .card:hover {
      border-color: ${primaryColor}55;
      box-shadow: 0 8px 24px rgba(26,107,74,0.14);
      transform: translateY(-2px);
    }
    .card-icon  { font-size: 32px; margin: 0 0 10px; }
    .card-label { font-size: 14px; font-weight: 700; color: #1F2937; margin: 0 0 6px; text-align: center; }
    .card-file  { font-size: 11px; color: #9CA3AF; font-family: monospace; }
    .footer {
      text-align: center; padding: 32px; font-size: 12px; color: #9CA3AF;
      border-top: 1px solid #EEF0EC; margin-top: 48px;
    }
    @media (prefers-color-scheme: dark) {
      body { background: #0a1a11; color: #D1FAE5; }
      .meta, .card { background: #0f1e16; border-color: #1a3828; }
      .card-label  { color: #D1FAE5; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📧 Siraja Email Previews</h1>
    <p>كتالوج تصاميم البريد الإلكتروني — Premium Edition</p>
    <div class="badge">${previews.length} قالب</div>
  </div>
  <div class="container">
    <div class="meta">
      <div class="meta-dot"></div>
      <p>
        جميع القوالب مُصمَّمة لأعلى معايير التوافق مع Outlook · Gmail · Apple Mail · Yahoo · Samsung Mail.
        يمكنك فتح أي قالب في متصفحك لمعاينته — وللاختبار الكامل استخدم أداة مثل Litmus أو Email on Acid.
        لإعادة توليد جميع الملفات: <strong>npm run email:preview</strong>
      </p>
    </div>
    <div class="grid">${cards}</div>
  </div>
  <div class="footer">
    Siraja Platform · Generated ${new Date().toLocaleDateString('ar-SA')} ·
    <a href="https://siraja.website" style="color:${primaryColor};">siraja.website</a>
  </div>
</body>
</html>`;

fs.writeFileSync(path.join(outDir, 'index.html'), indexHtml, 'utf8');

console.log(`\n✨ Generated ${previews.length} email previews + index.html`);
console.log(`📁 Output: ${outDir}`);
console.log(`🌐 Open: email-previews/index.html\n`);
