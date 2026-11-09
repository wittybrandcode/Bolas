/**
 * BolasPro v4.0 - Chain Module
 * Creates and manages chains of linked layers
 */

var Chain = {
    // ═══════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Create chain from current selection (main entry point from UI)
     * Handles sorting, hunter selection, and delegates to create()
     * 
     * Order logic (corrected):
     * - 'asc' (Ascending/صعوداً): Chain goes UP - top layer is Hunter, links go down
     *   Timeline visual: Hunter(top) → Prey1 → Prey2 → Prey3(bottom)
     *   Sort: smallest index first (top layer first)
     * 
     * - 'desc' (Descending/نزولاً): Chain goes DOWN - bottom layer is Hunter, links go up
     *   Timeline visual: Prey3(top) ← Prey2 ← Prey1 ← Hunter(bottom)
     *   Sort: largest index first (bottom layer first)
     */
    createFromSelection: function(options) {
        var comp = app.project.activeItem;
        
        // Validation
        if (!Utils.isComp(comp)) {
            return { success: false, error: "No composition selected" };
        }
        if (comp.selectedLayers.length < 2) {
            return { success: false, error: "Select at least 2 layers" };
        }
        
        // Build layer indices array
        var hunterIdx = parseInt(options.hunterIndex, 10) || 0;
        var selectedIndices = [];
        
        $.writeln("[Chain] hunterIndex from options: " + options.hunterIndex + " -> parsed: " + hunterIdx);
        $.writeln("[Chain] order from options: " + options.order);
        
        for (var i = 0; i < comp.selectedLayers.length; i++) {
            selectedIndices.push(comp.selectedLayers[i].index);
        }
        
        $.writeln("[Chain] Selected indices (raw): " + selectedIndices.join(", "));
        
        // Build final chain order
        var chainOrder = [];
        
        if (hunterIdx > 0) {
            // Manual hunter selection from dropdown
            // Separate hunter from prey
            var hunterInSelection = false;
            var preyIndices = [];
            
            for (var k = 0; k < selectedIndices.length; k++) {
                if (selectedIndices[k] === hunterIdx) {
                    hunterInSelection = true;
                } else {
                    preyIndices.push(selectedIndices[k]);
                }
            }
            
            // Sort prey indices based on order preference
            // In AE Timeline: lower index = higher position (top), higher index = lower position (bottom)
            if (options.order === 'asc') {
                // Ascending (صعوداً): Hunter at top, prey sorted top to bottom
                // Sort prey: small index first (top layers first, then lower)
                preyIndices.sort(function(a, b) { return a - b; });
            } else {
                // Descending (نزولاً): Hunter at bottom, prey sorted bottom to top
                // Sort prey: large index first (bottom layers first, then higher)
                preyIndices.sort(function(a, b) { return b - a; });
            }
            
            $.writeln("[Chain] Prey indices after sort (" + options.order + "): " + preyIndices.join(", "));
            
            if (hunterInSelection) {
                // Hunter first, then sorted prey
                chainOrder.push(hunterIdx);
                for (var j = 0; j < preyIndices.length; j++) {
                    chainOrder.push(preyIndices[j]);
                }
                $.writeln("[Chain] Manual hunter " + hunterIdx + " applied");
            } else {
                // Hunter not in selection - sort all and use first as hunter
                if (options.order === 'asc') {
                    selectedIndices.sort(function(a, b) { return a - b; });
                } else {
                    selectedIndices.sort(function(a, b) { return b - a; });
                }
                chainOrder = selectedIndices;
                $.writeln("[Chain] Hunter " + hunterIdx + " not in selection, using sorted order");
            }
        } else {
            // No manual hunter - sort all, first becomes Hunter
            if (options.order === 'asc') {
                // Ascending (صعوداً): Top layer becomes Hunter (smallest index first)
                selectedIndices.sort(function(a, b) { return a - b; });
            } else {
                // Descending (نزولاً): Bottom layer becomes Hunter (largest index first)
                selectedIndices.sort(function(a, b) { return b - a; });
            }
            chainOrder = selectedIndices;
            $.writeln("[Chain] No manual hunter, using sorted order");
        }
        
        $.writeln("[Chain] Final chain: " + chainOrder.join(" → "));
        
        // Delegate to create()
        return this.create({
            layerIndices: chainOrder,
            snagPoint: options.snagPoint || 5,
            preyAnchor: options.preyAnchor || 5,
            lockOrientation: options.lockOrientation || false,
            maintainOffset: options.maintainOffset || false
        });
    },
    /**
     * Create chain from layer indices
     */
    create: function(options) {
        var comp = app.project.activeItem;
        
        var compCheck = Validator.comp(comp);
        if (!compCheck.valid) return { success: false, error: compCheck.error };
        
        var indices = options.layerIndices || [];
        if (indices.length < 2) {
            return { success: false, error: "Select 2+ layers to chain" };
        }
        
        // Get layers
        var layers = [];
        for (var i = 0; i < indices.length; i++) {
            var layer = comp.layer(indices[i]);
            if (!layer) {
                return { success: false, error: "Invalid layer index: " + indices[i] };
            }
            layers.push(layer);
        }
        
        // Check for cycles
        for (var j = 1; j < layers.length; j++) {
            if (Detector.detectCycle(layers[j-1], layers[j])) {
                return { success: false, error: "Would create circular reference" };
            }
        }
        
        app.beginUndoGroup(Config.NAME + ": Chain " + layers.length + " layers");
        
        try {
            var snagPoint = options.snagPoint || 5;
            var preyAnchor = options.preyAnchor || 5;
            var lockOrientation = options.lockOrientation || false;
            var maintainOffset = options.maintainOffset || false;
            
            for (var k = 1; k < layers.length; k++) {
                var leader = layers[k - 1];
                var follower = layers[k];
                
                var offset = null;
                if (maintainOffset) {
                    offset = this._calculateOffset(leader, follower);
                }
                
                Snag._executeInternal(comp, leader, follower, snagPoint, preyAnchor, lockOrientation);
                
                if (offset) {
                    this._applyOffset(follower, offset);
                }
            }
            
            app.endUndoGroup();
            Cache.clear();
            
            return { success: true, chainLength: layers.length, message: "Chain created: " + layers.length + " layers" };
            
        } catch(e) {
            app.endUndoGroup();
            return { success: false, error: e.toString() };
        }
    },
    
    /**
     * Break chain at specific layer
     */
    unchain: function(layerIndex, mode) {
        var comp = app.project.activeItem;
        
        var compCheck = Validator.comp(comp);
        if (!compCheck.valid) return { success: false, error: compCheck.error };
        
        var layer = comp.layer(layerIndex);
        if (!layer) {
            return { success: false, error: "Invalid layer index" };
        }
        
        var state = Detector.getState(layer);
        if (state.isClean) {
            return { success: false, error: "Layer is not part of a chain" };
        }
        
        app.beginUndoGroup(Config.NAME + ": Break Chain (" + mode + ")");
        
        try {
            var freedCount = 0;
            
            switch(mode) {
                case "this":
                    if (Detector.isPrey(layer)) {
                        Free.freeLayer(layer);
                        freedCount++;
                    }
                    break;
                    
                case "all":
                    var chain = this.getFullChain(layer);
                    for (var j = 0; j < chain.length; j++) {
                        if (Detector.isPrey(chain[j])) {
                            Free.freeLayer(chain[j]);
                            freedCount++;
                        }
                    }
                    if (chain.length > 0 && Detector.isHunter(chain[0])) {
                        Effects.remove(chain[0], Config.EFFECTS.ID);
                    }
                    break;
                    
                case "downstream":
                    var downstream = this.getAllFollowers(layer);
                    if (Detector.isPrey(layer)) {
                        Free.freeLayer(layer);
                        freedCount++;
                    }
                    for (var m = 0; m < downstream.length; m++) {
                        if (Detector.isPrey(downstream[m])) {
                            Free.freeLayer(downstream[m]);
                            freedCount++;
                        }
                    }
                    break;
            }
            
            app.endUndoGroup();
            Cache.clear();
            
            return { success: true, freedCount: freedCount };
            
        } catch(e) {
            app.endUndoGroup();
            return { success: false, error: e.toString() };
        }
    },
    
    /**
     * Get full chain containing layer
     * يتتبع السلسلة من الـ Root حتى آخر عنصر
     */
    getFullChain: function(layer) {
        var root = this.getRoot(layer);
        var chain = [root];
        var current = root;
        var maxDepth = 100;
        var visited = {};
        
        visited[root.index] = true;
        
        while (maxDepth-- > 0) {
            var followers = this.getDirectFollowers(current);
            
            if (followers.length === 0) break;
            
            // أخذ أول تابع غير مزار
            var nextFollower = null;
            for (var i = 0; i < followers.length; i++) {
                if (!visited[followers[i].index]) {
                    nextFollower = followers[i];
                    break;
                }
            }
            
            if (!nextFollower) break;
            
            visited[nextFollower.index] = true;
            chain.push(nextFollower);
            current = nextFollower;
        }
        
        return chain;
    },
    
    /**
     * Get chain root
     */
    getRoot: function(layer) {
        var current = layer;
        var maxDepth = 100;
        
        while (maxDepth-- > 0) {
            var leader = this.getLeader(current);
            if (!leader) return current;
            current = leader;
        }
        
        return current;
    },
    
    /**
     * Get leader of a layer
     */
    getLeader: function(layer) {
        var targetId = Effects.getSliderValue(layer, Config.EFFECTS.TARGET_ID);
        if (!targetId) return null;
        
        var comp = layer.containingComp;
        for (var i = 1; i <= comp.numLayers; i++) {
            var id = Effects.getSliderValue(comp.layer(i), Config.EFFECTS.ID);
            if (id === targetId) return comp.layer(i);
        }
        
        return null;
    },
    
    /**
     * Get direct followers of a layer
     */
    getDirectFollowers: function(layer) {
        return Detector.findAttachedLayers(layer, layer.containingComp);
    },
    
    /**
     * Get all followers (recursive)
     */
    getAllFollowers: function(layer) {
        var all = [];
        var direct = this.getDirectFollowers(layer);
        
        for (var i = 0; i < direct.length; i++) {
            all.push(direct[i]);
            var sub = this.getAllFollowers(direct[i]);
            for (var j = 0; j < sub.length; j++) {
                all.push(sub[j]);
            }
        }
        
        return all;
    },
    
    /**
     * Get chain info for UI
     */
    getInfo: function(layerIndex) {
        var comp = app.project.activeItem;
        if (!Utils.isComp(comp)) return { inChain: false };
        
        var layer = comp.layer(layerIndex);
        if (!layer) return { inChain: false };
        
        var state = Detector.getState(layer);
        if (state.isClean) return { inChain: false };
        
        var chain = this.getFullChain(layer);
        var names = [];
        for (var i = 0; i < chain.length; i++) {
            names.push(Utils.truncate(chain[i].name, 12));
        }
        
        return {
            inChain: true,
            length: chain.length,
            visualization: names.join(" → "),
            position: this.getPosition(layer, chain)
        };
    },
    
    /**
     * Get detailed chain info for selected layer(s)
     * Returns full chain with member details and selection state
     */
    getChainInfoForSelected: function() {
        var comp = app.project.activeItem;
        if (!Utils.isComp(comp)) {
            return { success: false, inChain: false, error: "No composition" };
        }
        
        if (comp.selectedLayers.length === 0) {
            return { success: true, inChain: false, message: "No layer selected" };
        }
        
        // Get first selected layer
        var selectedLayer = comp.selectedLayers[0];
        var state = Detector.getState(selectedLayer);
        
        // Check if layer is part of a chain
        if (state.isClean) {
            return { 
                success: true, 
                inChain: false, 
                selectedName: selectedLayer.name,
                message: "Layer not in chain" 
            };
        }
        
        // Get full chain
        var chain = this.getFullChain(selectedLayer);
        
        // Build members array with details
        var members = [];
        var selectedIndex = -1;
        
        for (var i = 0; i < chain.length; i++) {
            var member = chain[i];
            var memberState = Detector.getState(member);
            var isSelected = (member.index === selectedLayer.index);
            
            if (isSelected) {
                selectedIndex = i;
            }
            
            members.push({
                name: member.name,
                index: member.index,
                role: (i === 0) ? "hunter" : "prey",
                isHunter: memberState.isHunter,
                isPrey: memberState.isPrey,
                isSelected: isSelected
            });
        }
        
        return {
            success: true,
            inChain: true,
            chainLength: chain.length,
            selectedIndex: selectedIndex,
            selectedRole: (selectedIndex === 0) ? "hunter" : "prey",
            members: members
        };
    },
    
    /**
     * Get position in chain
     */
    getPosition: function(layer, chain) {
        for (var i = 0; i < chain.length; i++) {
            if (chain[i].index === layer.index) return i;
        }
        return -1;
    },
    
    /**
     * Select all layers in chain
     */
    selectAll: function(layerIndex) {
        var comp = app.project.activeItem;
        if (!Utils.isComp(comp)) return { success: false, error: "No composition" };
        
        var layer = comp.layer(layerIndex);
        if (!layer) return { success: false, error: "Invalid layer" };
        
        var chain = this.getFullChain(layer);
        
        for (var i = 1; i <= comp.numLayers; i++) {
            comp.layer(i).selected = false;
        }
        
        for (var j = 0; j < chain.length; j++) {
            chain[j].selected = true;
        }
        
        return { success: true, count: chain.length };
    },
    
    // Private helpers
    _calculateOffset: function(leader, follower) {
        var time = leader.containingComp.time;
        var leaderPos = leader.position.valueAtTime(time, false);
        var followerPos = follower.position.valueAtTime(time, false);
        
        return [
            followerPos[0] - leaderPos[0],
            followerPos[1] - leaderPos[1],
            (followerPos[2] || 0) - (leaderPos[2] || 0)
        ];
    },
    
    _applyOffset: function(layer, offset) {
        var fxX = Effects.find(layer, Config.EFFECTS.OFFSET_X);
        var fxY = Effects.find(layer, Config.EFFECTS.OFFSET_Y);
        
        if (fxX) fxX.property(Config.AE.SLIDER_VAL).setValue(offset[0]);
        if (fxY) fxY.property(Config.AE.SLIDER_VAL).setValue(offset[1]);
        
        if (layer.threeDLayer) {
            var fxZ = Effects.find(layer, Config.EFFECTS.OFFSET_Z);
            if (fxZ) fxZ.property(Config.AE.SLIDER_VAL).setValue(offset[2]);
        }
    },
    
    // ═══════════════════════════════════════════════════════════════
    // BRANCH MANAGEMENT (for Chain Insertion)
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * التحقق من أن الطبقة Hunter
     */
    isHunter: function(layer) {
        var hunterId = Effects.getSliderValue(layer, Config.EFFECTS.ID);
        return hunterId && hunterId > 0;
    },
    
    /**
     * التحقق من وجود تابعين
     */
    hasFollowers: function(layer) {
        return this.getDirectFollowers(layer).length > 0;
    },
    
    /**
     * الحصول على إعدادات الطبقة
     */
    getLayerSettings: function(layer) {
        return {
            snagPoint: Effects.getSliderValue(layer, Config.EFFECTS.SNAG_POINT) || 5,
            preyAnchor: Effects.getSliderValue(layer, Config.EFFECTS.PREY_ANCHOR) || 5,
            lockOrientation: Effects.getCheckboxValue(layer, Config.EFFECTS.LOCK_ORIENTATION) || false
        };
    },
    
    /**
     * الحصول على التابع المباشر الأول
     */
    getDirectFollower: function(layer) {
        var followers = this.getDirectFollowers(layer);
        return followers.length > 0 ? followers[0] : null;
    },
    
    /**
     * الحصول على فروع Hunter
     */
    getBranches: function(hunterLayer) {
        if (!this.isHunter(hunterLayer)) {
            return [];
        }
        
        var directFollowers = this.getDirectFollowers(hunterLayer);
        var branches = [];
        
        for (var i = 0; i < directFollowers.length; i++) {
            var firstElement = directFollowers[i];
            branches.push({
                index: i,
                firstElement: firstElement,
                firstElementIndex: firstElement.index,
                name: firstElement.name,
                length: this.getBranchLength(firstElement)
            });
        }
        
        return branches;
    },
    
    /**
     * الحصول على طول الفرع
     */
    getBranchLength: function(firstElement) {
        var length = 1;
        var current = firstElement;
        var visited = {};
        
        while (true) {
            visited[current.index] = true;
            var follower = this.getDirectFollower(current);
            if (!follower || visited[follower.index]) break;
            length++;
            current = follower;
        }
        
        return length;
    },
    
    /**
     * الحصول على آخر عنصر في الفرع
     */
    getLastElement: function(startLayer) {
        var current = startLayer;
        var visited = {};
        
        while (true) {
            visited[current.index] = true;
            var follower = this.getDirectFollower(current);
            if (!follower || visited[follower.index]) return current;
            current = follower;
        }
    },
    
    /**
     * الحصول على كل عناصر الفرع
     */
    getBranchElements: function(firstElement) {
        var elements = [firstElement];
        var current = firstElement;
        var visited = {};
        
        while (true) {
            visited[current.index] = true;
            var follower = this.getDirectFollower(current);
            if (!follower || visited[follower.index]) break;
            elements.push(follower);
            current = follower;
        }
        
        return elements;
    },
    
    /**
     * حذف فرع كامل
     */
    deleteBranch: function(hunterIndex, branchIndex) {
        var comp = app.project.activeItem;
        var hunterLayer = comp.layer(hunterIndex);
        
        if (!this.isHunter(hunterLayer)) {
            return { success: false, error: "Target is not a Hunter" };
        }
        
        var branches = this.getBranches(hunterLayer);
        if (branchIndex >= branches.length) {
            return { success: false, error: "Branch not found" };
        }
        
        var branchFirst = branches[branchIndex].firstElement;
        var branchElements = this.getBranchElements(branchFirst);
        
        app.beginUndoGroup(Config.NAME + ": Delete Branch");
        
        try {
            // ترتيب حسب index (الأكبر أولاً)
            branchElements.sort(function(a, b) {
                return b.index - a.index;
            });
            
            // حذف من الأخير للأول
            for (var i = 0; i < branchElements.length; i++) {
                branchElements[i].remove();
            }
            
            app.endUndoGroup();
            Cache.clear();
            
            return { 
                success: true, 
                deletedCount: branchElements.length,
                message: "Branch deleted (" + branchElements.length + " layers)"
            };
        } catch(e) {
            app.endUndoGroup();
            return { success: false, error: e.toString() };
        }
    },
    
    /**
     * الحصول على دور الطبقة في السلسلة
     */
    getLayerRole: function(layer) {
        var state = Detector.getState(layer);
        if (state.isHunter && !state.isPrey) return 'hunter';
        if (state.isHunter && state.isPrey) return 'hunter-prey';
        if (state.isPrey) return 'prey';
        return 'free';
    }
    /**
     * Toggle visual connection guides in active composition (FEAT-04)
     */
    toggleVisualGuides: function() {
        var comp = app.project.activeItem;
        if (!Utils.isComp(comp)) {
            return { success: false, error: "No composition active" };
        }
        
        var guideName = "_BolasPro_Guides_";
        var existing = null;
        for (var i = 1; i <= comp.numLayers; i++) {
            if (comp.layer(i).name === guideName) {
                existing = comp.layer(i);
                break;
            }
        }
        
        if (existing) {
            existing.remove();
            return { success: true, enabled: false, message: "Guides removed" };
        }
        
        // Find all chains in composition
        var chains = ChainRegistry.buildAllChains(comp);
        if (!chains || chains.length === 0) {
            return { success: false, error: "No chains found in composition" };
        }
        
        app.beginUndoGroup("BolasPro: Toggle Visual Guides");
        try {
            var guideLayer = comp.layers.addShape();
            guideLayer.name = guideName;
            guideLayer.guideLayer = true;
            guideLayer.comment = "Temporary visual guides generated by BolasPro. Will not render in export.";
            guideLayer.moveToBeginning();
            
            var contents = guideLayer.property("ADBE Root Vectors Group");
            var group = contents.addProperty("ADBE Vector Group");
            group.name = "Chain Guides";
            var groupContents = group.property("ADBE Vectors Group");
            
            var stroke = groupContents.addProperty("ADBE Vector Graphic - Stroke");
            stroke.property("ADBE Vector Stroke Color").setValue([1.0, 0.73, 0.08, 1.0]); // Gold
            stroke.property("ADBE Vector Stroke Width").setValue(2);
            try {
                stroke.property("ADBE Vector Stroke Dashes").addProperty("ADBE Vector Stroke Dash 1").setValue(6);
            } catch(e) {}
            
            for (var c = 0; c < chains.length; c++) {
                var members = chains[c].members;
                for (var m = 1; m < members.length; m++) {
                    var prevMember = members[m - 1];
                    var curMember = members[m];
                    
                    var pathProp = groupContents.addProperty("ADBE Vector Shape - Group");
                    pathProp.name = prevMember.name + " -> " + curMember.name;
                    var pathObj = pathProp.property("ADBE Vector Shape");
                    
                    var expr = [
                        'try {',
                        '    var l1 = thisComp.layer(' + prevMember.index + ');',
                        '    var l2 = thisComp.layer(' + curMember.index + ');',
                        '    var p1 = fromComp(l1.toComp(l1.anchorPoint));',
                        '    var p2 = fromComp(l2.toComp(l2.anchorPoint));',
                        '    createPath([p1, p2], [], [], false);',
                        '} catch(e) {',
                        '    createPath([], [], [], false);',
                        '}'
                    ].join('\n');
                    
                    pathObj.expression = expr;
                }
            }
            
            app.endUndoGroup();
            return { success: true, enabled: true, message: "Visual guides created in composition" };
        } catch(e) {
            app.endUndoGroup();
            return { success: false, error: e.toString() };
        }
    },

};
