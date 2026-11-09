/**
 * BolasPro v4.0 - ControllerManager Module
 * Central point for all controller operations
 * 
 * Dependencies: Config.jsx, Utils.jsx, Effects, DataLoader.jsx, 
 *               SensorSystem.jsx, ExpressionEngine.jsx
 */

var ControllerManager = {
    // ═══════════════════════════════════════════════════════════════
    // CONTROLLER OPERATIONS
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Add a single controller to layer
     * If controller already exists, updates its value instead of adding duplicate
     * @param {Layer} layer
     * @param {string} controllerId - Controller ID (e.g., 'ID', 'TARGET_ID')
     * @param {*} value - Value to set (optional, uses default if not provided)
     * @returns {boolean} Success
     */
    addController: function(layer, controllerId, value) {
        var def = DataLoader.getController(controllerId);
        if (!def) {
            $.writeln("[CM] Unknown controller: " + controllerId);
            return false;
        }
        
        // Check conditions
        if (def.condition) {
            if (def.condition === 'is3D' && !layer.threeDLayer) {
                // Not an error, just skip
                return true;
            }
            if (def.condition === 'lockOrientation') {
                var lockVal = Effects.getCheckboxValue(layer, Config.EFFECTS.LOCK_ORIENTATION);
                if (!lockVal) {
                    return true;
                }
            }
        }
        
        // Determine value
        var finalValue = value;
        if (finalValue === undefined || finalValue === null) {
            if (def.generateValue) {
                finalValue = Utils.generateId();
            } else {
                finalValue = def.defaultValue;
            }
        }
        
        // CRITICAL: Check if controller already exists (bypass cache)
        // Clear cache first to ensure fresh check
        var cacheKey = layer.index + "_" + layer.containingComp.id + "_" + def.name;
        Cache.remove(cacheKey);
        
        var existingFx = Effects.find(layer, def.name);
        
        if (existingFx) {
            // Controller exists - UPDATE value instead of adding duplicate
            try {
                if (def.type === 'checkbox') {
                    existingFx.property(Config.AE.CHECKBOX_VAL).setValue(finalValue ? 1 : 0);
                } else {
                    existingFx.property(Config.AE.SLIDER_VAL).setValue(finalValue);
                }
                return true;
            } catch(e) {
                $.writeln("[CM] Update error: " + e);
                return false;
            }
        }
        
        // Controller doesn't exist - add new
        try {
            if (def.type === 'checkbox') {
                Effects.addCheckbox(layer, def.name, finalValue);
            } else {
                Effects.addSlider(layer, def.name, finalValue);
            }
            return true;
        } catch(e) {
            $.writeln("[CM] Add error: " + e);
            return false;
        }
    },
    
    /**
     * Remove a single controller from layer
     * @param {Layer} layer
     * @param {string} controllerId
     * @returns {boolean} Success
     */
    removeController: function(layer, controllerId) {
        var def = DataLoader.getController(controllerId);
        if (!def) return false;
        
        // Clear cache first to ensure fresh lookup
        var cacheKey = layer.index + "_" + layer.containingComp.id + "_" + def.name;
        Cache.remove(cacheKey);
        
        try {
            Effects.remove(layer, def.name);
            return true;
        } catch(e) {
            $.writeln("[CM] Remove error: " + e);
            return false;
        }
    },
    
    /**
     * Add a group of controllers
     * @param {Layer} layer
     * @param {string} groupId - Group ID
     * @param {Object} values - Custom values by controller ID
     * @returns {Object} Result with added/failed lists
     */
    addGroup: function(layer, groupId, values) {
        var controllers = DataLoader.getGroup(groupId);
        if (!controllers) {
            $.writeln("[CM] Unknown group: " + groupId);
            return { success: false, added: [], failed: [] };
        }
        
        values = values || {};
        var result = { success: true, added: [], failed: [] };
        
        for (var i = 0; i < controllers.length; i++) {
            var id = controllers[i];
            var val = values[id];
            
            if (this.addController(layer, id, val)) {
                result.added.push(id);
            } else {
                result.failed.push(id);
                result.success = false;
            }
        }
        
        return result;
    },
    
    /**
     * Remove a group of controllers
     * @param {Layer} layer
     * @param {string} groupId
     * @returns {Object} Result with removed list
     */
    removeGroup: function(layer, groupId) {
        var controllers = DataLoader.getGroup(groupId);
        if (!controllers) {
            return { success: false, removed: [] };
        }
        
        var result = { success: true, removed: [] };
        
        for (var i = 0; i < controllers.length; i++) {
            if (this.removeController(layer, controllers[i])) {
                result.removed.push(controllers[i]);
            }
        }
        
        return result;
    },
    
    /**
     * Clear all BolasPro effect cache entries for a layer
     * Call this before major operations to ensure fresh state
     * @param {Layer} layer
     */
    clearLayerCache: function(layer) {
        var allControllers = DataLoader.getGroup('all');
        if (!allControllers) return;
        
        var compId = layer.containingComp.id;
        var layerIndex = layer.index;
        
        for (var i = 0; i < allControllers.length; i++) {
            var def = DataLoader.getController(allControllers[i]);
            if (def) {
                var cacheKey = layerIndex + "_" + compId + "_" + def.name;
                Cache.remove(cacheKey);
            }
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // CLEANUP OPERATIONS
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Cleanup layer using specified mode
     * @param {Layer} layer
     * @param {string} mode - Cleanup mode (full, unlink, soft, prey_only)
     * @param {Object} options - Additional options
     * @returns {Object} Cleanup result
     */
    cleanup: function(layer, mode, options) {
        options = options || {};
        var profile = DataLoader.getCleanupProfile(mode);
        
        if (!profile) {
            $.writeln("[CM] Unknown cleanup mode: " + mode);
            return { success: false, mode: mode };
        }
        
        // CRITICAL: Clear cache first to ensure fresh state
        this.clearLayerCache(layer);
        
        var result = {
            success: true,
            mode: mode,
            baked: {},
            removed: []
        };
        
        // 1. Bake expressions if required
        if (profile.bakeExpressions) {
            result.baked = ExpressionEngine.bakeAll(layer);
        }
        
        // 2. Remove controller groups
        for (var i = 0; i < profile.removeControllers.length; i++) {
            var groupId = profile.removeControllers[i];
            var groupResult = this.removeGroup(layer, groupId);
            result.removed = result.removed.concat(groupResult.removed);
        }
        
        return result;
    },
    
    /**
     * Cleanup for specific operation and role
     * @param {Layer} layer
     * @param {string} operation - Operation name
     * @param {string} role - Layer role in operation (target, new, follower, etc.)
     * @returns {Object} Cleanup result
     */
    cleanupForOperation: function(layer, operation, role) {
        var opProfile = DataLoader.getOperationProfile(operation);
        if (!opProfile) {
            $.writeln("[CM] Unknown operation: " + operation);
            return { success: false };
        }
        
        var mode = opProfile[role + 'Cleanup'];
        if (!mode) {
            // No cleanup defined for this role
            return { success: true, skipped: true };
        }
        
        return this.cleanup(layer, mode);
    },

    // ═══════════════════════════════════════════════════════════════
    // PRESET OPERATIONS
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Apply preset to layer
     * @param {Layer} layer
     * @param {string} presetId - Preset ID (hunter, prey, hunter-prey)
     * @param {Object} options - Options including targetId, hunter, values
     * @returns {Object} Result
     */
    applyPreset: function(layer, presetId, options) {
        options = options || {};
        var preset = DataLoader.getPreset(presetId);
        
        if (!preset) {
            $.writeln("[CM] Unknown preset: " + presetId);
            return { success: false };
        }
        
        var result = {
            success: true,
            preset: presetId,
            controllers: { added: [], failed: [] },
            expressions: { applied: [], failed: [] }
        };
        
        // 1. Add controllers
        for (var i = 0; i < preset.controllers.length; i++) {
            var ctrl = preset.controllers[i];
            var value = null;
            
            // Determine value
            if (options.values && options.values[ctrl.id] !== undefined) {
                value = options.values[ctrl.id];
            } else if (ctrl.id === 'ID' && options.hunterId) {
                value = options.hunterId;
            } else if (ctrl.id === 'TARGET_ID' && options.targetId) {
                value = options.targetId;
            } else if (ctrl.generateValue) {
                value = Utils.generateId();
            } else {
                value = ctrl.defaultValue;
            }
            
            // Check condition
            if (ctrl.condition === 'is3D' && !layer.threeDLayer) {
                continue;
            }
            
            if (this.addController(layer, ctrl.id, value)) {
                result.controllers.added.push(ctrl.id);
            } else {
                result.controllers.failed.push(ctrl.id);
            }
        }
        
        // 2. Apply expressions (if prey preset and hunter provided)
        if (preset.expressions && options.hunter) {
            var lockOrientation = options.lockOrientation || false;
            
            // Check if lockOrientation is set in values
            if (options.values && options.values.LOCK_ORIENTATION !== undefined) {
                lockOrientation = options.values.LOCK_ORIENTATION;
            }
            
            var exprResult = ExpressionEngine.applyPreyExpressions(
                layer, 
                options.hunter, 
                lockOrientation
            );
            result.expressions = exprResult;
        }
        
        result.success = result.controllers.failed.length === 0;
        return result;
    },

    // ═══════════════════════════════════════════════════════════════
    // ATOMIC OPERATIONS WITH ROLLBACK
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Execute operation with rollback support
     * @param {Function} operation - Function to execute
     * @param {Array} layers - Layers involved (for state capture)
     * @param {Object} options - Options including skipHealthCheck
     * @returns {Object} Result with success status
     */
    executeWithRollback: function(operation, layers, options) {
        options = options || {};
        
        // 1. Capture state before operation
        var snapshots = [];
        for (var i = 0; i < layers.length; i++) {
            if (layers[i]) {
                snapshots.push({
                    layer: layers[i],
                    state: SensorSystem.captureFullState(layers[i])
                });
            }
        }
        
        // 2. Execute operation
        var result;
        try {
            result = operation();
        } catch(e) {
            $.writeln("[CM] Operation failed: " + e);
            
            // Rollback on failure
            this._rollback(snapshots);
            
            return {
                success: false,
                error: e.toString(),
                rolledBack: true
            };
        }
        
        // 3. Health check after operation (unless skipped)
        if (!options.skipHealthCheck) {
            var healthIssues = [];
            for (var j = 0; j < layers.length; j++) {
                if (!layers[j]) continue;
                
                var health = SensorSystem.healthCheck(layers[j]);
                if (health.status === 'error') {
                    healthIssues.push({
                        layer: layers[j].name,
                        issues: health.issues
                    });
                }
            }
            
            // Rollback if critical issues found
            if (healthIssues.length > 0 && options.rollbackOnHealthError) {
                $.writeln("[CM] Health check failed, rolling back");
                this._rollback(snapshots);
                
                return {
                    success: false,
                    healthIssues: healthIssues,
                    rolledBack: true
                };
            }
        }
        
        return {
            success: true,
            result: result
        };
    },
    
    /**
     * Rollback to captured states
     * @private
     */
    _rollback: function(snapshots) {
        for (var i = 0; i < snapshots.length; i++) {
            var snapshot = snapshots[i];
            this._restoreState(snapshot.layer, snapshot.state);
        }
    },
    
    /**
     * Restore layer to captured state
     * @private
     */
    _restoreState: function(layer, state) {
        // 1. Remove all current controllers
        this.cleanup(layer, 'full', { bakeExpressions: false });
        
        // 2. Re-add captured controllers
        for (var id in state.controllers) {
            if (!state.controllers.hasOwnProperty(id)) continue;
            this.addController(layer, id, state.controllers[id]);
        }
        
        // 3. Restore expressions
        ExpressionEngine.restoreExpressions(layer, state.expressions);
        
        // 4. Restore property values (for non-expression properties)
        var t = layer.property(Config.AE.TRANSFORM);
        var propMap = {
            'position': Config.AE.POSITION,
            'anchorPoint': Config.AE.ANCHOR,
            'rotation': Config.AE.ROTATION,
            'xRotation': Config.AE.ROTATION_X,
            'yRotation': Config.AE.ROTATION_Y,
            'orientation': Config.AE.ORIENTATION
        };
        
        for (var propName in state.properties) {
            if (!state.properties.hasOwnProperty(propName)) continue;
            if (state.properties[propName] === null) continue;
            
            var aePropName = propMap[propName];
            if (!aePropName) continue;
            
            try {
                var prop = t.property(aePropName);
                if (prop && !prop.expressionEnabled) {
                    prop.setValue(state.properties[propName]);
                }
            } catch(e) {
                // Ignore errors for properties that can't be set
            }
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // UTILITY METHODS
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Get controller value from layer
     * @param {Layer} layer
     * @param {string} controllerId
     * @returns {*} Value or null
     */
    getValue: function(layer, controllerId) {
        var def = DataLoader.getController(controllerId);
        if (!def) return null;
        
        if (def.type === 'checkbox') {
            return Effects.getCheckboxValue(layer, def.name);
        }
        return Effects.getSliderValue(layer, def.name);
    },
    
    /**
     * Set controller value on layer
     * @param {Layer} layer
     * @param {string} controllerId
     * @param {*} value
     * @returns {boolean} Success
     */
    setValue: function(layer, controllerId, value) {
        var def = DataLoader.getController(controllerId);
        if (!def) return false;
        
        var fx = Effects.find(layer, def.name);
        if (!fx) return false;
        
        try {
            if (def.type === 'checkbox') {
                fx.property(Config.AE.CHECKBOX_VAL).setValue(value ? 1 : 0);
            } else {
                fx.property(Config.AE.SLIDER_VAL).setValue(value);
            }
            return true;
        } catch(e) {
            return false;
        }
    },
    
    /**
     * Check if layer has controller
     * @param {Layer} layer
     * @param {string} controllerId
     * @returns {boolean}
     */
    hasController: function(layer, controllerId) {
        var def = DataLoader.getController(controllerId);
        if (!def) return false;
        return Effects.has(layer, def.name);
    }
};

$.writeln("[BolasPro] ControllerManager loaded");
