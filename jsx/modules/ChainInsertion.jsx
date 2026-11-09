/**
 * BolasPro Chain Insertion Module
 * عمليات إدراج العناصر مع قانون التفرع
 * 
 * قانون التفرع:
 * ✅ Hunter يمكنه امتلاك عدة فروع
 * ❌ Prey/Hunter-Prey لا يمكنهم التفرع
 */
var ChainInsertion = {
    
    // ═══════════════════════════════════════════════════════════════
    // VALIDATION WITH BRANCH LAW
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * التحقق من أن الطبقة حرة
     */
    isLayerFree: function(layer) {
        var hunterId = Effects.getSliderValue(layer, Config.EFFECTS.ID);
        if (hunterId && hunterId > 0) return false;
        
        var targetId = Effects.getSliderValue(layer, Config.EFFECTS.TARGET_ID);
        if (targetId && targetId > 0) return false;
        
        return true;
    },
    
    /**
     * التحقق من قانون التفرع
     * Hunter فقط يمكنه امتلاك عدة تابعين
     */
    canBranchFrom: function(layer) {
        // Hunter يمكنه دائماً التفرع
        if (Chain.isHunter(layer)) {
            return { allowed: true, isHunter: true };
        }
        
        // غير Hunter: فقط إذا لم يكن له تابع
        if (Chain.hasFollowers(layer)) {
            return { 
                allowed: false, 
                error: "Cannot branch from non-Hunter. Only Hunter can have multiple branches."
            };
        }
        
        return { allowed: true, isHunter: false };
    },
    
    /**
     * التحقق الشامل قبل الإدراج
     * ملاحظة: Insert After يعمل للجميع الآن
     */
    canInsert: function(newLayerIndex, targetIndex, position) {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            return { valid: false, error: "No active composition" };
        }
        
        var newLayer = comp.layer(newLayerIndex);
        var targetLayer = comp.layer(targetIndex);
        
        if (!newLayer) return { valid: false, error: "New layer not found" };
        if (!targetLayer) return { valid: false, error: "Target layer not found" };
        
        // التحقق من أن الطبقة حرة
        if (!this.isLayerFree(newLayer)) {
            return { valid: false, error: "Layer is already in a chain. Free it first." };
        }
        
        // تحذير 2D/3D
        var warning = null;
        if (newLayer.threeDLayer !== targetLayer.threeDLayer) {
            warning = "2D/3D mismatch. Results may vary.";
        }
        
        return { 
            valid: true, 
            warning: warning,
            newLayer: newLayer,
            targetLayer: targetLayer,
            createsBranch: position === 'after' && Chain.isHunter(targetLayer) && !Chain.hasFollowers(targetLayer)
        };
    },
    
    // ═══════════════════════════════════════════════════════════════
    // INSERT OPERATIONS
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * إدراج طبقة بعد عنصر محدد
     * - إذا كان للعنصر تابع: يتم إدراج الطبقة الجديدة بينهما
     * - إذا لم يكن له تابع: يتم إضافة الطبقة الجديدة كتابع
     */
    insertAfter: function(targetIndex, newLayerIndex, options) {
        options = options || {};
        
        var validation = this.canInsert(newLayerIndex, targetIndex, 'after');
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }
        
        var comp = app.project.activeItem;
        var targetLayer = validation.targetLayer;
        var newLayer = validation.newLayer;
        
        var settings = options.settings || Chain.getLayerSettings(targetLayer);
        if (!settings.snagPoint) settings.snagPoint = 5;
        if (!settings.preyAnchor) settings.preyAnchor = 5;
        
        // الحصول على التابع الحالي (إن وجد)
        var currentFollower = Chain.getDirectFollower(targetLayer);
        
        app.beginUndoGroup(Config.NAME + ": Insert After");
        
        try {
            // إذا كان هناك تابع، نفك ربطه أولاً
            if (currentFollower) {
                var followerSettings = Chain.getLayerSettings(currentFollower);
                
                // حفظ ID الـ follower إذا كان لديه تابعين (للحفاظ على السلسلة)
                var followerHasId = Effects.has(currentFollower, Config.EFFECTS.ID);
                var followerId = followerHasId ? Effects.getSliderValue(currentFollower, Config.EFFECTS.ID) : null;
                
                // فك ربط التابع فقط من قائده (بدون إزالة ID)
                this._unlinkFromLeader(currentFollower);
                
                // ربط الطبقة الجديدة بالـ target
                Snag._executeInternal(
                    comp, targetLayer, newLayer,
                    settings.snagPoint,
                    settings.preyAnchor,
                    settings.lockOrientation || false
                );
                
                // ربط التابع القديم بالطبقة الجديدة
                Snag._executeInternal(
                    comp, newLayer, currentFollower,
                    followerSettings.snagPoint || 5,
                    followerSettings.preyAnchor || 5,
                    followerSettings.lockOrientation || false
                );
                
                // استعادة ID إذا كان موجوداً (للحفاظ على تابعيه)
                if (followerHasId && followerId) {
                    // التأكد من أن ID موجود (قد يكون تم إضافته بواسطة Snag)
                    if (!Effects.has(currentFollower, Config.EFFECTS.ID)) {
                        Effects.addSlider(currentFollower, Config.EFFECTS.ID, followerId);
                    }
                }
            } else {
                // لا يوجد تابع، ربط مباشر
                Snag._executeInternal(
                    comp, targetLayer, newLayer,
                    settings.snagPoint,
                    settings.preyAnchor,
                    settings.lockOrientation || false
                );
            }
            
            app.endUndoGroup();
            Cache.clear();
            ChainRegistry.invalidateCache();
            
            var message = currentFollower 
                ? newLayer.name + " inserted between " + targetLayer.name + " and " + currentFollower.name
                : newLayer.name + " inserted after " + targetLayer.name;
            
            return { 
                success: true, 
                message: message,
                warning: validation.warning
            };
        } catch(e) {
            app.endUndoGroup();
            return { success: false, error: e.toString() };
        }
    },
    
    /**
     * فك ربط طبقة من قائدها فقط (بدون إزالة ID)
     * يحافظ على الرابط مع التابعين
     * يستخدم ControllerManager للتنظيف الموحد
     */
    _unlinkFromLeader: function(layer) {
        // استخدام ControllerManager مع وضع unlink
        // هذا يزيل prey_full ويحافظ على ID
        ControllerManager.cleanup(layer, 'unlink');
    },
    
    /**
     * إدراج طبقة قبل عنصر محدد
     */
    insertBefore: function(targetIndex, newLayerIndex, options) {
        options = options || {};
        
        var validation = this.canInsert(newLayerIndex, targetIndex, 'before');
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }
        
        var comp = app.project.activeItem;
        var targetLayer = validation.targetLayer;
        var newLayer = validation.newLayer;
        
        var currentLeader = Chain.getLeader(targetLayer);
        var isTargetHunter = (currentLeader === null && Chain.isHunter(targetLayer));
        var settings = options.settings || Chain.getLayerSettings(targetLayer);
        
        app.beginUndoGroup(Config.NAME + ": Insert Before");
        
        try {
            if (isTargetHunter) {
                // الطبقة الجديدة تصبح Hunter
                Snag.tagHunter(newLayer);
                
                // حفظ الفروع
                var branches = Chain.getDirectFollowers(targetLayer);
                
                // إزالة Hunter ID من target
                Effects.remove(targetLayer, Config.EFFECTS.ID);
                
                // فك ربط الفروع (فقط TARGET_ID)
                for (var i = 0; i < branches.length; i++) {
                    this._unlinkFromLeader(branches[i]);
                }
                
                // ربط Hunter القديم بالجديد
                Snag._executeInternal(
                    comp, newLayer, targetLayer,
                    settings.snagPoint || 5,
                    settings.preyAnchor || 5,
                    settings.lockOrientation || false
                );
                
                // إعادة ربط الفروع بـ Hunter القديم
                for (var j = 0; j < branches.length; j++) {
                    var branchSettings = Chain.getLayerSettings(branches[j]);
                    Snag._executeInternal(
                        comp, targetLayer, branches[j],
                        branchSettings.snagPoint || 5,
                        branchSettings.preyAnchor || 5,
                        branchSettings.lockOrientation || false
                    );
                }
            } else {
                // الحالة العادية
                if (currentLeader) {
                    // حفظ ID الـ target إذا كان لديه تابعين
                    var targetHasFollowers = Chain.hasFollowers(targetLayer);
                    var targetId = targetHasFollowers ? Effects.getSliderValue(targetLayer, Config.EFFECTS.ID) : null;
                    
                    this._unlinkFromLeader(targetLayer);
                    
                    Snag._executeInternal(
                        comp, currentLeader, newLayer,
                        settings.snagPoint || 5,
                        settings.preyAnchor || 5,
                        settings.lockOrientation || false
                    );
                    
                    // استعادة ID إذا كان موجوداً
                    if (targetHasFollowers && targetId && !Effects.has(targetLayer, Config.EFFECTS.ID)) {
                        Effects.addSlider(targetLayer, Config.EFFECTS.ID, targetId);
                    }
                }
                
                Snag._executeInternal(
                    comp, newLayer, targetLayer,
                    settings.snagPoint || 5,
                    settings.preyAnchor || 5,
                    settings.lockOrientation || false
                );
            }
            
            app.endUndoGroup();
            Cache.clear();
            ChainRegistry.invalidateCache();
            
            return { 
                success: true, 
                message: newLayer.name + " inserted before " + targetLayer.name,
                warning: validation.warning
            };
        } catch(e) {
            app.endUndoGroup();
            return { success: false, error: e.toString() };
        }
    },
    
    /**
     * إضافة طبقة في نهاية فرع محدد
     */
    appendToBranch: function(hunterIndex, branchIndex, newLayerIndex, options) {
        var comp = app.project.activeItem;
        var hunterLayer = comp.layer(hunterIndex);
        
        var branches = Chain.getDirectFollowers(hunterLayer);
        if (branchIndex >= branches.length) {
            return { success: false, error: "Branch not found" };
        }
        
        var branchFirst = branches[branchIndex];
        var lastElement = Chain.getLastElement(branchFirst);
        
        return this.insertAfter(lastElement.index, newLayerIndex, options);
    },
    
    /**
     * إنشاء فرع جديد من Hunter
     */
    addBranch: function(hunterIndex, newLayerIndex, options) {
        var comp = app.project.activeItem;
        var hunterLayer = comp.layer(hunterIndex);
        
        if (!Chain.isHunter(hunterLayer)) {
            return { success: false, error: "Target is not a Hunter" };
        }
        
        return this.insertAfter(hunterIndex, newLayerIndex, options);
    },
    
    /**
     * تبديل أماكن طبقتين في السلسلة
     * يعمل مع أي طبقتين (Hunter, Prey, Hunter-Prey)
     * يستخدم ControllerManager لضمان عدم تراكم المتحكمات
     * 
     * الترتيب الصحيح للعمليات:
     * 1. تحليل وحفظ جميع البيانات
     * 2. تنظيف جميع الطبقات
     * 3. إضافة IDs أولاً
     * 4. ربط التابعين المباشرين (قبل ربط الطبقات الرئيسية)
     * 5. ربط الطبقات الرئيسية بقادتها الجدد
     */
    swapLayers: function(layerAIndex, layerBIndex) {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            return { success: false, error: "No active composition" };
        }
        
        var layerA = comp.layer(layerAIndex);
        var layerB = comp.layer(layerBIndex);
        
        if (!layerA || !layerB) {
            return { success: false, error: "Layer not found" };
        }
        
        app.beginUndoGroup(Config.NAME + ": Swap Layers");
        
        try {
            // CRITICAL: Clear cache for all involved layers first
            ControllerManager.clearLayerCache(layerA);
            ControllerManager.clearLayerCache(layerB);
            
            // 1. تحليل شامل باستخدام SensorSystem
            var scanA = SensorSystem.scanLayer(layerA);
            var scanB = SensorSystem.scanLayer(layerB);
            
            // حفظ الإعدادات
            var settingsA = scanA.controllers.values;
            var settingsB = scanB.controllers.values;
            
            // حفظ القادة
            var leaderA = scanA.relationships.hasLeader ? comp.layer(scanA.relationships.leaderIndex) : null;
            var leaderB = scanB.relationships.hasLeader ? comp.layer(scanB.relationships.leaderIndex) : null;
            
            // حفظ التابعين
            var followersA = Chain.getDirectFollowers(layerA);
            var followersB = Chain.getDirectFollowers(layerB);
            
            // Clear cache for followers too
            for (var f = 0; f < followersA.length; f++) {
                ControllerManager.clearLayerCache(followersA[f]);
            }
            for (var g = 0; g < followersB.length; g++) {
                ControllerManager.clearLayerCache(followersB[g]);
            }
            
            var isAHunter = scanA.state === 'hunter' || (scanA.state === 'hunter-prey' && !leaderA);
            var isBHunter = scanB.state === 'hunter' || (scanB.state === 'hunter-prey' && !leaderB);
            
            // حفظ IDs
            var idA = settingsA.ID;
            var idB = settingsB.ID;
            
            // حفظ إعدادات التابعين مع IDs الخاصة بهم (إذا كانوا Hunter-Prey)
            var followersASettings = [];
            var followersBSettings = [];
            var followersAIds = [];
            var followersBIds = [];
            
            for (var i = 0; i < followersA.length; i++) {
                var fScan = SensorSystem.scanLayer(followersA[i]);
                followersASettings.push(fScan.controllers.values);
                followersAIds.push(fScan.controllers.values.ID || null);
            }
            for (var j = 0; j < followersB.length; j++) {
                var fScan2 = SensorSystem.scanLayer(followersB[j]);
                followersBSettings.push(fScan2.controllers.values);
                followersBIds.push(fScan2.controllers.values.ID || null);
            }
            
            $.writeln("[Swap] === Analysis ===");
            $.writeln("[Swap] A: " + layerA.name + " (isHunter: " + isAHunter + ", ID: " + idA + ")");
            $.writeln("[Swap] B: " + layerB.name + " (isHunter: " + isBHunter + ", ID: " + idB + ")");
            $.writeln("[Swap] leaderA: " + (leaderA ? leaderA.name : "null"));
            $.writeln("[Swap] leaderB: " + (leaderB ? leaderB.name : "null"));
            $.writeln("[Swap] followersA: " + followersA.length + ", followersB: " + followersB.length);
            
            // 2. تنظيف كامل للطبقتين أولاً (إزالة كل شيء)
            ControllerManager.cleanup(layerA, 'full');
            ControllerManager.cleanup(layerB, 'full');
            
            // تنظيف التابعين
            for (var k = 0; k < followersA.length; k++) {
                ControllerManager.cleanup(followersA[k], 'full');
            }
            for (var m = 0; m < followersB.length; m++) {
                ControllerManager.cleanup(followersB[m], 'full');
            }
            
            // ═══════════════════════════════════════════════════════════════
            // 3. إعادة البناء - الترتيب مهم جداً!
            // ═══════════════════════════════════════════════════════════════
            
            $.writeln("[Swap] === Rebuilding connections ===");
            
            // الخطوة 1: إعداد الـ IDs أولاً
            // B يأخذ مكان A - إضافة ID إذا لزم الأمر
            if (followersA.length > 0 || isAHunter) {
                var newIdForB = idA || Utils.generateId();
                $.writeln("[Swap] Step 1a: Adding ID to B: " + newIdForB);
                ControllerManager.addController(layerB, 'ID', newIdForB);
            }
            
            // A يأخذ مكان B - إضافة ID إذا لزم الأمر
            if (followersB.length > 0 || isBHunter) {
                var newIdForA = idB || Utils.generateId();
                $.writeln("[Swap] Step 1b: Adding ID to A: " + newIdForA);
                ControllerManager.addController(layerA, 'ID', newIdForA);
            }
            
            // الخطوة 2: ربط التابعين المباشرين أولاً (قبل ربط الطبقات الرئيسية)
            // هذا مهم لأن leaderB قد يكون من followersA!
            
            // ربط تابعي A بـ B (لأن B أخذ مكان A)
            ControllerManager.clearLayerCache(layerB);
            var newBId = Effects.getSliderValue(layerB, Config.EFFECTS.ID);
            $.writeln("[Swap] Step 2a: newBId for followersA: " + newBId);
            
            for (var p = 0; p < followersA.length; p++) {
                var fSettings = followersASettings[p];
                $.writeln("[Swap] Linking followerA[" + p + "] (" + followersA[p].name + ") to B with targetId: " + newBId);
                ControllerManager.applyPreset(followersA[p], 'prey', {
                    targetId: newBId,
                    hunter: layerB,
                    lockOrientation: fSettings.LOCK_ORIENTATION || false,
                    values: {
                        SNAG_POINT: fSettings.SNAG_POINT || 5,
                        PREY_ANCHOR: fSettings.PREY_ANCHOR || 5,
                        OFFSET_X: fSettings.OFFSET_X || 0,
                        OFFSET_Y: fSettings.OFFSET_Y || 0,
                        OFFSET_Z: fSettings.OFFSET_Z || 0,
                        POSITION_DELAY: fSettings.POSITION_DELAY || 0,
                        ROTATION_DELAY: fSettings.ROTATION_DELAY || 0
                    }
                });
                // استعادة ID إذا كان التابع Hunter-Prey
                if (followersAIds[p]) {
                    ControllerManager.addController(followersA[p], 'ID', followersAIds[p]);
                }
            }
            
            // ربط تابعي B بـ A (لأن A أخذ مكان B)
            ControllerManager.clearLayerCache(layerA);
            var newAId = Effects.getSliderValue(layerA, Config.EFFECTS.ID);
            $.writeln("[Swap] Step 2b: newAId for followersB: " + newAId);
            
            for (var q = 0; q < followersB.length; q++) {
                var fSettings2 = followersBSettings[q];
                $.writeln("[Swap] Linking followerB[" + q + "] (" + followersB[q].name + ") to A with targetId: " + newAId);
                ControllerManager.applyPreset(followersB[q], 'prey', {
                    targetId: newAId,
                    hunter: layerA,
                    lockOrientation: fSettings2.LOCK_ORIENTATION || false,
                    values: {
                        SNAG_POINT: fSettings2.SNAG_POINT || 5,
                        PREY_ANCHOR: fSettings2.PREY_ANCHOR || 5,
                        OFFSET_X: fSettings2.OFFSET_X || 0,
                        OFFSET_Y: fSettings2.OFFSET_Y || 0,
                        OFFSET_Z: fSettings2.OFFSET_Z || 0,
                        POSITION_DELAY: fSettings2.POSITION_DELAY || 0,
                        ROTATION_DELAY: fSettings2.ROTATION_DELAY || 0
                    }
                });
                // استعادة ID إذا كان التابع Hunter-Prey
                if (followersBIds[q]) {
                    ControllerManager.addController(followersB[q], 'ID', followersBIds[q]);
                }
            }
            
            // الخطوة 3: ربط الطبقات الرئيسية بقادتها الجدد
            // الآن بعد أن تم تحديث التابعين، يمكننا قراءة IDs الصحيحة
            
            // A يأخذ مكان B - يرتبط بـ leaderB
            if (leaderB) {
                // تنظيف cache وقراءة ID الجديد لـ leaderB
                ControllerManager.clearLayerCache(leaderB);
                var leaderBId = Effects.getSliderValue(leaderB, Config.EFFECTS.ID);
                $.writeln("[Swap] Step 3a: Linking A to leaderB (" + leaderB.name + ") with ID: " + leaderBId);
                ControllerManager.applyPreset(layerA, 'prey', {
                    targetId: leaderBId,
                    hunter: leaderB,
                    lockOrientation: settingsB.LOCK_ORIENTATION || false,
                    values: {
                        SNAG_POINT: settingsB.SNAG_POINT || 5,
                        PREY_ANCHOR: settingsB.PREY_ANCHOR || 5,
                        OFFSET_X: settingsB.OFFSET_X || 0,
                        OFFSET_Y: settingsB.OFFSET_Y || 0,
                        OFFSET_Z: settingsB.OFFSET_Z || 0,
                        POSITION_DELAY: settingsB.POSITION_DELAY || 0,
                        ROTATION_DELAY: settingsB.ROTATION_DELAY || 0
                    }
                });
            }
            
            // B يأخذ مكان A - يرتبط بـ leaderA
            if (leaderA) {
                // تنظيف cache وقراءة ID الجديد لـ leaderA
                ControllerManager.clearLayerCache(leaderA);
                var leaderAId = Effects.getSliderValue(leaderA, Config.EFFECTS.ID);
                $.writeln("[Swap] Step 3b: Linking B to leaderA (" + leaderA.name + ") with ID: " + leaderAId);
                ControllerManager.applyPreset(layerB, 'prey', {
                    targetId: leaderAId,
                    hunter: leaderA,
                    lockOrientation: settingsA.LOCK_ORIENTATION || false,
                    values: {
                        SNAG_POINT: settingsA.SNAG_POINT || 5,
                        PREY_ANCHOR: settingsA.PREY_ANCHOR || 5,
                        OFFSET_X: settingsA.OFFSET_X || 0,
                        OFFSET_Y: settingsA.OFFSET_Y || 0,
                        OFFSET_Z: settingsA.OFFSET_Z || 0,
                        POSITION_DELAY: settingsA.POSITION_DELAY || 0,
                        ROTATION_DELAY: settingsA.ROTATION_DELAY || 0
                    }
                });
            }
            
            // 4. التحقق من صحة السلسلة باستخدام ChainRegistry
            ChainRegistry.invalidateCache();
            
            $.writeln("[Swap] === Validating chain integrity ===");
            var validationA = ChainRegistry.validateChain(layerA);
            var validationB = ChainRegistry.validateChain(layerB);
            
            $.writeln("[Swap] LayerA validation: " + (validationA.valid ? "VALID" : "INVALID"));
            $.writeln("[Swap] LayerB validation: " + (validationB.valid ? "VALID" : "INVALID"));
            
            if (!validationA.valid) {
                for (var vi = 0; vi < validationA.issues.length; vi++) {
                    $.writeln("[Swap] Issue A: " + validationA.issues[vi].message);
                }
            }
            if (!validationB.valid) {
                for (var vj = 0; vj < validationB.issues.length; vj++) {
                    $.writeln("[Swap] Issue B: " + validationB.issues[vj].message);
                }
            }
            
            // عرض السلسلة النهائية
            $.writeln("[Swap] Final chain A: " + ChainRegistry.getChainVisualization(layerA));
            $.writeln("[Swap] Final chain B: " + ChainRegistry.getChainVisualization(layerB));
            
            app.endUndoGroup();
            Cache.clear();
            ChainRegistry.invalidateCache();
            
            return { 
                success: true, 
                message: layerA.name + " ↔ " + layerB.name + " swapped",
                chainA: ChainRegistry.getChainVisualization(layerA),
                chainB: ChainRegistry.getChainVisualization(layerB)
            };
        } catch(e) {
            app.endUndoGroup();
            return { success: false, error: e.toString() };
        }
    }
};