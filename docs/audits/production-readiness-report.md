# تقرير الجاهزية للإنتاج — Siraja Backend
**تاريخ التدقيق:** 18 يوليو 2026  
**المدقق:** Replit Agent (Production Readiness Audit)  
**النسخة:** v0.1.0 — Phase 12E Complete  

---

## ملخص تنفيذي

| المؤشر | القيمة |
|---|---|
| **نسبة جاهزية النظام** | **78 %** |
| الحالة العامة | 🟡 جاهز جزئياً — الخدمات الاختيارية غير مفعّلة |
| الخدمات الأساسية | ✅ 100 % تعمل |
| الخدمات الخارجية | ⚠️ 0 / 4 مفعّلة (تعمل بـ graceful fallback) |
| الأخطاء المكتشفة | 🔴 2 — تم إصلاحهما في هذه الجلسة |
| المسارات المفحوصة | 30+ endpoint |

---

## 1. بيانات قاعدة البيانات

| المجموعة | العدد | الحالة |
|---|---|---|
| المستخدمون (`users`) | **11** | ✅ |
| الصلاحيات (`permissions`) | **129** | ✅ |
| السور (`surahs`) | **114** | ✅ |
| الآيات (`ayahs`) | **6,236** | ✅ |
| المستأجرون (`tenants`) | **1** (siraja-demo) | ✅ |
| الأدوار (`roles`) | 0 (تُعرَّف برمجياً لا في DB) | ✅ |
| المجموعات الكلية في MongoDB | **67** | ✅ |

---

## 2. حالة الخدمات الخارجية

### Redis
| المعامل | القيمة |
|---|---|
| الحالة | ⛔ **Not Configured** |
| متغير البيئة | `REDIS_URL` = غير مضبوط |
| السلوك الحالي | Graceful fallback تلقائي |
| BullMQ queues | ⚠️ no-op (5 طوابير معطّلة: AI/EMAIL/NOTIFICATION/REPORT/AUDIO) |
| CacheService | ⚠️ SimpleTtlCache في الذاكرة (in-process) |
| تأثير على التشغيل | لا يوجد crash — النظام يعمل بدونه |
| ما يفتقده | المهام الخلفية، الكاش الموزّع |

### البريد الإلكتروني (SMTP / Resend)
| المعامل | القيمة |
|---|---|
| الحالة | ⛔ **Not Configured** |
| المضيف | `smtp.resend.com` (EMAIL_HOST مضبوط) |
| المستخدم | `resend` (EMAIL_USER مضبوط) |
| كلمة المرور | `EMAIL_PASS` = غير مضبوط |
| السلوك الحالي | يتخطى الإرسال مع تحذير WARN (لا crash) |
| تأثير على التشغيل | رسائل التحقق، إعادة الكلمة، التنبيهات لا تُرسَل |
| ملاحظة من السجل | `SmtpEmailProvider: Email skipped (no SMTP host configured)` |

### Moonshot AI
| المعامل | القيمة |
|---|---|
| الحالة | ⛔ **Not Configured** |
| المتغير | `MOONSHOT_API_KEY` = غير مضبوط |
| السلوك الحالي | يُرجع `AI_UNAVAILABLE` 503 |
| تأثير على التشغيل | جميع endpoints الذكاء الاصطناعي تعمل لكنها ترجع 503 advisory |
| المسارات المتأثرة | `/ai/students/:id/insights`, `/ai/students/:id/revision-recommendation`, إلخ |

### Cloudflare R2 (التخزين)
| المعامل | القيمة |
|---|---|
| الحالة | ⛔ **Not Configured** |
| `STORAGE_DRIVER` | `s3` (مضبوط) |
| `STORAGE_REGION` | `auto` (مضبوط) |
| المفاتيح | `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, `STORAGE_BUCKET`, `STORAGE_ENDPOINT`, `STORAGE_PUBLIC_URL` = غير مضبوطة |
| السلوك الحالي | `NoopStorageProvider` يعمل بدلاً من S3Provider |
| تأثير على التشغيل | رفع الملفات لا يعمل — الاستجابة ستُحيل إلى عدم التوافر |

---

## 3. نتائج الـ Smoke Tests

### Endpoints العامة (بلا توثيق)
| المسار | الكود | الحالة |
|---|---|---|
| `GET /health` | 200 | ✅ |
| `GET /donations/public` | 200 | ✅ |
| `GET /donations/fundraising-progress` | 200 | ✅ |
| `GET /presentation` | 200 | ✅ |
| `GET /presentation/mission` | 200 | ✅ |
| `GET /presentation/features` | 200 | ✅ |
| `GET /feedback/public` | 200 | ✅ |
| `GET /feature-requests` | 200 | ✅ |
| `GET /feature-requests/top` | 200 | ✅ |
| `GET /docs` (Swagger) | 200 | ✅ |

### Endpoints المحمية (بتوثيق JWT)
| المسار | الكود | الحالة |
|---|---|---|
| `POST /auth/login` | 200 | ✅ |
| `GET /users/me` (admin) | 200 | ✅ |
| `GET /users/me` (student) | 200 | ✅ |
| `GET /quran/surahs` | 200 | ✅ |
| `GET /quran/surahs/1` | 200 | ✅ |
| `GET /quran/surahs/1/ayahs/1` | 200 | ✅ |
| `GET /memorization` | 200 | ✅ |
| `GET /circles` | 200 | ✅ |
| `GET /students` | 200 | ✅ |
| `GET /gamification/leaderboard` | 200 | ✅ |
| `GET /admin/dashboard/health` | 200 | ✅ |
| `GET /messaging/threads` | 200 | ✅ |
| `GET /announcements` | 200 | ✅ |
| `GET /notifications` | 200 | ✅ |

### Health Endpoint التفصيلي
```json
{
  "status": "ok",
  "uptimeSeconds": 28,
  "dependencies": {
    "mongodb": "connected"
  }
}
```
> ملاحظة: Redis/Email/AI/Storage غائبة من الـ health response لأنها غير مفعّلة.

---

## 4. الأخطاء المكتشفة والإصلاحات المُطبَّقة

### 🔴 خطأ 1 — `@Public()` مفقود على 4 controllers
| التفاصيل | |
|---|---|
| **الملفات المتأثرة** | `donations.controller.ts`, `presentation.controller.ts`, `feedback.controller.ts`, `feature-voting.controller.ts` |
| **الأعراض** | جميع endpoints العامة ترجع 401 بلا توكن |
| **السبب** | `JwtAuthGuard` مسجّل globally — يتطلب `@Public()` صريح لتخطي التوثيق |
| **الإصلاح** | إضافة `@Public()` على 3 public endpoints في donations، `@Public()` على مستوى الكلاس في presentation، `@Public()` على `submit` و`listPublic` في feedback، `@Public()` على list/top/getById/suggest في feature-voting |
| **الحالة** | ✅ **تم الإصلاح** |

### 🔴 خطأ 2 — `user.tenantId.toHexString is not a function` في GetMeUseCase
| التفاصيل | |
|---|---|
| **الملف** | `src/modules/users/application/use-cases/get-me.use-case.ts:37` |
| **الأعراض** | `GET /users/me` يرجع 500 لجميع المستخدمين |
| **السبب** | `user.tenantId` يُرجع string من Mongoose لا `Types.ObjectId`، لذا `.toHexString()` غير موجود |
| **الإصلاح** | `user.tenantId.toHexString()` → `String(user.tenantId)` |
| **الحالة** | ✅ **تم الإصلاح** |

---

## 5. ملاحظات غير حرجة (Soft 404s — سلوك صحيح)

| المسار | الكود | التفسير |
|---|---|---|
| `GET /progress/me` (admin) | 404 | admin ليس student — صحيح |
| `GET /forecast/me` (admin) | 404 | admin ليس student — صحيح |
| `GET /sheikhs/me` (admin) | 404 | admin ليس sheikh — صحيح |
| `GET /quran/surahs?page=1&limit=2` | 400 | ListSurahsQueryDto لا يقبل `page`/`limit` — يُستخدم DTO مختلف |

---

## 6. Graceful Fallback — تأكيد من السجل

```
[QueuesModule] REDIS_URL not set — BullMQ queues disabled. All queue operations will be no-ops.
[SmtpEmailProvider] Email skipped (no SMTP host configured): "Unusual sign-in detected — Siraja"
[MailerService] Suspicious login alert dispatched ... (no crash)
```
النظام يعمل بشكل طبيعي بدون أي من الخدمات الأربع — لا crash، لا startup failure.

---

## 7. حساب نسبة الجاهزية

| المحور | الوزن | الجاهزية |
|---|---|---|
| التشغيل الأساسي (startup، MongoDB، JWT، guards) | 30% | 100% ✅ |
| البيانات (سيدرز: permissions، quran، demo) | 20% | 100% ✅ |
| Endpoints — Public | 15% | 100% ✅ |
| Endpoints — Protected | 15% | 100% ✅ |
| Redis + BullMQ | 10% | 0% ⛔ |
| Email (SMTP) | 5% | 0% ⛔ |
| AI (Moonshot) | 3% | 0% ⛔ |
| Storage (R2) | 2% | 0% ⛔ |
| **المجموع** | **100%** | **~78%** |

---

*آخر تحديث: 18 يوليو 2026*
