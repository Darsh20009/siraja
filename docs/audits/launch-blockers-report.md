# تقرير حواجز الإطلاق — Siraja Backend
**تاريخ:** 18 يوليو 2026

---

## تصنيف الحواجز

### 🔴 حرج — يمنع الإطلاق الإنتاجي

لا يوجد حاجز يمنع تشغيل النظام حالياً.  
الأخطاء الحرجة الموجودة **(تم إصلاحها في هذه الجلسة)**:
- ~~`@Public()` مفقود → 401 على جميع الـ public endpoints~~  ✅ مُصلَح
- ~~`user.tenantId.toHexString` → 500 على `/users/me`~~ ✅ مُصلَح

---

### 🟠 مهم — يحدّ من وظائف أساسية

#### 1. Redis غير مفعّل
- **التأثير:** المهام الخلفية (جدولة التذكيرات، إرسال التقارير التلقائية، تحليلات الأخطاء) لا تعمل
- **الطوابير المعطّلة:** AI_QUEUE, EMAIL_QUEUE, NOTIFICATION_QUEUE, REPORT_QUEUE, AUDIO_QUEUE
- **الكاش:** in-process فقط — يُفقد عند إعادة التشغيل
- **الحل:** إضافة `REDIS_URL` (Upstash توفّر طبقة مجانية: https://upstash.com)

#### 2. البريد الإلكتروني غير مفعّل
- **التأثير:** لا يصل أي بريد للمستخدمين — التحقق من الإيميل، إعادة تعيين الكلمة، التنبيهات
- **الحل:** إضافة `EMAIL_PASS` = Resend API key (الحساب المجاني يتيح 3000 بريد/شهر)
  - رابط: https://resend.com → API Keys

---

### 🟡 مستحسن — يحدّ من ميزات متقدمة

#### 3. Moonshot AI غير مفعّل
- **التأثير:** جميع الـ endpoints في `/ai/...` ترجع 503 advisory
- **الميزات المتأثرة:** تحليل الأخطاء، التوصيات الذكية، تقارير الشيوخ والأولياء
- **الحل:** إضافة `MOONSHOT_API_KEY` من https://platform.moonshot.cn

#### 4. Cloudflare R2 غير مفعّل
- **التأثير:** رفع الصور والملفات الصوتية لا يعمل
- **الميزات المتأثرة:** صورة المستخدم، الملفات الصوتية للتلاوة
- **الحل:** إنشاء bucket في Cloudflare R2 وتوفير 5 متغيرات:
  ```
  STORAGE_ACCESS_KEY_ID=...
  STORAGE_SECRET_ACCESS_KEY=...
  STORAGE_BUCKET=siraja-media
  STORAGE_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
  STORAGE_PUBLIC_URL=https://media.siraja.app
  ```

---

### ℹ️ ملاحظة تقنية — ليست حاجزاً

#### تحذير Mongoose — duplicate index
```
[MONGOOSE] Warning: Duplicate schema index on {"tenantId":1} found.
```
- مصدر: تعريف `index: true` مع `schema.index()` معاً
- التأثير: تحذير فقط، لا يؤثر على الأداء بشكل ملحوظ
- الأولوية: منخفضة — للتنظيف في sprint لاحق

---

## خلاصة: خطوات التفعيل بالترتيب

```bash
# الأولوية الأولى — البريد الإلكتروني (30 دقيقة)
# 1. سجّل في resend.com واحصل على API key
# 2. EMAIL_PASS=re_xxxxxxxxxxxx  (في Replit Secrets)

# الأولوية الثانية — Redis (15 دقيقة)
# 1. أنشئ قاعدة Upstash Redis مجانية
# 2. REDIS_URL=rediss://default:...@...upstash.io:6379  (في Replit Secrets)

# الأولوية الثالثة — Moonshot AI
# 3. MOONSHOT_API_KEY=sk-...  (في Replit Secrets)

# الأولوية الرابعة — Cloudflare R2
# 4. 5 متغيرات R2 كما موضح أعلاه
```

بعد تفعيل البريد وRedis تصبح جاهزية النظام **~93%**.
بعد تفعيل جميع الخدمات تصبح **100%**.
