/**
 * BolasPro v4.0 - SensorSystem Module
 * Detection, analysis, and state capture for layers
 * 
 * Dependencies: Config.jsx, Effects (EffectsManager.jsx), DataLoader.jsx
 */

var SensorSystem = {
    // ═══════════════════════════════════════════════════════════════
    // LAYER STATES
    // ═══════════════════════════════════════════════════════════════
    
    STATE: {
        FREE: 'free',
        HUNTER: 'hunter',
        PREY: 'prey',
        HUNTER_PREY: 'hunter-prey'
    },

    // ═══════════════════════════════════════════════════════════════
    // QUICK SCAN - Fast state detection
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Quick scan - fast state detection
     * @param {Layer} layer - AE Layer
     * @returns {Object} Quick scan result
     */
    quickScan: function(layer) {
        var hasId = Effects.has(layer, Config.EFFECTS.ID);
        var hasTargetId = Effects.has(layer, Config.EFFECTS.TARGET_ID);
        
        var state = this.STATE.FREE;
        if (hasId && hasTargetId) state = this.STATE.HUNTER_PREY;
        else if (hasId) state = this.STATE.HUNTER;
        else if (hasTargetId) state = this.STATE.PREY;
        
        return {
            state: state,
            hasId: hasId,
            hasTargetId: hasTargetId,
            is3D: layer.threeDLayer,
            id: hasId ? Effects.getSliderValue(layer, Config.EFFECTS.ID) : null,
            targetId: hasTargetId ? Effects.getSliderValue(layer, Config.EFFECTS.TARGET_ID) : null
        };
    },

    // ═══════════════════════════════════════════════════════════════
    // FULL SCAN - Comprehensive layer analysis
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Full scan - comprehensive layer analysis
     * @param {Layer} layer - AE Layer
     * @returns {Object} Full scan result
     */
    scanLayer: function(layer) {
        var quick = this.quickScan(layer);
        
        return {
            layerIndex: layer.index,
            layerName: layer.name,
            is3D: layer.threeDLayer,
            state: quick.state,
            id: quick.id,
            targetId: quick.targetId,
            controllers: this._scanControllers(layer, quick.state),
            expressions: this._scanExpressions(layer),
            relationships: this._scanRelationships(layer, quick)
        };
    },
    
    /**
     * Scan all controllers on layer
     * @private
     */
    _scanControllers: function(layer, state) {
        var result = {
            found: [],
            missing: [],
            orphaned: [],
            values: {}
        };
        
        var allControllers = DataLoader.getAllControllers();
        
        for (var id in allControllers) {
            if (!allControllers.hasOwnProperty(id)) continue;
            
            var def = allControllers[id];
            var exists = Effects.has(layer, def.name);
            
            if (exists) {
                result.found.push(id);
                result.values[id] = this._getControllerValue(layer, def);
                
                // Check if orphaned
                if (this._isOrphaned(id, state, layer)) {
                    result.orphaned.push(id);
                }
            } else {
                // Check if should exist
                if (this._shouldExist(id, state, layer)) {
                    result.missing.push(id);
                }
            }
        }
        
        return result;
    },
    
    /**
     * Scan expressions on layer
     * @private
     */
    _scanExpressions: function(layer) {
        var result = {
            position: this._checkExpression(layer, 'position'),
            anchor: this._checkExpression(layer, 'anchorPoint')
        };
        
        if (layer.threeDLayer) {
            result.rotationX = this._checkExpression(layer, 'xRotation');
            result.rotationY = this._checkExpression(layer, 'yRotation');
            result.rotationZ = this._checkExpression(layer, 'rotation');
            result.orientation = this._checkExpression(layer, 'orientation');
        } else {
            result.rotation = this._checkExpression(layer, 'rotation');
        }
        
        return result;
    },
    
    /**
     * Scan relationships (leader/followers)
     * @private
     */
    _scanRelationships: function(layer, quick) {
        var result = {
            hasLeader: false,
            leaderIndex: null,
            leaderName: null,
            followerCount: 0,
            followers: []
        };
        
        // Find leader if prey
        if (quick.hasTargetId && quick.targetId) {
            var comp = layer.containingComp;
            for (var i = 1; i <= comp.numLayers; i++) {
                var other = comp.layer(i);
                if (other.index === layer.index) continue;
                
                var otherId = Effects.getSliderValue(other, Config.EFFECTS.ID);
                if (otherId === quick.targetId) {
                    result.hasLeader = true;
                    result.leaderIndex = other.index;
                    result.leaderName = other.name;
                    break;
                }
            }
        }
        
        // Find followers if hunter
        if (quick.hasId && quick.id) {
            var comp = layer.containingComp;
            for (var j = 1; j <= comp.numLayers; j++) {
                var other = comp.layer(j);
                if (other.index === layer.index) continue;
                
                var otherTargetId = Effects.getSliderValue(other, Config.EFFECTS.TARGET_ID);
                if (otherTargetId === quick.id) {
                    result.followers.push({
                        index: other.index,
                        name: other.name
                    });
                }
            }
            result.followerCount = result.followers.length;
        }
        
        return result;
    },

    // ═══════════════════════════════════════════════════════════════
    // HEALTH CHECK - Detect issues
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Health check - detect issues with layer
     * @param {Layer} layer - AE Layer
     * @returns {Object} Health report
     */
    healthCheck: function(layer) {
        var scan = this.scanLayer(layer);
        var issues = [];
        var suggestions = [];
        
        // 1. Check for orphaned controllers
        for (var i = 0; i < scan.controllers.orphaned.length; i++) {
            issues.push({
                type: 'ORPHANED_CONTROLLER',
                severity: 'warning',
                controller: scan.controllers.orphaned[i],
                message: 'Controller exists but not needed for current state'
            });
            suggestions.push({
                action: 'remove',
                target: scan.controllers.orphaned[i]
            });
        }
        
        // 2. Check for missing controllers
        for (var j = 0; j < scan.controllers.missing.length; j++) {
            issues.push({
                type: 'MISSING_CONTROLLER',
                severity: 'error',
                controller: scan.controllers.missing[j],
                message: 'Required controller is missing'
            });
            suggestions.push({
                action: 'add',
                target: scan.controllers.missing[j]
            });
        }
        
        // 3. Check for broken links
        if ((scan.state === this.STATE.PREY || scan.state === this.STATE.HUNTER_PREY) 
            && !scan.relationships.hasLeader) {
            issues.push({
                type: 'BROKEN_LINK',
                severity: 'error',
                message: 'TARGET_ID points to non-existent Hunter (ID: ' + scan.targetId + ')'
            });
            suggestions.push({
                action: 'free',
                target: 'layer'
            });
        }
        
        // Determine overall status
        var status = 'healthy';
        for (var k = 0; k < issues.length; k++) {
            if (issues[k].severity === 'error') {
                status = 'error';
                break;
            }
        }
        if (status === 'healthy' && issues.length > 0) {
            status = 'warning';
        }
        
        return {
            status: status,
            state: scan.state,
            issues: issues,
            suggestions: suggestions,
            summary: issues.length + ' issue(s) found'
        };
    },

    // ═══════════════════════════════════════════════════════════════
    // STATE CAPTURE - For rollback support
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Capture full state of layer for rollback
     * @param {Layer} layer - AE Layer
     * @returns {Object} Complete state snapshot
     */
    captureFullState: function(layer) {
        var t = layer.property(Config.AE.TRANSFORM);
        
        return {
            timestamp: new Date().getTime(),
            layerIndex: layer.index,
            layerName: layer.name,
            is3D: layer.threeDLayer,
            controllers: this._captureControllers(layer),
            expressions: this._captureExpressions(layer),
            properties: this._captureProperties(layer, t)
        };
    },
    
    /**
     * Capture controller values
     * @private
     */
    _captureControllers: function(layer) {
        var result = {};
        var allControllers = DataLoader.getAllControllers();
        
        for (var id in allControllers) {
            if (!allControllers.hasOwnProperty(id)) continue;
            
            var def = allControllers[id];
            if (Effects.has(layer, def.name)) {
                result[id] = this._getControllerValue(layer, def);
            }
        }
        
        return result;
    },
    
    /**
     * Capture expression strings
     * @private
     */
    _captureExpressions: function(layer) {
        var result = {};
        var t = layer.property(Config.AE.TRANSFORM);
        
        var props = [
            { name: 'position', ae: Config.AE.POSITION },
            { name: 'anchorPoint', ae: Config.AE.ANCHOR },
            { name: 'rotation', ae: Config.AE.ROTATION }
        ];
        
        if (layer.threeDLayer) {
            props.push({ name: 'xRotation', ae: Config.AE.ROTATION_X });
            props.push({ name: 'yRotation', ae: Config.AE.ROTATION_Y });
            props.push({ name: 'orientation', ae: Config.AE.ORIENTATION });
        }
        
        for (var i = 0; i < props.length; i++) {
            var prop = t.property(props[i].ae);
            if (prop && prop.expressionEnabled) {
                result[props[i].name] = prop.expression;
            }
        }
        
        return result;
    },
    
    /**
     * Capture property values
     * @private
     */
    _captureProperties: function(layer, t) {
        var result = {
            position: t.property(Config.AE.POSITION).value,
            anchorPoint: t.property(Config.AE.ANCHOR).value
        };
        
        if (layer.threeDLayer) {
            result.xRotation = t.property(Config.AE.ROTATION_X).value;
            result.yRotation = t.property(Config.AE.ROTATION_Y).value;
            result.rotation = t.property(Config.AE.ROTATION).value;
            result.orientation = t.property(Config.AE.ORIENTATION).value;
        } else {
            result.rotation = t.property(Config.AE.ROTATION).value;
        }
        
        return result;
    },

    // ═══════════════════════════════════════════════════════════════
    // HELPER METHODS
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Get controller value based on type
     * @private
     */
    _getControllerValue: function(layer, def) {
        if (def.type === 'checkbox') {
            return Effects.getCheckboxValue(layer, def.name);
        }
        return Effects.getSliderValue(layer, def.name);
    },
    
    /**
     * Check if controller is orphaned (exists but shouldn't)
     * @private
     */
    _isOrphaned: function(id, state, layer) {
        // ID is orphaned if layer is PREY only (no followers)
        if (id === 'ID' && state === this.STATE.PREY) return true;
        
        // TARGET_ID is orphaned if layer is HUNTER only
        if (id === 'TARGET_ID' && state === this.STATE.HUNTER) return true;
        
        // OFFSET_Z is orphaned in 2D
        if (id === 'OFFSET_Z' && !layer.threeDLayer) return true;
        
        // Prey controls are orphaned in HUNTER only state
        var preyControls = ['SNAG_POINT', 'PREY_ANCHOR', 'LOCK_ORIENTATION', 
                          'OFFSET_X', 'OFFSET_Y', 'POSITION_DELAY', 'ROTATION_DELAY'];
        if (preyControls.indexOf(id) !== -1 && state === this.STATE.HUNTER) return true;
        
        return false;
    },
    
    /**
     * Check if controller should exist for current state
     * @private
     */
    _shouldExist: function(id, state, layer) {
        if (state === this.STATE.FREE) return false;
        
        // ID should exist for HUNTER or HUNTER_PREY
        if (id === 'ID' && (state === this.STATE.HUNTER || state === this.STATE.HUNTER_PREY)) {
            return true;
        }
        
        // TARGET_ID should exist for PREY or HUNTER_PREY
        if (id === 'TARGET_ID' && (state === this.STATE.PREY || state === this.STATE.HUNTER_PREY)) {
            return true;
        }
        
        // Prey controls should exist for PREY or HUNTER_PREY
        var preyControls = ['SNAG_POINT', 'PREY_ANCHOR', 'LOCK_ORIENTATION', 
                          'OFFSET_X', 'OFFSET_Y', 'POSITION_DELAY', 'ROTATION_DELAY'];
        if (preyControls.indexOf(id) !== -1 && 
            (state === this.STATE.PREY || state === this.STATE.HUNTER_PREY)) {
            return true;
        }
        
        // OFFSET_Z only in 3D
        if (id === 'OFFSET_Z' && layer.threeDLayer && 
            (state === this.STATE.PREY || state === this.STATE.HUNTER_PREY)) {
            return true;
        }
        
        return false;
    },
    
    /**
     * Check expression status on property
     * @private
     */
    _checkExpression: function(layer, propName) {
        try {
            var t = layer.property(Config.AE.TRANSFORM);
            var aePropName = this._getAEPropName(propName);
            var prop = t.property(aePropName);
            
            if (!prop) return { exists: false, enabled: false, hasError: false };
            
            return {
                exists: prop.expression && prop.expression.length > 0,
                enabled: prop.expressionEnabled,
                hasError: prop.expressionError ? true : false,
                error: prop.expressionError || null
            };
        } catch(e) {
            return { exists: false, enabled: false, hasError: false };
        }
    },
    
    /**
     * Map property name to AE constant
     * @private
     */
    _getAEPropName: function(name) {
        var map = {
            'position': Config.AE.POSITION,
            'anchorPoint': Config.AE.ANCHOR,
            'rotation': Config.AE.ROTATION,
            'xRotation': Config.AE.ROTATION_X,
            'yRotation': Config.AE.ROTATION_Y,
            'orientation': Config.AE.ORIENTATION
        };
        return map[name] || name;
    }
};
