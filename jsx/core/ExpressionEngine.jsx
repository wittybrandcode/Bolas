/**
 * BolasPro v4.0 - ExpressionEngine Module
 * Builds and manages expressions for prey layers
 * 
 * Dependencies: Config.jsx, Utils.jsx, Expressions.jsx
 */

var ExpressionEngine = {
    // ═══════════════════════════════════════════════════════════════
    // APPLY EXPRESSIONS
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Apply all required expressions to a prey layer
     * @param {Layer} layer - Prey layer
     * @param {Layer} hunter - Hunter layer
     * @param {boolean} lockOrientation - Whether to lock rotation
     * @returns {Object} Result with applied/failed lists
     */
    applyPreyExpressions: function(layer, hunter, lockOrientation) {
        var result = {
            success: true,
            applied: [],
            failed: []
        };
        
        var hunterIndex = hunter.index;
        var hunterName = hunter.name;
        var is3D = layer.threeDLayer;
        var hunter3D = hunter.threeDLayer;
        
        // 1. Position expression (always)
        try {
            var posExpr = Expressions.position(hunterIndex, hunterName, is3D);
            this._applyToProperty(layer, Config.AE.POSITION, posExpr);
            result.applied.push('position');
        } catch(e) {
            result.failed.push('position');
            result.success = false;
        }
        
        // 2. Anchor expression (always)
        try {
            var anchorExpr = Expressions.anchor();
            this._applyToProperty(layer, Config.AE.ANCHOR, anchorExpr);
            result.applied.push('anchor');
        } catch(e) {
            result.failed.push('anchor');
            result.success = false;
        }
        
        // 3. Rotation expressions (if lockOrientation)
        if (lockOrientation) {
            if (is3D) {
                // 3D rotation - X, Y, Z axes
                try {
                    var rotXExpr = Expressions.rotation3D(hunterIndex, hunterName, 'x');
                    this._applyToProperty(layer, Config.AE.ROTATION_X, rotXExpr);
                    result.applied.push('rotationX');
                } catch(e) { result.failed.push('rotationX'); }
                
                try {
                    var rotYExpr = Expressions.rotation3D(hunterIndex, hunterName, 'y');
                    this._applyToProperty(layer, Config.AE.ROTATION_Y, rotYExpr);
                    result.applied.push('rotationY');
                } catch(e) { result.failed.push('rotationY'); }
                
                try {
                    var rotZExpr = Expressions.rotation3D(hunterIndex, hunterName, 'z');
                    this._applyToProperty(layer, Config.AE.ROTATION, rotZExpr);
                    result.applied.push('rotationZ');
                } catch(e) { result.failed.push('rotationZ'); }
                
                // Orientation (only if hunter is also 3D)
                if (hunter3D) {
                    try {
                        var orientExpr = Expressions.orientation(hunterIndex, hunterName);
                        this._applyToProperty(layer, Config.AE.ORIENTATION, orientExpr);
                        result.applied.push('orientation');
                    } catch(e) { result.failed.push('orientation'); }
                }
            } else {
                // 2D rotation
                try {
                    var rotExpr = Expressions.rotation(hunterIndex, hunterName);
                    this._applyToProperty(layer, Config.AE.ROTATION, rotExpr);
                    result.applied.push('rotation');
                } catch(e) { result.failed.push('rotation'); }
            }
        }
        
        return result;
    },
    
    /**
     * Apply expression to a transform property
     * @private
     */
    _applyToProperty: function(layer, propName, expression) {
        if (!layer) throw new Error('No layer provided');
        var t = layer.property(Config.AE.TRANSFORM) || layer.transform;
        if (!t) throw new Error('Transform group not found on ' + layer.name);
        
        var prop = null;
        try { prop = t.property(propName); } catch(e) {}
        
        // Fallback names for multilingual AE versions
        if (!prop) {
            if (propName === Config.AE.POSITION) prop = t.property("Position") || t.position;
            else if (propName === Config.AE.ANCHOR) prop = t.property("Anchor Point") || t.anchorPoint;
            else if (propName === Config.AE.ROTATION || propName === "ADBE Rotate Z") prop = t.property("Rotation") || t.property("ADBE Rotation") || t.rotation;
            else if (propName === Config.AE.ROTATION_X) prop = t.property("X Rotation") || t.xRotation;
            else if (propName === Config.AE.ROTATION_Y) prop = t.property("Y Rotation") || t.yRotation;
            else if (propName === Config.AE.ORIENTATION) prop = t.property("Orientation") || t.orientation;
        }
        
        if (!prop) {
            throw new Error('Property not found: ' + propName);
        }
        
        // Disable separate dimensions if enabled so compound position expression works
        try {
            if (prop.dimensionsSeparated) {
                prop.dimensionsSeparated = false;
            }
        } catch(dimErr) {}
        
        prop.expression = expression;
    },

    // ═══════════════════════════════════════════════════════════════
    // BAKE EXPRESSIONS
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Bake (freeze) a single expression - save value and remove expression
     * @param {Layer} layer
     * @param {string} propName - AE property name
     * @returns {*} The baked value
     */
    bake: function(layer, propName) {
        try {
            var t = layer.property(Config.AE.TRANSFORM);
            var prop = t.property(propName);
            
            if (!prop || !prop.expressionEnabled) return null;
            
            var value = prop.value;
            prop.expression = '';
            prop.setValue(value);
            
            return value;
        } catch(e) {
            $.writeln("[ExpressionEngine] Bake error: " + e);
            return null;
        }
    },
    
    /**
     * Bake all BolasPro expressions on layer
     * @param {Layer} layer
     * @returns {Object} Baked values by property name
     */
    bakeAll: function(layer) {
        var baked = {};
        var props = [Config.AE.POSITION, Config.AE.ANCHOR, Config.AE.ROTATION];
        
        if (layer.threeDLayer) {
            props = [
                Config.AE.POSITION, 
                Config.AE.ANCHOR, 
                Config.AE.ROTATION_X, 
                Config.AE.ROTATION_Y, 
                Config.AE.ROTATION, 
                Config.AE.ORIENTATION
            ];
        }
        
        for (var i = 0; i < props.length; i++) {
            var val = this.bake(layer, props[i]);
            if (val !== null) {
                baked[props[i]] = val;
            }
        }
        
        return baked;
    },

    // ═══════════════════════════════════════════════════════════════
    // REMOVE EXPRESSIONS
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Remove expression from property without baking
     * @param {Layer} layer
     * @param {string} propName - AE property name
     */
    remove: function(layer, propName) {
        try {
            var t = layer.property(Config.AE.TRANSFORM);
            var prop = t.property(propName);
            if (prop && prop.expressionEnabled) {
                prop.expression = '';
            }
        } catch(e) {
            $.writeln("[ExpressionEngine] Remove error: " + e);
        }
    },
    
    /**
     * Remove all BolasPro expressions from layer
     * @param {Layer} layer
     */
    removeAll: function(layer) {
        var props = [Config.AE.POSITION, Config.AE.ANCHOR, Config.AE.ROTATION];
        
        if (layer.threeDLayer) {
            props = [
                Config.AE.POSITION, 
                Config.AE.ANCHOR, 
                Config.AE.ROTATION_X, 
                Config.AE.ROTATION_Y, 
                Config.AE.ROTATION, 
                Config.AE.ORIENTATION
            ];
        }
        
        for (var i = 0; i < props.length; i++) {
            this.remove(layer, props[i]);
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // UPDATE EXPRESSIONS
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Update expressions to point to new hunter
     * @param {Layer} layer - Prey layer
     * @param {Layer} newHunter - New hunter layer
     * @param {boolean} lockOrientation - Lock orientation setting
     */
    updateHunterReference: function(layer, newHunter, lockOrientation) {
        // Bake current values first
        this.bakeAll(layer);
        
        // Apply new expressions
        return this.applyPreyExpressions(layer, newHunter, lockOrientation);
    },

    // ═══════════════════════════════════════════════════════════════
    // RESTORE EXPRESSIONS
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Restore expressions from captured state
     * @param {Layer} layer
     * @param {Object} capturedExpressions - From SensorSystem.captureFullState
     */
    restoreExpressions: function(layer, capturedExpressions) {
        var t = layer.property(Config.AE.TRANSFORM);
        
        var propMap = {
            'position': Config.AE.POSITION,
            'anchorPoint': Config.AE.ANCHOR,
            'rotation': Config.AE.ROTATION,
            'xRotation': Config.AE.ROTATION_X,
            'yRotation': Config.AE.ROTATION_Y,
            'orientation': Config.AE.ORIENTATION
        };
        
        for (var propName in capturedExpressions) {
            if (!capturedExpressions.hasOwnProperty(propName)) continue;
            
            var aePropName = propMap[propName];
            if (!aePropName) continue;
            
            try {
                var prop = t.property(aePropName);
                if (prop) {
                    prop.expression = capturedExpressions[propName];
                }
            } catch(e) {
                $.writeln("[ExpressionEngine] Restore error for " + propName + ": " + e);
            }
        }
    }
};
