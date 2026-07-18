# تقرير تسليم الواجهة الأمامية — Siraja API
**تاريخ:** 18 يوليو 2026  
**للفريق:** Flutter Frontend Team

---

## معلومات الاتصال بالـ API

| المعامل | القيمة |
|---|---|
| Base URL (Replit Dev) | `https://<repl-domain>.replit.dev/api/v1` |
| Swagger UI | `https://<repl-domain>.replit.dev/docs` |
| Health Endpoint | `GET /api/v1/health` |
| Content-Type | `application/json` |
| التوثيق | `Authorization: Bearer <accessToken>` |
| تعريف المستأجر | `X-Tenant-Slug: <tenant-slug>` (header إلزامي) |

---

## بيانات تسجيل الدخول التجريبية (Demo)

| الدور | الإيميل | الكلمة | Header |
|---|---|---|---|
| Tenant Admin | `admin@siraja-demo.test` | `BetaDemo123!` | `X-Tenant-Slug: siraja-demo` |
| Sheikh | `sheikh@siraja-demo.test` | `BetaDemo123!` | `X-Tenant-Slug: siraja-demo` |
| Parent | `parent@siraja-demo.test` | `BetaDemo123!` | `X-Tenant-Slug: siraja-demo` |
| Student | `student@siraja-demo.test` | `BetaDemo123!` | `X-Tenant-Slug: siraja-demo` |

---

## مسار التوثيق

### تسجيل الدخول
```http
POST /api/v1/auth/login
Content-Type: application/json
X-Tenant-Slug: siraja-demo

{
  "identifier": "admin@siraja-demo.test",
  "password": "BetaDemo123!"
}
```

**الرد:**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "...",
  "user": {
    "id": "...",
    "email": "admin@siraja-demo.test",
    "fullName": "Demo Tenant Admin",
    "roles": ["tenant_admin"],
    "tenantId": "...",
    "isEmailVerified": true
  }
}
```

> ⚠️ **مهم:** حقل تسجيل الدخول هو `identifier` (ليس `email`) — يقبل إيميل أو رقم هاتف.

### تجديد التوكن
```http
POST /api/v1/auth/refresh
Content-Type: application/json
X-Tenant-Slug: siraja-demo

{
  "refreshToken": "..."
}
```

### تسجيل مستخدم جديد
```http
POST /api/v1/auth/register
Content-Type: application/json
X-Tenant-Slug: siraja-demo

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "fullName": "اسم المستخدم",
  "role": "student"         // tenant_admin | sheikh | parent | student
}
```

---

## Endpoints الرئيسية

### Endpoints العامة (لا تحتاج توثيق)
```
GET  /api/v1/health
GET  /api/v1/donations/public
GET  /api/v1/donations/fundraising-progress
GET  /api/v1/presentation
GET  /api/v1/presentation/mission
GET  /api/v1/presentation/features
GET  /api/v1/presentation/roadmap
GET  /api/v1/presentation/testimonials
GET  /api/v1/feedback/public
GET  /api/v1/feature-requests
GET  /api/v1/feature-requests/top
```

### المستخدم والملف الشخصي
```
GET    /api/v1/users/me                        — الملف الشخصي الكامل
PATCH  /api/v1/users/me                        — تعديل الاسم، الصورة، الجنس
PATCH  /api/v1/users/me/language               — تفضيلات اللغة
PATCH  /api/v1/users/me/notifications          — تفضيلات الإشعارات
```

### القرآن الكريم
```
GET  /api/v1/quran/surahs                      — قائمة السور (114)
GET  /api/v1/quran/surahs/:surahNumber         — سورة بالرقم
GET  /api/v1/quran/surahs/:surahNumber/ayahs/:ayahNumber  — آية محددة
GET  /api/v1/quran/search?q=الرحمن             — البحث في القرآن
```

### الحفظ والتسميع
```
POST  /api/v1/memorization                     — تسجيل جلسة حفظ
GET   /api/v1/memorization                     — سجل الحفظ
GET   /api/v1/memorization/:id                 — جلسة محددة
GET   /api/v1/progress/me                      — تقدم الطالب (student فقط)
GET   /api/v1/forecast/me                      — توقعات الإتمام (student فقط)
```

### الحلقات والمجموعات
```
GET   /api/v1/circles                          — قائمة الحلقات
POST  /api/v1/circles                          — إنشاء حلقة
GET   /api/v1/circles/:id                      — حلقة محددة
```

### Gamification
```
GET   /api/v1/gamification/leaderboard         — لوحة المتصدرين
GET   /api/v1/gamification/stats/me            — إحصائيات المستخدم
```

### الرسائل والإشعارات
```
GET   /api/v1/messaging/threads                — المحادثات
POST  /api/v1/messaging/threads                — محادثة جديدة
GET   /api/v1/notifications                    — الإشعارات
```

### الذكاء الاصطناعي (/ai/...)
> **ملاحظة:** حالياً ترجع 503 (MOONSHOT_API_KEY غير مضبوط). ستعمل بعد إضافة المفتاح.
```
GET  /api/v1/ai/students/:studentId/insights
GET  /api/v1/ai/students/:studentId/revision-recommendation
GET  /api/v1/ai/students/:studentId/memorization-recommendation
GET  /api/v1/ai/students/:studentId/forecast-explanation
GET  /api/v1/ai/sheikhs/:sheikhId/report
GET  /api/v1/ai/parents/:parentId/report
```

---

## ملاحظات تقنية مهمة للـ Flutter

1. **`identifier` لا `email`:** حقل تسجيل الدخول يسمى `identifier` (يقبل إيميل أو هاتف).

2. **`X-Tenant-Slug` إلزامي:** كل request يحتاج هذا الـ header — حتى عمليات التسجيل/الدخول.

3. **`ListSurahsQueryDto`:** `GET /quran/surahs` لا يقبل `?page=...&limit=...` — يستخدم DTO مختلف. راجع Swagger للمعاملات الصحيحة.

4. **الـ 404 المتوقعة:** endpoints مثل `/progress/me` و`/forecast/me` و`/sheikhs/me` ترجع 404 إذا لم يكن للمستخدم profile مطابق (admin لا يملك sheikh profile مثلاً) — هذا سلوك صحيح.

5. **Access Token صالح لـ 15 دقيقة** — استخدم Refresh Token لتجديده تلقائياً.

6. **Refresh Token:** opaque token (ليس JWT) — خزّنه بأمان في secure storage.

---

## حالة الـ Swagger

Swagger UI متاح على `/docs` (HTTP 200) ويحتوي على توثيق كامل لجميع الـ endpoints مع أمثلة Request/Response.

---

*تاريخ الإنتاج: 18 يوليو 2026 — Siraja Backend v0.1.0*
