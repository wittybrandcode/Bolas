# Smart Chain Operations - نظام العمليات الذكية على السلاسل

## 📋 نظرة عامة

نظام متقدم للتحكم في سلوك السلسلة عند قطع أو حذف عنصر من منتصفها، يوفر خيارات ذكية للمستخدم بدلاً من ترك العناصر "يتيمة" بدون معالجة.

---

## 🎯 المشكلة

### الحالة الحالية
عند وجود سلسلة من 5 عناصر:
```
[Hunter] → [A] → [B] → [C] → [D]
```

إذا قطعنا العنصر `B`:
- تنقطع السلسلة بشكل مفاجئ
- العناصر `C` و `D` تصبح "يتيمة" بدون leader
- لا يوجد تحكم في ما يحدث للعناصر المتبقية

### الحل المقترح
توفير **قائمة خيارات ذكية** تظهر عند القطع/الحذف، تسمح للمستخدم باختيار السلوك المناسب.

---

## ✂️ عمليات القطع (Unchain Operations)

### السيناريو المرجعي
```
[Hunter] → [A] → [B] → [C] → [D]
                  ↑
            العنصر المحدد
```

---

### 1️⃣ Cut After (قطع ما بعد)
**الوصف**: قطع كل العناصر التي تلي B، مع إبقاء B مربوطاً بما قبله.

**قبل**:
```
[Hunter] → [A] → [B] → [C] → [D]
```

**بعد**:
```
[Hunter] → [A] → [B]     (السلسلة الأصلية)
[C] ← حر
[D] ← حر
```

**حالة الاستخدام**: تريد الاحتفاظ بجزء من السلسلة وتحرير الباقي.

---

### 2️⃣ Bypass (تجاوز)
**الوصف**: قطع B من السلسلة وربط A مباشرة بـ C، فتستمر السلسلة بدون B.

**قبل**:
```
[Hunter] → [A] → [B] → [C] → [D]
```

**بعد**:
```
[Hunter] → [A] → [C] → [D]     (السلسلة مستمرة)
[B] ← حر
```

**حالة الاستخدام**: تريد إزالة عنصر من الوسط دون كسر السلسلة.

---

### 3️⃣ Split (تقسيم)
**الوصف**: قطع B عن السلسلة السابقة وجعله قائد (Hunter) لسلسلة جديدة.

**قبل**:
```
[Hunter] → [A] → [B] → [C] → [D]
```

**بعد**:
```
[Hunter] → [A]                  (السلسلة الأولى)
[B] → [C] → [D]                 (سلسلة جديدة، B هو القائد)
```

**حالة الاستخدام**: تريد تقسيم سلسلة طويلة إلى سلسلتين مستقلتين.

---

## 🗑️ عمليات الحذف (Delete Operations)

### السيناريو المرجعي
```
[Hunter] → [A] → [B] → [C] → [D]
                  ↑
            العنصر المحدد للحذف
```

---

### 4️⃣ Delete + Reconnect (حذف مع إعادة الربط)
**الوصف**: حذف B من الـ Composition وربط A بـ C تلقائياً.

**قبل**:
```
[Hunter] → [A] → [B] → [C] → [D]
```

**بعد**:
```
[Hunter] → [A] → [C] → [D]     (السلسلة مستمرة)
[B] ← محذوف من Composition
```

**حالة الاستخدام**: تريد حذف عنصر نهائياً مع الحفاظ على تسلسل السلسلة.

---

### 5️⃣ Delete + Free (حذف مع تحرير)
**الوصف**: حذف B وتحرير كل العناصر التي كانت تتبعه.

**قبل**:
```
[Hunter] → [A] → [B] → [C] → [D]
```

**بعد**:
```
[Hunter] → [A]     (السلسلة تنتهي عند A)
[B] ← محذوف
[C] ← حر
[D] ← حر
```

**حالة الاستخدام**: تريد حذف عنصر وتحرير كل ما يليه للتحكم اليدوي.

---

### 6️⃣ Delete Cascade (حذف متسلسل)
**الوصف**: حذف B وكل العناصر التي تليه من الـ Composition.

**قبل**:
```
[Hunter] → [A] → [B] → [C] → [D]
```

**بعد**:
```
[Hunter] → [A]     (السلسلة تنتهي عند A)
[B] ← محذوف
[C] ← محذوف
[D] ← محذوف
```

**حالة الاستخدام**: تريد حذف جزء كامل من السلسلة نهائياً.

⚠️ **تحذير**: هذه العملية لا يمكن التراجع عنها بسهولة!

---

### 7️⃣ Delete + Promote (حذف مع ترقية)
**الوصف**: حذف B وترقية C ليصبح قائد (Hunter) لسلسلة جديدة.

**قبل**:
```
[Hunter] → [A] → [B] → [C] → [D]
```

**بعد**:
```
[Hunter] → [A]          (السلسلة الأولى)
[C] → [D]               (سلسلة جديدة، C هو القائد)
[B] ← محذوف
```

**حالة الاستخدام**: تريد حذف عنصر مع الحفاظ على العناصر التالية كسلسلة مستقلة.

---

## 🎨 تصميم واجهة المستخدم

### الموقع
تظهر الخيارات في **Chain Controls Panel** عند تحديد عنصر من Chain View.

### التصميم المقترح

```
┌─────────────────────────────────────────────┐
│  Layer: [B]                    hunter-prey  │
├─────────────────────────────────────────────┤
│                                             │
│  ✂️ UNCHAIN                                 │
│  ┌─────────────────────────────────────┐    │
│  │ [Cut After]  [Bypass]  [Split]      │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  🗑️ DELETE                                  │
│  ┌─────────────────────────────────────┐    │
│  │ [Reconnect] [Free] [Cascade] [Promote]│   │
│  └─────────────────────────────────────┘    │
│                                             │
└─────────────────────────────────────────────┘
```

### الأيقونات المقترحة

| العملية | الأيقونة | اللون |
|---------|----------|-------|
| Cut After | `ph-scissors` | Orange |
| Bypass | `ph-arrows-split` | Cyan |
| Split | `ph-git-branch` | Green |
| Delete+Reconnect | `ph-link` | Red |
| Delete+Free | `ph-link-break` | Red |
| Delete Cascade | `ph-trash` | Red (مع تحذير) |
| Delete+Promote | `ph-crown` | Gold |

---

## 🔧 التنفيذ التقني

### الملفات المطلوب تعديلها

| الملف | التعديل |
|-------|---------|
| `jsx/modules/Chain.jsx` | إضافة دوال العمليات الجديدة |
| `jsx/modules/Free.jsx` | تعديل دوال الحذف |
| `jsx/hostscript.jsx` | إضافة API endpoints جديدة |
| `js/core/host-service.js` | إضافة methods للاتصال |
| `js/controllers/chain-controls.js` | إضافة UI للخيارات |
| `css/chain-controls.css` | تنسيق الأزرار الجديدة |
| `index.html` | إضافة HTML للأزرار |

### API المقترح

```javascript
// Unchain Operations
HostService.unchainCutAfter(layerIndex)      // قطع ما بعد
HostService.unchainBypass(layerIndex)        // تجاوز
HostService.unchainSplit(layerIndex)         // تقسيم

// Delete Operations  
HostService.deleteReconnect(layerIndex)      // حذف مع إعادة ربط
HostService.deleteFree(layerIndex)           // حذف مع تحرير
HostService.deleteCascade(layerIndex)        // حذف متسلسل
HostService.deletePromote(layerIndex)        // حذف مع ترقية
```

### JSX Functions المقترحة

```javascript
// في Chain.jsx
Chain.cutAfter = function(layerIndex) { ... }
Chain.bypass = function(layerIndex) { ... }
Chain.split = function(layerIndex) { ... }

// في Free.jsx أو Chain.jsx
Chain.deleteReconnect = function(layerIndex) { ... }
Chain.deleteFree = function(layerIndex) { ... }
Chain.deleteCascade = function(layerIndex) { ... }
Chain.deletePromote = function(layerIndex) { ... }
```

---

## 📊 جدول ملخص

| # | العملية | النوع | B | ما قبل B | ما بعد B |
|---|---------|-------|---|----------|----------|
| 1 | Cut After | Unchain | يبقى مربوط | لا تغيير | تتحرر |
| 2 | Bypass | Unchain | يتحرر | لا تغيير | تربط بما قبل B |
| 3 | Split | Unchain | يصبح Hunter | لا تغيير | تتبع B |
| 4 | Delete+Reconnect | Delete | يُحذف | لا تغيير | تربط بما قبل B |
| 5 | Delete+Free | Delete | يُحذف | لا تغيير | تتحرر |
| 6 | Delete Cascade | Delete | يُحذف | لا تغيير | تُحذف |
| 7 | Delete+Promote | Delete | يُحذف | لا تغيير | أول عنصر يصبح Hunter |

---

## 🚀 خطة التنفيذ

### المرحلة 1: البنية التحتية
- [ ] إضافة دوال JSX في `Chain.jsx`
- [ ] إضافة API في `hostscript.jsx`
- [ ] إضافة methods في `host-service.js`

### المرحلة 2: واجهة المستخدم
- [ ] تصميم أزرار العمليات في `chain-controls.js`
- [ ] إضافة CSS للأزرار
- [ ] ربط الأحداث

### المرحلة 3: الاختبار
- [ ] اختبار كل عملية على حدة
- [ ] اختبار الحالات الحدية (أول/آخر عنصر)
- [ ] اختبار Undo/Redo

---

## ⚠️ حالات خاصة

### عند تحديد Hunter الرئيسي
- لا تظهر خيارات القطع (لا يوجد ما قبله)
- تظهر فقط: Delete Cascade, Delete+Promote

### عند تحديد آخر عنصر (Prey النهائي)
- لا تظهر: Cut After, Split, Delete Cascade, Delete+Promote
- تظهر فقط: Bypass, Delete+Reconnect, Delete+Free

### سلسلة من عنصرين فقط
- خيارات محدودة حسب موقع العنصر

---

## 📝 ملاحظات

- جميع العمليات تدعم Undo في After Effects
- يتم تحديث Chain View تلقائياً بعد كل عملية
- تظهر رسالة تأكيد قبل عمليات الحذف المتسلسل
