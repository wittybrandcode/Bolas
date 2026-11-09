/**
 * BolasPro v4.0 - Layer Inspector Module
 * Reads and writes layer control values for Chain View
 */

var LayerInspector = {
    
    /**
     * Get layer type and role
     * @param {number} layerIndex - Layer index in composition
     * @returns {Object} Layer type info
     */
    getType: function(layerIndex) {
        var comp = app.project.activeItem;
        if (!Utils.isComp(comp)) {
            return { success: false, error: "No composition selected" };
        }
        
        var layer = comp.layer(layerIndex);
        if (!layer) {
            return { success: false, error: "Invalid layer index" };
        }
        
        var isHunter = Detector.isHunter(layer);
        var isPrey = Detector.isPrey(layer);
        
        var type = "clean";
        if (isHunter && isPrey) {
            type = "hunter-prey";
        } else if (isHunter) {
            type = "hunter";
        } else if (isPrey) {
            type = "prey";
        }
        
        return {
            success: true,
            layerIndex: layerIndex,
            layerName: layer.name,
            type: type,
            isHunter: isHunter,
            isPrey: isPrey,
            isClean: !isHunter && !isPrey,
            is3D: layer.threeDLayer
        };
    },
    
    /**
     * Get all control values for a layer
     * @param {number} layerIndex - Layer index
     * @returns {Object} Control values
     */
    getControls: function(layerIndex) {
        var comp = app.project.activeItem;
        if (!Utils.isComp(comp)) {
            return { success: false, error: "No composition selected" };
        }
        
        var layer = comp.layer(layerIndex);
        if (!layer) {
            return { success: false, error: "Invalid layer index" };
        }
        
        var typeInfo = this.getType(layerIndex);
        if (!typeInfo.success) return typeInfo;
        
        // If clean layer, no controls
        if (typeInfo.isClean) {
            return {
                success: true,
                layerIndex: layerIndex,
                layerName: layer.name,
                type: "clean",
                controls: null,
                message: "Layer has no BolasPro controls"
            };
        }
        
        var controls = {};
        
        // Read Prey controls if layer is prey
        if (typeInfo.isPrey) {
            controls.snagPoint = Effects.getSliderValue(layer, Config.EFFECTS.SNAG_POINT) || 5;
            controls.preyAnchor = Effects.getSliderValue(layer, Config.EFFECTS.PREY_ANCHOR) || 5;
            controls.positionDelay = Effects.getSliderValue(layer, Config.EFFECTS.POSITION_DELAY) || 0;
            controls.rotationDelay = Effects.getSliderValue(layer, Config.EFFECTS.ROTATION_DELAY) || 0;
            controls.lockOrientation = Effects.getCheckboxValue(layer, Config.EFFECTS.LOCK_ORIENTATION) || false;
            controls.offsetX = Effects.getSliderValue(layer, Config.EFFECTS.OFFSET_X) || 0;
            controls.offsetY = Effects.getSliderValue(layer, Config.EFFECTS.OFFSET_Y) || 0;
            
            if (layer.threeDLayer) {
                controls.offsetZ = Effects.getSliderValue(layer, Config.EFFECTS.OFFSET_Z) || 0;
            }
        } else {
            // Hunter only - no prey controls
            controls = null;
        }
        
        // Get leader info if prey
        var leaderInfo = null;
        if (typeInfo.isPrey) {
            var leader = Chain.getLeader(layer);
            if (leader) {
                leaderInfo = {
                    index: leader.index,
                    name: leader.name
                };
            }
        }
        
        // Get follower info if hunter
        var hunterInfo = null;
        if (typeInfo.isHunter) {
            var followers = Chain.getDirectFollowers(layer);
            var followerNames = [];
            for (var i = 0; i < followers.length; i++) {
                followerNames.push(followers[i].name);
            }
            hunterInfo = {
                followerCount: followers.length,
                followerNames: followerNames
            };
        }
        
        return {
            success: true,
            layerIndex: layerIndex,
            layerName: layer.name,
            type: typeInfo.type,
            is3D: layer.threeDLayer,
            controls: controls,
            leaderInfo: leaderInfo,
            hunterInfo: hunterInfo
        };
    },
    
    /**
     * Update single control value
     * @param {number} layerIndex - Layer index
     * @param {string} controlName - Control key name
     * @param {*} value - New value
     * @returns {Object} Result
     */
    updateControl: function(layerIndex, controlName, value) {
        var comp = app.project.activeItem;
        if (!Utils.isComp(comp)) {
            return { success: false, error: "No composition selected" };
        }
        
        var layer = comp.layer(layerIndex);
        if (!layer) {
            return { success: false, error: "Invalid layer index" };
        }
        
        // Check if layer is prey (has controls)
        if (!Detector.isPrey(layer)) {
            return { success: false, error: "Layer is not a Prey" };
        }
        
        // Map control name to effect name
        var effectName = this._getEffectName(controlName);
        if (!effectName) {
            return { success: false, error: "Unknown control: " + controlName };
        }
        
        // Validate value for anchor controls
        if (controlName === "snagPoint" || controlName === "preyAnchor") {
            value = Math.max(1, Math.min(9, parseInt(value, 10) || 5));
        }
        
        // Validate delay values
        if (controlName === "positionDelay" || controlName === "rotationDelay") {
            value = Math.max(0, parseFloat(value) || 0);
        }
        
        app.beginUndoGroup(Config.NAME + ": Update " + controlName);
        
        try {
            var fx = Effects.find(layer, effectName);
            if (!fx) {
                app.endUndoGroup();
                return { success: false, error: "Control not found on layer" };
            }
            
            // Handle checkbox vs slider
            if (controlName === "lockOrientation") {
                fx.property(Config.AE.CHECKBOX_VAL).setValue(value ? 1 : 0);
            } else {
                fx.property(Config.AE.SLIDER_VAL).setValue(value);
            }
            
            app.endUndoGroup();
            Cache.clear();
            
            return {
                success: true,
                layerIndex: layerIndex,
                controlName: controlName,
                value: value,
                message: controlName + " updated to " + value
            };
            
        } catch(e) {
            app.endUndoGroup();
            return { success: false, error: e.toString() };
        }
    },
    
    /**
     * Get full layer info for UI (combines type + controls)
     * @param {number} layerIndex - Layer index
     * @returns {Object} Full layer info
     */
    getFullInfo: function(layerIndex) {
        return this.getControls(layerIndex);
    },
    
    /**
     * Select layer by index in AE
     * @param {number} layerIndex - Layer index
     * @returns {Object} Result
     */
    selectLayer: function(layerIndex) {
        var comp = app.project.activeItem;
        if (!Utils.isComp(comp)) {
            return { success: false, error: "No composition selected" };
        }
        
        var layer = comp.layer(layerIndex);
        if (!layer) {
            return { success: false, error: "Invalid layer index" };
        }
        
        // Deselect all
        for (var i = 1; i <= comp.numLayers; i++) {
            comp.layer(i).selected = false;
        }
        
        // Select target layer
        layer.selected = true;
        
        return {
            success: true,
            layerIndex: layerIndex,
            layerName: layer.name
        };
    },
    
    /**
     * Map control key to effect name
     * @private
     */
    _getEffectName: function(controlName) {
        var map = {
            snagPoint: Config.EFFECTS.SNAG_POINT,
            preyAnchor: Config.EFFECTS.PREY_ANCHOR,
            positionDelay: Config.EFFECTS.POSITION_DELAY,
            rotationDelay: Config.EFFECTS.ROTATION_DELAY,
            lockOrientation: Config.EFFECTS.LOCK_ORIENTATION,
            offsetX: Config.EFFECTS.OFFSET_X,
            offsetY: Config.EFFECTS.OFFSET_Y,
            offsetZ: Config.EFFECTS.OFFSET_Z
        };
        return map[controlName] || null;
    }
};
