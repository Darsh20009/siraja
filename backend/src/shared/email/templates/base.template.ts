export interface BaseTemplateData {
  tenantName?: string;
  logoUrl?: string;
  primaryColor?: string;
  year?: number;
}

/**
 * Branded HTML email shell.
 * Supports RTL languages (Arabic) by default.
 * Inject content via the `body` parameter.
 */
export function baseEmailTemplate(body: string, data: BaseTemplateData = {}): string {
  const {
    tenantName = 'Siraja',
    logoUrl = '',
    primaryColor = '#1A6B4A',
    year = new Date().getFullYear(),
  } = data;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${tenantName}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; }
    .wrapper { width: 100%; background-color: #f4f4f4; padding: 24px 0; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background-color: ${primaryColor}; padding: 24px 32px; text-align: center; }
    .header img { max-height: 50px; }
    .header h1 { color: #ffffff; margin: 8px 0 0; font-size: 22px; font-weight: 700; }
    .body { padding: 32px; color: #333333; line-height: 1.7; font-size: 15px; }
    .body h2 { color: ${primaryColor}; margin-top: 0; font-size: 20px; }
    .body p { margin: 0 0 16px; }
    .btn { display: inline-block; background-color: ${primaryColor}; color: #ffffff !important; text-decoration: none; padding: 13px 28px; border-radius: 6px; font-size: 15px; font-weight: 600; margin: 8px 0; }
    .code-box { background: #f0f8f4; border: 2px dashed ${primaryColor}; border-radius: 6px; padding: 16px 24px; text-align: center; font-size: 28px; letter-spacing: 6px; font-weight: 700; color: ${primaryColor}; margin: 24px 0; }
    .footer { background-color: #f9f9f9; border-top: 1px solid #e5e5e5; padding: 20px 32px; text-align: center; color: #888888; font-size: 12px; line-height: 1.6; }
    .footer a { color: #888888; }
    @media (max-width: 600px) {
      .body { padding: 24px 20px; }
      .header { padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        ${logoUrl ? `<img src="${logoUrl}" alt="${tenantName}" />` : ''}
        <h1>${tenantName}</h1>
      </div>
      <div class="body">
        ${body}
      </div>
      <div class="footer">
        <p>© ${year} ${tenantName} · منصة سراج لحفظ القرآن الكريم</p>
        <p>إذا كنت لا تريد استقبال هذه الرسائل، يمكنك <a href="#">إلغاء الاشتراك</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
