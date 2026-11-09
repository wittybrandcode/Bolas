/**
 * BolasPro v5.0 - Undo Helper Module
 * State capture and restoration for Undo/Redo system
 */

var UndoHelper = {
    
    // ═══════════════════════════════════════════════════════════════
    // STATE CAPTURE
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Capture full state of a single layer
     * @param {number} layerIndex - Layer index
     * @returns {Object} Layer state
     */
    captureLayerState: function(layerIndex) {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            return null;
        }
        
        if (layerIndex < 1 || layerIndex > comp.numLayers) {
            return null;
        }
        
        var layer = comp.layer(layerIndex);
        if (!layer) {
            return null;
        }
        
        // Capture BolasPro effects state
        var state = {
            index: layerIndex,
            name: layer.name,
            exists: true,
            
            // BolasPro IDs
            bolasId: Effects.getSliderValue(layer, Config.EFFECTS.ID) || null,
            targetId: Effects.getSliderValue(layer, Config.EFFECTS.TARGET_ID) || null,
            // Note: hunterId is same as bolasId (ID effect), kept for backward compatibility
            hunterId: Effects.getSliderValue(layer, Config.EFFECTS.ID) || null,
            
            // Control values
            snagPoint: Effects.getSliderValue(layer, Config.EFFECTS.SNAG_POINT) || null,
            preyAnchor: Effects.getSliderValue(layer, Config.EFFECTS.PREY_ANCHOR) || null,
            lockOrientation: Effects.getCheckboxValue(layer, Config.EFFECTS.LOCK_ORIENTATION) || false,
            
            // Delays
            positionDelay: Effects.getSliderValue(layer, Config.EFFECTS.POSITION_DELAY) || 0,
            rotationDelay: Effects.getSliderValue(layer, Config.EFFECTS.ROTATION_DELAY) || 0,
            
            // Offsets
            offsetX: Effects.getSliderValue(layer, Config.EFFECTS.OFFSET_X) || 0,
            offsetY: Effects.getSliderValue(layer, Config.EFFECTS.OFFSET_Y) || 0,
            offsetZ: layer.threeDLayer ? (Effects.getSliderValue(layer, Config.EFFECTS.OFFSET_Z) || 0) : 0,
            
            // Layer properties
            is3D: layer.threeDLayer
        };
        
        return state;
    },
    
    /**
     * Capture state of multiple layers
     * @param {Array} layerIndices - Array of layer indices
     * @returns {Object} Result with states array
     */
    captureMultipleLayerStates: function(layerIndices) {
        if (!layerIndices || layerIndices.length === 0) {
            return { success: false, error: "No layer indices provided", states: [] };
        }
        
        var states = [];
        var errors = [];
        
        for (var i = 0; i < layerIndices.length; i++) {
            var state = this.captureLayerState(layerIndices[i]);
            if (state) {
                states.push(state);
            } else {
                errors.push("Layer " + layerIndices[i] + " not found");
            }
        }
        
        return {
            success: true,
            states: states,
            errors: errors.length > 0 ? errors : null,
            capturedCount: states.length
        };
    },
    
    /**
     * Capture state of entire chain starting from a layer
     * @param {number} layerIndex - Starting layer index
     * @returns {Object} Chain state
     */
    captureChainState: function(layerIndex) {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            return { success: false, error: "No composition" };
        }
        
        var layer = comp.layer(layerIndex);
        if (!layer) {
            return { success: false, error: "Layer not found" };
        }
        
        // Get full chain
        var chain = Chain.getFullChain(layer);
        var states = [];
        
        for (var i = 0; i < chain.length; i++) {
            var state = this.captureLayerState(chain[i].index);
            if (state) {
                states.push(state);
            }
        }
        
        return {
            success: true,
            rootIndex: chain[0].index,
            members: states,
            chainLength: chain.length
        };
    },
    
    // ═══════════════════════════════════════════════════════════════
    // STATE RESTORATION
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Restore a single layer to a previous state
     * @param {Object} stateData - Layer state to restore
     * @returns {Object} Result
     */
    restoreLayerState: function(stateData) {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            return { success: false, error: "No composition" };
        }
        
        // Find layer - first try by index, then by BolasPro ID
        var layer = null;
        
        if (stateData.index >= 1 && stateData.index <= comp.numLayers) {
            layer = comp.layer(stateData.index);
            // Verify it's the same layer by name
            if (layer && layer.name !== stateData.name) {
                // Index changed, try to find by ID
                layer = this._findLayerByBolasId(comp, stateData.bolasId);
            }
        }
        
        if (!layer && stateData.bolasId) {
            layer = this._findLayerByBolasId(comp, stateData.bolasId);
        }
        
        if (!layer) {
            return { success: false, error: "Layer not found: " + stateData.name };
        }
        
        try {
            // First, completely free the layer
            Free.freeLayer(layer);
            
            // Restore based on state
            if (stateData.bolasId && !stateData.targetId) {
                // Was a Hunter (root) - restore Hunter ID
                Effects.addSlider(layer, Config.EFFECTS.ID, stateData.bolasId);
            }
            
            if (stateData.targetId) {
                // Was a Prey - find leader and re-link
                var leader = this._findLayerByBolasId(comp, stateData.targetId);
                
                if (leader) {
                    // Re-create the link
                    Snag._executeInternal(
                        comp,
                        leader,
                        layer,
                        stateData.snagPoint || 5,
                        stateData.preyAnchor || 5,
                        stateData.lockOrientation || false
                    );
                    
                    // Restore delays
                    var fxPosDelay = Effects.find(layer, Config.EFFECTS.POSITION_DELAY);
                    var fxRotDelay = Effects.find(layer, Config.EFFECTS.ROTATION_DELAY);
                    
                    if (fxPosDelay && stateData.positionDelay) {
                        fxPosDelay.property(Config.AE.SLIDER_VAL).setValue(stateData.positionDelay);
                    }
                    if (fxRotDelay && stateData.rotationDelay) {
                        fxRotDelay.property(Config.AE.SLIDER_VAL).setValue(stateData.rotationDelay);
                    }
                    
                    // Restore offsets
                    var fxOffX = Effects.find(layer, Config.EFFECTS.OFFSET_X);
                    var fxOffY = Effects.find(layer, Config.EFFECTS.OFFSET_Y);
                    
                    if (fxOffX && stateData.offsetX) {
                        fxOffX.property(Config.AE.SLIDER_VAL).setValue(stateData.offsetX);
                    }
                    if (fxOffY && stateData.offsetY) {
                        fxOffY.property(Config.AE.SLIDER_VAL).setValue(stateData.offsetY);
                    }
                    
                    if (layer.threeDLayer) {
                        var fxOffZ = Effects.find(layer, Config.EFFECTS.OFFSET_Z);
                        if (fxOffZ && stateData.offsetZ) {
                            fxOffZ.property(Config.AE.SLIDER_VAL).setValue(stateData.offsetZ);
                        }
                    }
                } else {
                    // Leader not found - layer becomes free
                    $.writeln("[UndoHelper] Leader not found for " + stateData.name);
                }
            }
            
            return { success: true, layerName: layer.name };
            
        } catch(e) {
            return { success: false, error: e.toString() };
        }
    },
    
    /**
     * Restore multiple layers to previous states
     * @param {Array} statesData - Array of layer states
     * @returns {Object} Result
     */
    restoreMultipleLayerStates: function(statesData) {
        if (!statesData || statesData.length === 0) {
            return { success: false, error: "No states to restore" };
        }
        
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            return { success: false, error: "No composition" };
        }
        
        app.beginUndoGroup(Config.NAME + ": Undo");
        
        try {
            var restored = 0;
            var errors = [];
            
            // Sort by dependency: Hunters first, then Prey
            // This ensures leaders exist before followers try to link
            var sorted = statesData.slice().sort(function(a, b) {
                // Hunters (no targetId) first
                if (!a.targetId && b.targetId) return -1;
                if (a.targetId && !b.targetId) return 1;
                return 0;
            });
            
            for (var i = 0; i < sorted.length; i++) {
                var result = this.restoreLayerState(sorted[i]);
                if (result.success) {
                    restored++;
                } else {
                    errors.push(result.error);
                }
            }
            
            app.endUndoGroup();
            Cache.clear();
            
            return {
                success: restored > 0,
                restoredCount: restored,
                totalCount: statesData.length,
                errors: errors.length > 0 ? errors : null
            };
            
        } catch(e) {
            app.endUndoGroup();
            return { success: false, error: e.toString() };
        }
    },
    
    // ═══════════════════════════════════════════════════════════════
    // VALIDATION
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Validate that a layer exists
     * @param {number} layerIndex - Layer index
     * @returns {Object} Validation result
     */
    validateLayerExists: function(layerIndex) {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            return { exists: false, error: "No composition" };
        }
        
        if (layerIndex < 1 || layerIndex > comp.numLayers) {
            return { exists: false, error: "Index out of range" };
        }
        
        var layer = comp.layer(layerIndex);
        return {
            exists: layer !== null,
            name: layer ? layer.name : null
        };
    },
    
    /**
     * Validate multiple layers exist
     * @param {Array} layerIndices - Array of layer indices
     * @returns {Object} Validation result
     */
    validateLayersExist: function(layerIndices) {
        var results = [];
        var allExist = true;
        
        for (var i = 0; i < layerIndices.length; i++) {
            var result = this.validateLayerExists(layerIndices[i]);
            results.push({
                index: layerIndices[i],
                exists: result.exists,
                name: result.name
            });
            if (!result.exists) {
                allExist = false;
            }
        }
        
        return {
            allExist: allExist,
            layers: results
        };
    },
    
    // ═══════════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Find layer by BolasPro ID
     * @param {CompItem} comp - Composition
     * @param {number} bolasId - BolasPro ID
     * @returns {Layer|null}
     */
    _findLayerByBolasId: function(comp, bolasId) {
        if (!bolasId) return null;
        
        for (var i = 1; i <= comp.numLayers; i++) {
            var id = Effects.getSliderValue(comp.layer(i), Config.EFFECTS.ID);
            if (id === bolasId) {
                return comp.layer(i);
            }
        }
        
        return null;
    }
};
