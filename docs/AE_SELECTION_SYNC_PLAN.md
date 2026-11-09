# AE Selection Sync - خطة التنفيذ الاحترافية

## 📋 ملخص المشروع

إنشاء نظام مركزي لمزامنة التحديد مع After Effects في الوقت الحقيقي، يمكن استخدامه من جميع أجزاء التطبيق.

---

## 🔍 تحليل النظام الحالي

### الملفات التي تحتاج Selection Sync

| الملف | الاستخدام الحالي | الحاجة |
|-------|------------------|--------|
| `selection-watcher.js` | Polling كل 500ms للـ Pin system | ✅ أساسي |
| `bolas-grid.js` | `refreshChain()` يدوي | ✅ تحديث تلقائي للـ Chain View |
| `hunter-bar.js` | `refreshLayers()` يدوي | ✅ تحديث قائمة الطبقات |
| `chain-controls.js` | `showControls()` عند النقر | ✅ تحديث تلقائي للتحكم |
| `smart-chain-controls.js` | يعتمد على chain-controls | ⚪ غير مباشر |
| `main.js` | لا يستخدم | ⚪ لا يحتاج |
| `options-controller.js` | لا يستخدم | ⚪ لا يحتاج |

### المشاكل الحالية

1. **تكرار الكود**: كل ملف يقوم بـ polling منفصل
2. **عدم التزامن**: Chain View لا يتحدث تلقائياً عند تغيير التحديد
3. **استهلاك الموارد**: عدة polling intervals تعمل بشكل متوازي
4. **تجربة مستخدم ضعيفة**: يجب النقر على Refresh يدوياً

---

## 🎯 الأهداف

### أهداف أساسية
- [ ] نظام مركزي واحد للـ Selection Sync
- [ ] تحديث لحظي لجميع المكونات
- [ ] تقليل استهلاك الموارد
- [ ] API بسيط وقابل للتوسع

### أهداف متقدمة
- [ ] Adaptive Polling (سريع عند التفاعل، بطيء عند الخمول)
- [ ] Composition Change Detection
- [ ] Batch Updates (تجميع التحديثات)
- [ ] Debug Mode للتطوير

---

## 🏗️ التصميم المقترح

### البنية العامة

```
┌─────────────────────────────────────────────────────────────────┐
│                     AESelectionSync                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Core Engine                           │    │
│  │  - Polling Manager (Adaptive)                           │    │
│  │  - Selection Cache                                       │    │
│  │  - Change Detector                                       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   Event System                           │    │
│  │  - selectionChanged                                      │    │
│  │  - compositionChanged                                    │    │
│  │  - layerStateChanged                                     │    │
│  │  - chainDetected                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│         ┌────────────────────┼────────────────────┐             │
│         ▼                    ▼                    ▼             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │ Selection   │    │ Chain View  │    │ Hunter Bar  │         │
│  │ Watcher     │    │ (bolas-grid)│    │             │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│         │                    │                    │             │
│         ▼                    ▼                    ▼             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │ Pin System  │    │ Chain       │    │ Layer       │         │
│  │             │    │ Controls    │    │ Dropdown    │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

### API المقترح

```javascript
// ═══════════════════════════════════════════════════════════════
// AESelectionSync API
// ═══════════════════════════════════════════════════════════════

// التهيئة
AESelectionSync.init({
    pollRate: 200,           // معدل الـ polling الافتراضي
    fastPollRate: 100,       // معدل سريع عند التفاعل
    idlePollRate: 500,       // معدل بطيء عند الخمول
    idleTimeout: 3000,       // وقت الانتظار قبل الخمول
    autoStart: true          // بدء تلقائي
});

// الاشتراك في الأحداث
AESelectionSync.on('selectionChanged', function(data) {
    // data: { layers: [], count: number, isSingle: boolean }
});

AESelectionSync.on('singleLayerSelected', function(layer) {
    // layer: { index, name, isFree, isHunter, isPrey, is3D }
});

AESelectionSync.on('chainDetected', function(chainInfo) {
    // chainInfo: { inChain: boolean, members: [], length: number }
});

AESelectionSync.on('compositionChanged', function(comp) {
    // comp: { name, id, numLayers }
});

AESelectionSync.on('noSelection', function() {
    // عند إلغاء التحديد
});

// إلغاء الاشتراك
var unsubscribe = AESelectionSync.on('selectionChanged', handler);
unsubscribe(); // لإلغاء الاشتراك

// الحصول على البيانات الحالية
AESelectionSync.getSelection();      // التحديد الحالي
AESelectionSync.getLastSelection();  // آخر تحديد
AESelectionSync.getCurrentComp();    // الكومبوزيشن الحالي

// التحكم
AESelectionSync.start();             // بدء المراقبة
AESelectionSync.stop();              // إيقاف المراقبة
AESelectionSync.pause();             // إيقاف مؤقت
AESelectionSync.resume();            // استئناف
AESelectionSync.setMode('fast');     // وضع سريع
AESelectionSync.setMode('idle');     // وضع خمول
AESelectionSync.forceRefresh();      // تحديث فوري
```

---

## 📁 هيكل الملفات

```
com.bolaspro.panel/
├── js/
│   ├── core/
│   │   ├── ae-selection-sync.js    ← جديد (النظام المركزي)
│   │   ├── selection-watcher.js    ← تعديل (يستخدم AESelectionSync)
│   │   ├── host-service.js         ← تعديل (إضافة APIs جديدة)
│   │   └── ...
│   ├── controllers/
│   │   ├── bolas-grid.js           ← تعديل (يشترك في الأحداث)
│   │   ├── hunter-bar.js           ← تعديل (يشترك في الأحداث)
│   │   ├── chain-controls.js       ← تعديل (يشترك في الأحداث)
│   │   └── ...
│   └── main.js                     ← تعديل (تهيئة AESelectionSync)
└── jsx/
    └── hostscript.jsx              ← تعديل (APIs محسنة)
```

---

## 📋 المهام التفصيلية

### المرحلة 1: البنية الأساسية (Core)

#### Task 1.1: إنشاء AESelectionSync
- [ ] إنشاء ملف `ae-selection-sync.js`
- [ ] تنفيذ Polling Engine
- [ ] تنفيذ Event System (pub/sub)
- [ ] تنفيذ Selection Cache
- [ ] تنفيذ Change Detection

#### Task 1.2: تحسين Host Service
- [ ] إضافة `getSelectionState()` - API موحد
- [ ] إضافة `getCompositionInfo()` - معلومات الكومبوزيشن
- [ ] تحسين `getSelectedLayerIndex()` - إضافة معلومات إضافية

#### Task 1.3: تحسين JSX APIs
- [ ] إضافة `getSelectionState()` في hostscript.jsx
- [ ] تحسين الأداء بتقليل الاستدعاءات

### المرحلة 2: التكامل (Integration)

#### Task 2.1: تحديث Selection Watcher
- [ ] إزالة Polling الخاص
- [ ] الاشتراك في `AESelectionSync`
- [ ] الحفاظ على Pin System

#### Task 2.2: تحديث Bolas Grid
- [ ] إزالة `refreshChain()` اليدوي
- [ ] الاشتراك في `chainDetected`
- [ ] تحديث تلقائي للـ Chain View

#### Task 2.3: تحديث Hunter Bar
- [ ] إزالة `refreshLayers()` اليدوي
- [ ] الاشتراك في `selectionChanged`
- [ ] تحديث تلقائي للقائمة

#### Task 2.4: تحديث Chain Controls
- [ ] الاشتراك في `singleLayerSelected`
- [ ] تحديث تلقائي للتحكم

### المرحلة 3: التحسينات (Enhancements)

#### Task 3.1: Adaptive Polling
- [ ] تنفيذ Fast Mode (100ms)
- [ ] تنفيذ Idle Mode (500ms)
- [ ] تنفيذ Auto-switch بناءً على النشاط

#### Task 3.2: Performance Optimization
- [ ] Debouncing للتحديثات المتكررة
- [ ] Batch Updates للمكونات المتعددة
- [ ] Memory Management

#### Task 3.3: Debug & Monitoring
- [ ] Debug Mode مع logging
- [ ] Performance Metrics
- [ ] Error Handling محسن

---

## 🔄 تدفق البيانات

```
┌─────────────────────────────────────────────────────────────────┐
│                        After Effects                             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  comp.selectedLayers                                     │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (Polling)
┌─────────────────────────────────────────────────────────────────┐
│                      hostscript.jsx                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  getSelectionState() → {                                 │    │
│  │    layers: [...],                                        │    │
│  │    compId: number,                                       │    │
│  │    compName: string,                                     │    │
│  │    chainInfo: {...}                                      │    │
│  │  }                                                       │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (CSInterface)
┌─────────────────────────────────────────────────────────────────┐
│                     AESelectionSync                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  1. Compare with cache                                   │    │
│  │  2. Detect changes                                       │    │
│  │  3. Emit events                                          │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
       ┌───────────┐   ┌───────────┐   ┌───────────┐
       │ Selection │   │ Chain     │   │ Hunter    │
       │ Watcher   │   │ View      │   │ Bar       │
       └───────────┘   └───────────┘   └───────────┘
```

---

## ⚡ الأحداث المتاحة

| الحدث | الوصف | البيانات |
|-------|-------|----------|
| `selectionChanged` | تغير التحديد | `{ layers, count, isSingle }` |
| `singleLayerSelected` | تحديد طبقة واحدة | `{ index, name, isFree, ... }` |
| `multipleLayersSelected` | تحديد عدة طبقات | `{ layers, count }` |
| `noSelection` | إلغاء التحديد | `null` |
| `chainDetected` | اكتشاف سلسلة | `{ inChain, members, length }` |
| `freeLayerSelected` | تحديد طبقة حرة | `{ index, name }` |
| `compositionChanged` | تغير الكومبوزيشن | `{ name, id, numLayers }` |
| `error` | خطأ | `{ message, code }` |

---

## 📊 مقارنة الأداء المتوقع

| المقياس | قبل | بعد |
|---------|-----|-----|
| عدد Polling Intervals | 3+ | 1 |
| استدعاءات JSX/ثانية | ~6 | ~2 |
| زمن الاستجابة | 500ms | 100-200ms |
| استهلاك الذاكرة | متوسط | منخفض |
| تجربة المستخدم | يدوية | تلقائية |

---

## 🚀 خطة التنفيذ

### الأسبوع 1: البنية الأساسية
- يوم 1-2: إنشاء `ae-selection-sync.js`
- يوم 3: تحسين `host-service.js` و `hostscript.jsx`
- يوم 4-5: اختبار وتصحيح

### الأسبوع 2: التكامل
- يوم 1: تحديث `selection-watcher.js`
- يوم 2: تحديث `bolas-grid.js`
- يوم 3: تحديث `hunter-bar.js`
- يوم 4: تحديث `chain-controls.js`
- يوم 5: اختبار شامل

### الأسبوع 3: التحسينات
- يوم 1-2: Adaptive Polling
- يوم 3-4: Performance Optimization
- يوم 5: Documentation & Cleanup

---

## ✅ معايير النجاح

1. **الأداء**: زمن استجابة < 200ms
2. **الاستقرار**: لا أخطاء في الـ console
3. **التوافق**: يعمل مع جميع المكونات الحالية
4. **قابلية التوسع**: سهولة إضافة مشتركين جدد
5. **تجربة المستخدم**: تحديث تلقائي بدون تدخل

---

## 📝 ملاحظات

- CEP لا يدعم Events من AE، لذا Polling هو الحل الوحيد
- يجب الحذر من استهلاك الموارد مع Polling سريع
- يمكن إضافة WebSocket في المستقبل إذا توفر الدعم

---

*آخر تحديث: ديسمبر 2024*
