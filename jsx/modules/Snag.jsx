/**
 * BolasPro v4.0 - Snag Module
 * Core snag (link) operation between layers
 * 
 * Updated to use ControllerManager for consistent controller management
 */

var Snag = {
    /**
     * Tag layer as Hunter with unique ID
     * Uses ControllerManager for consistency
     */
    tagHunter: function(layer) {
        if (!Effects.has(layer, Config.EFFECTS.ID)) {
            ControllerManager.addController(layer, 'ID');
        }
        return Effects.getSliderValue(layer, Config.EFFECTS.ID);
    },
    
    /**
     * Tag layer as Prey with Hunter's ID
     * @deprecated Use ControllerManager.applyPreset('prey') instead
     */
    tagPrey: function(layer, hunterId) {
        var safeId = Utils.clamp(hunterId, -999999, 999999);
        ControllerManager.addController(layer, 'TARGET_ID', safeId);
    },
    
    /**
     * Apply control sliders to prey
     * @deprecated Use ControllerManager.applyPreset('prey') instead
     */
    applyPreyControls: function(prey, snagPoint, preyAnchor, is3D, lockOrientation) {
        ControllerManager.addController(prey, 'SNAG_POINT', snagPoint);
        ControllerManager.addController(prey, 'PREY_ANCHOR', preyAnchor);
        ControllerManager.addController(prey, 'LOCK_ORIENTATION', lockOrientation);
        ControllerManager.addController(prey, 'OFFSET_X', 0);
        ControllerManager.addController(prey, 'OFFSET_Y', 0);
        if (is3D) {
            ControllerManager.addController(prey, 'OFFSET_Z', 0);
        }
        ControllerManager.addController(prey, 'POSITION_DELAY', 0);
        ControllerManager.addController(prey, 'ROTATION_DELAY', 0);
    },
    
    /**
     * Apply expressions to prey layer
     * Delegates to ExpressionEngine for consistency
     */
    applyExpressions: function(prey, hunter, lockOrientation) {
        ExpressionEngine.applyPreyExpressions(prey, hunter, lockOrientation);
    },
    
    /**
     * Internal snag execution (no Undo group)
     * Uses ControllerManager.applyPreset for consistent behavior
     */
    _executeInternal: function(comp, hunter, prey, snagPoint, preyAnchor, lockOrientation) {
        var validation = Validator.snagOperation(comp, hunter, prey);
        if (!validation.valid) {
            throw new Error(validation.error);
        }
        
        // Check if hunter needs ID
        var hunterScan = SensorSystem.quickScan(hunter);
        if (!hunterScan.hasId) {
            ControllerManager.applyPreset(hunter, 'hunter');
        }
        
        // Get hunter ID
        var hunterId = Effects.getSliderValue(hunter, Config.EFFECTS.ID);
        
        // Apply prey preset with all settings
        ControllerManager.applyPreset(prey, 'prey', {
            targetId: hunterId,
            hunter: hunter,
            lockOrientation: lockOrientation,
            values: {
                SNAG_POINT: snagPoint,
                PREY_ANCHOR: preyAnchor,
                LOCK_ORIENTATION: lockOrientation
            }
        });
        
        return true;
    },
    
    /**
     * Execute snag operation (with Undo group)
     * Uses executeWithRollback for atomic operation
     */
    execute: function(options) {
        var comp = app.project.activeItem;
        
        var compCheck = Validator.comp(comp);
        if (!compCheck.valid) return { success: false, error: compCheck.error };
        
        var hunter = comp.layer(options.hunterIndex);
        var prey = comp.layer(options.preyIndex);
        
        if (!hunter || !prey) {
            return { success: false, error: "Invalid layer indices" };
        }
        
        var snagPoint = options.snagPoint || 5;
        var preyAnchor = options.preyAnchor || 5;
        var lockOrientation = options.lockOrientation || false;
        var self = this;
        
        app.beginUndoGroup(Config.NAME + ": Snag");
        
        try {
            // Use executeWithRollback for atomic operation
            var result = ControllerManager.executeWithRollback(function() {
                self._executeInternal(
                    comp, hunter, prey,
                    snagPoint,
                    preyAnchor,
                    lockOrientation
                );
                return { success: true };
            }, [hunter, prey]);
            
            Cache.clear();
            ChainRegistry.invalidateCache();
            app.endUndoGroup();
            
            if (result.success) {
                return { 
                    success: true, 
                    message: "Snag complete: " + Utils.truncate(prey.name, 15) + " → " + Utils.truncate(hunter.name, 15)
                };
            } else {
                return { 
                    success: false, 
                    error: result.error || "Snag failed",
                    rolledBack: result.rolledBack
                };
            }
            
        } catch(e) {
            app.endUndoGroup();
            return { success: false, error: e.toString() };
        }
    }
};
