/**
 * BolasPro v4.0 - Free Module
 * Releases layers from snag relationships
 * Updated to use ControllerManager for consistent cleanup
 */

var Free = {
    /**
     * Bake expressions to values
     * Now delegates to ExpressionEngine
     */
    bakeExpressions: function(layer) {
        ExpressionEngine.bakeAll(layer);
    },
    
    /**
     * Free a single layer
     * Uses ControllerManager for consistent cleanup
     */
    freeLayer: function(layer) {
        ControllerManager.cleanup(layer, 'full');
    },
    
    /**
     * Internal free execution (no Undo group)
     */
    _executeInternal: function(layer) {
        var comp = layer.containingComp;
        var scan = SensorSystem.quickScan(layer);
        
        if (scan.hasId) {
            // Hunter or Hunter-Prey: free all followers first
            var attached = Detector.findAttachedLayers(layer, comp);
            for (var i = 0; i < attached.length; i++) {
                ControllerManager.cleanup(attached[i], 'full');
            }
            ControllerManager.cleanup(layer, 'full');
        } else if (scan.hasTargetId) {
            // Prey only
            ControllerManager.cleanup(layer, 'full');
        }
        
        return true;
    },
    
    /**
     * Execute free operation
     */
    execute: function(layerIndex) {
        var comp = app.project.activeItem;
        
        var compCheck = Validator.comp(comp);
        if (!compCheck.valid) return { success: false, error: compCheck.error };
        
        var layer = comp.layer(layerIndex);
        if (!layer) {
            return { success: false, error: "Invalid layer index" };
        }
        
        var validation = Validator.layer(layer, "Free");
        if (!validation.valid) return { success: false, error: validation.error };
        
        var state = Detector.getState(layer);
        if (state.isClean) {
            return { success: false, error: "Layer is not part of BolasPro system" };
        }
        
        app.beginUndoGroup(Config.NAME + ": Free");
        
        try {
            var attached = [];
            if (state.isHunter) {
                attached = Detector.findAttachedLayers(layer, comp);
            }
            
            this._executeInternal(layer);
            Cache.clear();
            ChainRegistry.invalidateCache();
            
            app.endUndoGroup();
            
            if (state.isHunter) {
                return { success: true, message: "Freed Hunter + " + attached.length + " attached layer(s)" };
            } else {
                return { success: true, message: "Freed Prey layer" };
            }
            
        } catch(e) {
            app.endUndoGroup();
            return { success: false, error: e.toString() };
        }
    },
    
    /**
     * Free selected layers
     */
    executeSelected: function() {
        var comp = app.project.activeItem;
        
        var validation = Validator.hasSelection(comp);
        if (!validation.valid) return { success: false, error: validation.error };
        
        app.beginUndoGroup(Config.NAME + ": Free Selected");
        
        try {
            var freedCount = 0;
            var layers = comp.selectedLayers.slice();
            
            for (var i = 0; i < layers.length; i++) {
                var state = Detector.getState(layers[i]);
                if (!state.isClean) {
                    this._executeInternal(layers[i]);
                    freedCount++;
                }
            }
            
            Cache.clear();
            ChainRegistry.invalidateCache();
            app.endUndoGroup();
            
            return { success: true, message: "Freed " + freedCount + " layer(s)" };
            
        } catch(e) {
            app.endUndoGroup();
            return { success: false, error: e.toString() };
        }
    }
};
