/**
 * BolasPro v4.0 - Prey Controls Module
 * Updates prey control sliders
 */

var PreyControls = {
    /**
     * Update snag point for selected prey layers
     */
    updateSnagPoint: function(value) {
        return this._update(Config.EFFECTS.SNAG_POINT, value, "Snag Point", true);
    },
    
    /**
     * Update prey anchor for selected prey layers
     */
    updatePreyAnchor: function(value) {
        return this._update(Config.EFFECTS.PREY_ANCHOR, value, "Prey Anchor", true);
    },
    
    /**
     * Update position delay for selected prey layers
     */
    updatePositionDelay: function(value) {
        return this._update(Config.EFFECTS.POSITION_DELAY, Math.max(0, value), "Position Delay", false);
    },
    
    /**
     * Update rotation delay for selected prey layers
     */
    updateRotationDelay: function(value) {
        return this._update(Config.EFFECTS.ROTATION_DELAY, Math.max(0, value), "Rotation Delay", false);
    },
    
    /**
     * Internal update function
     */
    _update: function(sliderName, value, displayName, isAnchor) {
        var comp = app.project.activeItem;
        
        var validation = Validator.hasSelection(comp);
        if (!validation.valid) return { success: false, error: "Select Prey layer(s) first" };
        
        if (isAnchor) {
            var valueValidation = Validator.anchorNum(value);
            value = valueValidation.value;
        }
        
        app.beginUndoGroup(Config.NAME + ": Update " + displayName);
        
        var count = 0;
        for (var i = 0; i < comp.selectedLayers.length; i++) {
            var layer = comp.selectedLayers[i];
            var fx = Effects.find(layer, sliderName);
            if (fx) {
                fx.property(Config.AE.SLIDER_VAL).setValue(value);
                count++;
            }
        }
        
        app.endUndoGroup();
        
        if (count === 0) {
            return { success: false, error: "No Prey layers in selection" };
        }
        
        var suffix = isAnchor ? "" : "s";
        return { 
            success: true, 
            message: displayName + " → " + value + suffix + " (" + count + " layer" + (count > 1 ? "s" : "") + ")"
        };
    },
    
    /**
     * Toggle Lock Orientation for selected prey layers
     */
    toggleLockOrientation: function() {
        var comp = app.project.activeItem;
        
        var validation = Validator.hasSelection(comp);
        if (!validation.valid) return { success: false, error: "Select Prey layer(s) first" };
        
        var preyLayers = [];
        var lockedCount = 0;
        
        for (var i = 0; i < comp.selectedLayers.length; i++) {
            var layer = comp.selectedLayers[i];
            if (Detector.isPrey(layer)) {
                preyLayers.push(layer);
                if (Effects.getCheckboxValue(layer, Config.EFFECTS.LOCK_ORIENTATION)) {
                    lockedCount++;
                }
            }
        }
        
        if (preyLayers.length === 0) {
            return { success: false, error: "No Prey layers in selection" };
        }
        
        var newState = (lockedCount < preyLayers.length);
        var actionName = newState ? "Lock" : "Unlock";
        
        app.beginUndoGroup(Config.NAME + ": " + actionName + " Orientation");
        
        try {
            for (var j = 0; j < preyLayers.length; j++) {
                Effects.setCheckboxValue(preyLayers[j], Config.EFFECTS.LOCK_ORIENTATION, newState);
            }
            
            app.endUndoGroup();
            
            var stateText = newState ? "ON" : "OFF";
            return { 
                success: true, 
                message: "Lock Orientation " + stateText + " (" + preyLayers.length + " layer" + (preyLayers.length > 1 ? "s" : "") + ")"
            };
            
        } catch(e) {
            app.endUndoGroup();
            return { success: false, error: e.toString() };
        }
    }
};
