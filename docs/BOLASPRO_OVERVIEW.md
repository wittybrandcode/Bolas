# BolasPro - نظرة شاملة على التطبيق

## 📌 معلومات عامة

| البند | القيمة |
|-------|--------|
| **الاسم** | BolasPro |
| **الإصدار** | 5.0 |
| **النوع** | CEP Extension لـ Adobe After Effects |
| **الغرض** | ربط الطبقات (Layers) ببعضها بحيث تتبع حركة طبقة قائدة |

---

## 🎯 الفكرة الأساسية

### ما هو BolasPro؟

BolasPro هو نظام **ربط ذكي للطبقات** في After Effects. يسمح بإنشاء "سلاسل" من الطبقات حيث:
- طبقة واحدة تكون **القائد (Hunter)** 
- باقي الطبقات تكون **التابعين (Prey)**
- التابعين يتبعون حركة القائد تلقائياً

### مثال عملي

تخيل شخصية كرتونية:
- **الجسم** = Hunter (القائد)
- **الرأس** = Prey (يتبع الجسم)
- **اليد** = Prey (تتبع الرأس)
- **الأصابع** = Prey (تتبع اليد)

عند تحريك الجسم، تتحرك كل الأجزاء معه بشكل متسلسل!

---

## 🔗 مفاهيم أساسية

### 1. Hunter (القائد/الصياد)
- الطبقة التي تقود الحركة
- لا تتبع أي طبقة أخرى
- يمكن أن يكون لها عدة تابعين (فروع)

### 2. Prey (الفريسة/التابع)
- طبقة تتبع طبقة أخرى
- تتحرك بناءً على حركة القائد
- يمكن أن تكون قائداً لطبقات أخرى في نفس الوقت

### 3. Hunter-Prey (قائد وتابع معاً)
- طبقة تتبع طبقة أعلى منها
- وفي نفس الوقت لها طبقات تتبعها
- مثال: الرأس يتبع الجسم، واليد تتبع الرأس

### 4. Chain (السلسلة)
- مجموعة طبقات مرتبطة ببعضها
- تبدأ بـ Hunter وتنتهي بـ Prey نهائي
- يمكن أن تكون طويلة (5+ طبقات) أو قصيرة (طبقتين)

### 5. Branch (الفرع) - قانون التفرع
```
✅ Hunter يمكنه امتلاك عدة فروع
❌ Prey/Hunter-Prey لا يمكنهم التفرع
```

---

## 🎛️ نقاط التحكم (Control Points)

### Snag Point (نقطة الإمساك)
- النقطة على **القائد** التي يتعلق بها التابع
- 9 مواقع ممكنة (شبكة 3×3)

```
[1] [2] [3]     أعلى يسار | أعلى | أعلى يمين
[4] [5] [6]     يسار | مركز | يمين
[7] [8] [9]     أسفل يسار | أسفل | أسفل يمين
```

### Prey Anchor (مرساة التابع)
- النقطة على **التابع** التي ترتبط بالقائد
- نفس الشبكة 3×3

---

## ⚙️ خيارات الربط

| الخيار | الوصف |
|--------|-------|
| **Lock Orientation** | التابع يدور مع القائد |
| **Maintain Offset** | التابع يحافظ على مسافته الأصلية |
| **Position Delay** | تأخير في متابعة الحركة (0-100) |
| **Rotation Delay** | تأخير في متابعة الدوران (0-100) |

---

## 🏗️ الأنظمة المركزية (Centralized Systems)

### نظرة عامة

BolasPro v5.0 يستخدم 4 أنظمة مركزية لإدارة الوظائف المشتركة:

| النظام | الملف | الوظيفة |
|--------|-------|---------|
| AE Selection Sync | `ae-selection-sync.js` | مراقبة التحديد في AE |
| Undo Manager | `undo-manager.js` | التراجع والإعادة |
| Context Menu | `context-menu.js` | قوائم السياق |
| Modal System | `modal.js` | النوافذ المنبثقة |

---

## 🔄 1. AE Selection Sync System

### الغرض
مراقبة مركزية للتحديد في After Effects مع توزيع الأحداث لجميع المكونات.

### الملفات
- `js/core/ae-selection-sync.js` - الموديول الرئيسي
- `jsx/hostscript.jsx` - API endpoint: `getSelectionState()`

### الميزات
- **Adaptive Polling**: 3 أوضاع (fast: 100ms, normal: 300ms, idle: 600ms)
- **Event-Driven**: المكونات تشترك في الأحداث
- **Composition-Aware**: يكتشف تغيير الـ Composition
- **Chain Detection**: يكتشف السلاسل تلقائياً

### الأحداث المتاحة

```javascript
AESelectionSync.on('selectionChanged', function(data) {
    // data: { layers, count, hasSelection }
});

AESelectionSync.on('singleLayerSelected', function(layer) {
    // layer: { index, name, isFree, isHunter, isPrey }
});

AESelectionSync.on('chainDetected', function(chainInfo) {
    // chainInfo: { members, chainLength, selectedIndex }
});

AESelectionSync.on('compositionChanged', function(comp) {
    // comp: { id, name, numLayers }
});

AESelectionSync.on('noSelection', function() {
    // لا يوجد تحديد
});
```

### الاستخدام

```javascript
// التهيئة
AESelectionSync.init({
    normalPollRate: 300,
    idlePollRate: 600,
    debug: false
});

// الاشتراك في حدث
var unsubscribe = AESelectionSync.on('selectionChanged', handler);

// إلغاء الاشتراك
unsubscribe();

// الحصول على التحديد الحالي
var selection = AESelectionSync.getSelection();

// فرض التحديث
AESelectionSync.forceRefresh();
```

### المكونات المتكاملة
- `SelectionWatcher` - نظام Pin
- `BolasGrid` - عرض السلسلة
- `HunterBar` - قائمة الطبقات
- `ChainControls` - أدوات التحكم

---

## ↩️ 2. Undo/Redo System

### الغرض
نظام تراجع/إعادة مركزي يحفظ حالة الطبقات قبل وبعد كل عملية.

### الملفات
- `js/core/undo-manager.js` - الموديول الرئيسي
- `jsx/modules/UndoHelper.jsx` - التقاط واستعادة الحالة
- `css/undo-controls.css` - تنسيق الأزرار

### الميزات
- **State-Based**: يحفظ الحالة الكاملة (ليس الأوامر)
- **50 Entry Limit**: حد أقصى للذاكرة
- **Composition-Aware**: يمسح السجل عند تغيير الـ Comp
- **Keyboard Shortcuts**: Ctrl+Z, Ctrl+Y

### العمليات المدعومة

| العملية | قابل للتراجع | ملاحظات |
|---------|-------------|---------|
| Create Chain (Snag) | ✅ | |
| Free Layers | ✅ | |
| Cut After | ✅ | |
| Bypass | ✅ | |
| Split | ✅ | |
| Insert Before/After | ✅ | |
| Swap Layers | ✅ | |
| Control Updates | ✅ | Snag Point, Delays, etc. |
| Delete Operations | ❌ | استخدم AE Undo |

### الاستخدام

```javascript
// التهيئة
UndoManager.init({ maxHistory: 50, debug: false });

// تسجيل عملية
UndoManager.beginOperation('chain', 'Create Chain', [1, 2, 3]);
// ... تنفيذ العملية ...
if (success) {
    UndoManager.endOperation();
} else {
    UndoManager.cancelOperation();
}

// التراجع/الإعادة
UndoManager.undo();
UndoManager.redo();

// الاستعلام
UndoManager.canUndo();  // boolean
UndoManager.canRedo();  // boolean
UndoManager.getUndoLabel();  // "Create Chain"

// الأحداث
UndoManager.on('stateChanged', function(state) {
    // state: { canUndo, canRedo, undoLabel, redoLabel }
});

UndoManager.on('undone', function(entry) {
    // تم التراجع
});
```

### لماذا State-Based وليس Command-Based؟

1. عمليات BolasPro معقدة (effects, expressions)
2. الأوامر العكسية ستكون معرضة للأخطاء
3. الذاكرة ليست مشكلة (50 entry max)
4. أسهل في الصيانة والتصحيح

---

## 📋 3. Context Menu System

### الغرض
قوائم سياق احترافية قابلة لإعادة الاستخدام.

### الملفات
- `js/core/context-menu.js` - الموديول الرئيسي
- `css/context-menu.css` - التنسيقات

### الميزات
- **Groups**: تجميع العناصر مع عناوين
- **Icons**: أيقونات Phosphor
- **Shortcuts**: اختصارات لوحة المفاتيح
- **Keyboard Navigation**: الأسهم + Enter
- **Auto-positioning**: لا يخرج عن الشاشة

### الاستخدام

```javascript
// التهيئة (مرة واحدة)
ContextMenu.init();

// عرض القائمة
ContextMenu.show(event.clientX, event.clientY, {
    groups: [
        {
            label: 'SELECTION',
            items: [
                { id: 'select', icon: 'ph-bold ph-cursor', label: 'Select in AE' },
                { id: 'selectAll', icon: 'ph-bold ph-selection-all', label: 'Select All' }
            ]
        },
        {
            label: 'INSERT',
            items: [
                { id: 'insertBefore', icon: 'ph-bold ph-arrow-up', label: 'Insert Before' },
                { id: 'insertAfter', icon: 'ph-bold ph-arrow-down', label: 'Insert After' }
            ]
        },
        {
            label: 'DANGER',
            items: [
                { id: 'delete', icon: 'ph-bold ph-trash', label: 'Delete', danger: true }
            ]
        }
    ],
    data: { layerIndex: 5 },
    onAction: function(actionId, data) {
        console.log('Action:', actionId, 'Data:', data);
    }
});

// إخفاء القائمة
ContextMenu.hide();
```

### خصائص العنصر

| الخاصية | النوع | الوصف |
|---------|-------|-------|
| `id` | string | معرف فريد |
| `label` | string | النص المعروض |
| `icon` | string | class الأيقونة |
| `shortcut` | string | اختصار لوحة المفاتيح |
| `disabled` | boolean | معطل |
| `danger` | boolean | لون أحمر |
| `checked` | boolean | علامة صح |

---

## 📌 4. Selection Watcher (Pin System)

### الغرض
حفظ طبقة حرة لاستخدامها في عمليات الإدراج والتبديل.

### الملف
- `js/core/selection-watcher.js`

### الميزات
- **Auto-detect**: يكتشف الطبقات الحرة تلقائياً
- **Pin/Unpin**: تثبيت الطبقة لمنع تغييرها
- **Visual Indicator**: مؤشر في شريط الأدوات

### الاستخدام

```javascript
// التهيئة
SelectionWatcher.init();

// التثبيت
SelectionWatcher.pin();
SelectionWatcher.unpin();
SelectionWatcher.togglePin();

// الاستعلام
SelectionWatcher.hasPinnedLayer();  // boolean
SelectionWatcher.getPinnedLayer();  // { index, name, isFree }
SelectionWatcher.isPinned();        // boolean

// المسح
SelectionWatcher.clearPinnedLayer();
```

### استخدام مع Insert/Swap

```javascript
// في Context Menu
function handleInsertAfter(targetIndex) {
    if (!SelectionWatcher.hasPinnedLayer()) {
        StatusBar.warning('Pin a free layer first');
        return;
    }
    
    var pinnedLayer = SelectionWatcher.getPinnedLayer();
    HostService.insertAfter(targetIndex, pinnedLayer.index).then(function(res) {
        if (res.success) {
            SelectionWatcher.clearPinnedLayer();
            BolasGrid.refreshChain();
        }
    });
}
```

---

## 🏗️ البنية التقنية

### هيكل الملفات

```
com.bolaspro.panel/
├── index.html
├── CSXS/manifest.xml
├── js/
│   ├── main.js                    # نقطة الدخول
│   ├── core/
│   │   ├── host-service.js        # التواصل مع AE
│   │   ├── state-manager.js       # إدارة الحالة
│   │   ├── status-bar.js          # شريط الحالة
│   │   ├── ae-selection-sync.js   # ⭐ مراقبة التحديد
│   │   ├── undo-manager.js        # ⭐ التراجع/الإعادة
│   │   ├── selection-watcher.js   # ⭐ نظام Pin
│   │   ├── context-menu.js        # ⭐ قوائم السياق
│   │   └── modal.js               # النوافذ المنبثقة
│   └── controllers/
│       ├── bolas-grid.js          # الشبكات والسلسلة
│       ├── hunter-bar.js          # شريط Hunter
│       ├── chain-controls.js      # أدوات التحكم
│       ├── smart-chain-controls.js# عمليات SmartChain
│       └── options-controller.js  # الخيارات
├── css/
│   ├── variables.css
│   ├── base.css
│   ├── bolas-grid.css
│   ├── chain-controls.css
│   ├── chain-view.css
│   ├── context-menu.css           # ⭐
│   ├── modal.css
│   ├── selection-indicator.css    # ⭐
│   └── undo-controls.css          # ⭐
└── jsx/
    ├── hostscript.jsx             # API الرئيسي
    ├── core/
    │   ├── Config.jsx
    │   ├── Utils.jsx
    │   ├── Cache.jsx
    │   └── Matrix.jsx
    ├── modules/
    │   ├── Chain.jsx
    │   ├── Snag.jsx
    │   ├── Free.jsx
    │   ├── SmartChain.jsx
    │   ├── ChainInsertion.jsx     # ⭐
    │   ├── UndoHelper.jsx         # ⭐
    │   ├── PreyControls.jsx
    │   ├── Anchor.jsx
    │   └── LayerInspector.jsx
    └── effects/
        └── EffectsManager.jsx
```

### ترتيب تحميل Scripts

```html
<!-- Core -->
<script src="js/lib/CSInterface.js"></script>
<script src="js/core/state-manager.js"></script>
<script src="js/core/status-bar.js"></script>
<script src="js/core/modal.js"></script>
<script src="js/core/context-menu.js"></script>
<script src="js/core/host-service.js"></script>

<!-- Centralized Systems -->
<script src="js/core/ae-selection-sync.js"></script>
<script src="js/core/undo-manager.js"></script>
<script src="js/core/selection-watcher.js"></script>

<!-- Controllers -->
<script src="js/controllers/bolas-grid.js"></script>
<script src="js/controllers/hunter-bar.js"></script>
<script src="js/controllers/chain-controls.js"></script>
<script src="js/controllers/smart-chain-controls.js"></script>
<script src="js/controllers/options-controller.js"></script>
<script src="js/controllers/keyboard-handler.js"></script>

<!-- Main -->
<script src="js/main.js"></script>
```

---

## ⌨️ اختصارات لوحة المفاتيح

| الاختصار | الوظيفة |
|----------|---------|
| `Ctrl+Z` | تراجع (Undo) |
| `Ctrl+Y` | إعادة (Redo) |
| `Ctrl+Shift+Z` | إعادة (Redo) بديل |
| `Escape` | إغلاق القائمة/النافذة |
| `↑` `↓` | التنقل في القائمة |
| `Enter` | تنفيذ العنصر المحدد |

---

## 🔌 Host Service API

### Selection & Layers

```javascript
HostService.getAllLayers()
HostService.getSelectedLayers()
HostService.selectLayerByIndex(index)
HostService.getSelectionState()  // للـ AESelectionSync
```

### Chain Operations

```javascript
HostService.createChainFromSelected(options)
HostService.freeSelected()
HostService.getChainInfo(layerIndex)
HostService.getChainInfoForSelected()
HostService.selectChain(layerIndex)
```

### Smart Chain Operations

```javascript
HostService.getAvailableOperations(layerIndex)
HostService.unchainCutAfter(layerIndex)
HostService.unchainBypass(layerIndex)
HostService.unchainSplit(layerIndex)
HostService.deleteReconnect(layerIndex)
HostService.deleteFree(layerIndex)
HostService.deleteCascade(layerIndex)
HostService.deletePromote(layerIndex)
```

### Chain Insertion

```javascript
HostService.canInsertInChain(newIndex, targetIndex, position)
HostService.insertAfter(targetIndex, newIndex, options)
HostService.insertBefore(targetIndex, newIndex, options)
HostService.swapLayers(indexA, indexB)
```

### Undo System

```javascript
HostService.captureLayerStates(layerIndices)
HostService.restoreLayerStates(statesData)
HostService.validateLayersExist(layerIndices)
```

### Controls

```javascript
HostService.getLayerControls(layerIndex)
HostService.updateLayerControl(layerIndex, controlName, value)
HostService.setQuickAnchor(anchorNum)
HostService.updateSnagPoint(value)
HostService.updatePreyAnchor(value)
HostService.toggleLockOrientation()
HostService.updatePositionDelay(value)
HostService.updateRotationDelay(value)
```

---

## 📊 أنواع الطبقات في السلسلة

| النوع | الوصف | له Leader؟ | له Followers؟ |
|-------|-------|-----------|--------------|
| **Hunter** | قائد رئيسي | ❌ | ✅ |
| **Hunter-Prey** | قائد وتابع | ✅ | ✅ |
| **Prey** | تابع نهائي | ✅ | ❌ |
| **Clean** | غير مرتبط | ❌ | ❌ |

---

## 🔄 سير العمل النموذجي

### إنشاء سلسلة جديدة

1. حدد الطبقات في Timeline (2+)
2. اختر Hunter من القائمة
3. حدد نقاط الربط في Setup
4. اضغط **Snag**
5. انتقل لتبويب Chain لرؤية السلسلة

### إدراج طبقة في سلسلة

1. حدد طبقة حرة في AE
2. انقر على مؤشر Pin لتثبيتها
3. انقر بالزر الأيمن على عنصر في السلسلة
4. اختر Insert Before أو Insert After

### التراجع عن عملية

1. اضغط `Ctrl+Z` أو زر Undo
2. للإعادة: `Ctrl+Y` أو زر Redo

---

## 📎 المرفقات

- **SMART_CHAIN_OPERATIONS.md**: عمليات القطع والحذف المتقدمة
- **AE_SELECTION_SYNC_PLAN.md**: خطة نظام مراقبة التحديد
