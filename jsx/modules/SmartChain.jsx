/**
 * BolasPro v4.0 - Smart Chain Operations Module
 * Advanced chain manipulation operations with full risk mitigation
 * 
 * RISK MITIGATION:
 * - RISK-01: Delete from last to first (highest index first)
 * - RISK-04: Use Snag.tagHunter() for new hunters
 * - RISK-05: Reject operations on layers with multiple followers
 * - RISK-06: Use Snag._executeInternal() to update expressions
 */

var SmartChain = {
    
    // ═══════════════════════════════════════════════════════════════
    // HELPER FUNCTIONS (Phase 0 & 1)
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Safe delete multiple layers (from last to first)
     * Solves RISK-01: Index changes after deletion
     * @param {Array} layers - Array of layers to delete
     */
    _safeDeleteLayers: function(layers) {
        // Sort by index (highest first)
        layers.sort(function(a, b) {
            return b.index - a.index;
        });
        
        // Delete from last to first
        for (var i = 0; i < layers.length; i++) {
            layers[i].remove();
        }
    },
    
    /**
     * Get first direct follower only
     * @param {Layer} layer - The hunter/hunter-prey layer
     * @returns {Layer|null} First follower or null
     */
    getDirectFollower: function(layer) {
        var followers = Chain.getDirectFollowers(layer);
        return followers.length > 0 ? followers[0] : null;
    },
    
    /**
     * Check if layer has multiple direct followers
     * Solves RISK-05: Branched chains
     * @param {Layer} layer
     * @returns {boolean}
     */
    hasMultipleFollowers: function(layer) {
        return Chain.getDirectFollowers(layer).length > 1;
    },
    
    /**
     * Get all snag settings from a prey layer
     * @param {Layer} layer - The prey layer
     * @returns {Object} Settings object
     */
    getLayerSettings: function(layer) {
        return {
            snagPoint: Effects.getSliderValue(layer, Config.EFFECTS.SNAG_POINT) || 5,
            preyAnchor: Effects.getSliderValue(layer, Config.EFFECTS.PREY_ANCHOR) || 5,
            lockOrientation: Effects.getCheckboxValue(layer, Config.EFFECTS.LOCK_ORIENTATION) || false,
            positionDelay: Effects.getSliderValue(layer, Config.EFFECTS.POSITION_DELAY) || 0,
            rotationDelay: Effects.getSliderValue(layer, Config.EFFECTS.ROTATION_DELAY) || 0,
            offsetX: Effects.getSliderValue(layer, Config.EFFECTS.OFFSET_X) || 0,
            offsetY: Effects.getSliderValue(layer, Config.EFFECTS.OFFSET_Y) || 0,
            offsetZ: layer.threeDLayer ? (Effects.getSliderValue(layer, Config.EFFECTS.OFFSET_Z) || 0) : 0
        };
    },
    
    /**
     * Get available operations for a layer
     * @param {number} layerIndex
     * @returns {Object} Available operations
     */
    getAvailableOperations: function(layerIndex) {
        var comp = app.project.activeItem;
        if (!Utils.isComp(comp)) {
            return { success: false, error: "No composition" };
        }
        
        var layer = comp.layer(layerIndex);
        if (!layer) {
            return { success: false, error: "Invalid layer" };
        }
        
        var state = Detector.getState(layer);
        var hasLeader = Chain.getLeader(layer) !== null;
        var directFollowers = Chain.getDirectFollowers(layer);
        var hasFollowers = directFollowers.length > 0;
        var hasMultipleFollowers = directFollowers.length > 1;
        var isRootHunter = state.isHunter && !hasLeader;
        var isLastPrey = state.isPrey && !hasFollowers;
        
        return {
            success: true,
            layerIndex: layerIndex,
            layerName: layer.name,
            type: state.isHunter && state.isPrey ? "hunter-prey" : 
                  state.isHunter ? "hunter" : 
                  state.isPrey ? "prey" : "clean",
            
            // Unchain operations
            canCutAfter: hasFollowers,
            canBypass: hasLeader && !hasMultipleFollowers,
            canSplit: hasLeader,
            
            // Delete operations
            canDeleteReconnect: hasLeader && !hasMultipleFollowers,
            canDeleteFree: hasLeader,
            canDeleteCascade: state.isHunter || state.isPrey,
            canDeletePromote: hasFollowers,
            
            // Info
            followerCount: directFollowers.length,
            hasMultipleFollowers: hasMultipleFollowers,
            isRootHunter: isRootHunter,
            isLastPrey: isLastPrey
        };
    },

    // ═══════════════════════════════════════════════════════════════
    // UNCHAIN OPERATIONS (Phase 2)
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Cut After - Free all followers of a layer
     * Uses ControllerManager for consistent cleanup
     * @param {number} layerIndex - Index of the layer
     * @returns {Object} Operation result
     */
    cutAfter: function(layerIndex) {
        var comp = app.project.activeItem;
        
        var compCheck = Validator.comp(comp);
        if (!compCheck.valid) return { success: false, error: compCheck.error };
        
        var layer = comp.layer(layerIndex);
        if (!layer) {
            return { success: false, error: "Invalid layer index" };
        }
        
        var followers = Chain.getAllFollowers(layer);
        if (followers.length === 0) {
            return { success: false, error: "No followers to cut" };
        }
        
        app.beginUndoGroup(Config.NAME + ": Cut After");
        
        try {
            var freedNames = [];
            
            for (var i = 0; i < followers.length; i++) {
                freedNames.push(followers[i].name);
                // Use ControllerManager for consistent cleanup
                ControllerManager.cleanup(followers[i], 'full');
            }
            
            app.endUndoGroup();
            Cache.clear();
            ChainRegistry.invalidateCache();
            
            return {
                success: true,
                freedCount: followers.length,
                freedNames: freedNames,
                message: "Cut " + followers.length + " follower(s)"
            };
            
        } catch(e) {
            app.endUndoGroup();
            return { success: false, error: e.toString() };
        }
    },
    
    /**
     * Bypass - Remove layer from chain, reconnect leader to follower
     * Uses ControllerManager for consistent state management
     * RISK-05: Rejects if layer has multiple followers
     * @param {number} layerIndex - Index of the layer
     * @returns {Object} Operation result
     */
    bypass: function(layerIndex) {
        var comp = app.project.activeItem;
        
        var compCheck = Validator.comp(comp);
        if (!compCheck.valid) return { success: false, error: compCheck.error };
        
        var layer = comp.layer(layerIndex);
        if (!layer) {
            return { success: false, error: "Invalid layer index" };
        }
        
        var leader = Chain.getLeader(layer);
        if (!leader) {
            return { success: false, error: "Cannot bypass Hunter (no leader)" };
        }
        
        // RISK-05: Check for multiple followers
        if (this.hasMultipleFollowers(layer)) {
            return { 
                success: false, 
                error: "Layer has multiple followers. Cannot auto-bypass.",
                suggestion: "Use Cut After or manual operations."
            };
        }
        
        var directFollower = this.getDirectFollower(layer);
        
        app.beginUndoGroup(Config.NAME + ": Bypass");
        
        try {
            if (directFollower) {
                // Get settings from current layer using SensorSystem
                var followerScan = SensorSystem.scanLayer(directFollower);
                var settings = followerScan.controllers.values;
                
                // Free the follower using ControllerManager
                ControllerManager.cleanup(directFollower, 'full');
                
                // Link follower to leader using ControllerManager
                var leaderId = Effects.getSliderValue(leader, Config.EFFECTS.ID);
                ControllerManager.applyPreset(directFollower, 'prey', {
                    targetId: leaderId,
                    hunter: leader,
                    lockOrientation: settings.LOCK_ORIENTATION || false,
                    values: {
                        SNAG_POINT: settings.SNAG_POINT || 5,
                        PREY_ANCHOR: settings.PREY_ANCHOR || 5,
                        OFFSET_X: settings.OFFSET_X || 0,
                        OFFSET_Y: settings.OFFSET_Y || 0,
                        OFFSET_Z: settings.OFFSET_Z || 0,
                        POSITION_DELAY: settings.POSITION_DELAY || 0,
                        ROTATION_DELAY: settings.ROTATION_DELAY || 0
                    }
                });
            }
            
            // Free the bypassed layer using ControllerManager
            ControllerManager.cleanup(layer, 'full');
            
            app.endUndoGroup();
            Cache.clear();
            ChainRegistry.invalidateCache();
            
            return { 
                success: true, 
                bypassedLayer: layer.name,
                reconnected: directFollower ? directFollower.name : null,
                newLeader: leader.name,
                message: "Bypassed " + layer.name
            };
            
        } catch(e) {
            app.endUndoGroup();
            return { success: false, error: e.toString() };
        }
    },
    
    /**
     * Split - Make layer a new Hunter, breaking from its leader
     * Uses ControllerManager for consistent state management
     * RISK-04: Uses Snag.tagHunter() for new Hunter ID
     * @param {number} layerIndex - Index of the layer
     * @returns {Object} Operation result
     */
    split: function(layerIndex) {
        var comp = app.project.activeItem;
        
        var compCheck = Validator.comp(comp);
        if (!compCheck.valid) return { success: false, error: compCheck.error };
        
        var layer = comp.layer(layerIndex);
        if (!layer) {
            return { success: false, error: "Invalid layer index" };
        }
        
        var leader = Chain.getLeader(layer);
        if (!leader) {
            return { success: false, error: "Cannot split Hunter (already root)" };
        }
        
        app.beginUndoGroup(Config.NAME + ": Split Chain");
        
        try {
            // Save direct followers BEFORE freeing
            var directFollowers = Chain.getDirectFollowers(layer);
            var followerSettings = [];
            for (var i = 0; i < directFollowers.length; i++) {
                followerSettings.push(SensorSystem.scanLayer(directFollowers[i]).controllers.values);
            }
            
            // Use ControllerManager to unlink from leader (keeps ID if exists)
            ControllerManager.cleanup(layer, 'unlink');
            
            // Add new Hunter ID using ControllerManager
            ControllerManager.applyPreset(layer, 'hunter');
            var newHunterId = Effects.getSliderValue(layer, Config.EFFECTS.ID);
            
            // Update followers to point to new Hunter
            for (var j = 0; j < directFollowers.length; j++) {
                var follower = directFollowers[j];
                var settings = followerSettings[j];
                
                // Unlink from old hunter
                ControllerManager.cleanup(follower, 'unlink');
                
                // Apply prey preset with new hunter
                ControllerManager.applyPreset(follower, 'prey', {
                    targetId: newHunterId,
                    hunter: layer,
                    lockOrientation: settings.LOCK_ORIENTATION || false,
                    values: {
                        SNAG_POINT: settings.SNAG_POINT || 5,
                        PREY_ANCHOR: settings.PREY_ANCHOR || 5,
                        OFFSET_X: settings.OFFSET_X || 0,
                        OFFSET_Y: settings.OFFSET_Y || 0,
                        OFFSET_Z: settings.OFFSET_Z || 0,
                        POSITION_DELAY: settings.POSITION_DELAY || 0,
                        ROTATION_DELAY: settings.ROTATION_DELAY || 0
                    }
                });
            }
            
            app.endUndoGroup();
            Cache.clear();
            ChainRegistry.invalidateCache();
            
            return { 
                success: true, 
                newHunter: layer.name,
                newHunterId: newHunterId,
                followerCount: directFollowers.length,
                message: layer.name + " is now a Hunter with " + directFollowers.length + " follower(s)"
            };
            
        } catch(e) {
            app.endUndoGroup();
            return { success: false, error: e.toString() };
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // DELETE OPERATIONS (Phase 3)
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Delete + Reconnect - Delete layer and reconnect follower to leader
     * Uses ControllerManager for consistent state management
     * RISK-05: Rejects if layer has multiple followers
     * @param {number} layerIndex - Index of the layer
     * @returns {Object} Operation result
     */
    deleteReconnect: function(layerIndex) {
        var comp = app.project.activeItem;
        
        var compCheck = Validator.comp(comp);
        if (!compCheck.valid) return { success: false, error: compCheck.error };
        
        var layer = comp.layer(layerIndex);
        if (!layer) {
            return { success: false, error: "Invalid layer index" };
        }
        
        var leader = Chain.getLeader(layer);
        if (!leader) {
            return { success: false, error: "Cannot delete Hunter this way. Use Delete Cascade." };
        }
        
        // RISK-05: Check for multiple followers
        if (this.hasMultipleFollowers(layer)) {
            return { 
                success: false, 
                error: "Layer has multiple followers. Cannot auto-reconnect.",
                suggestion: "Use Delete+Free instead."
            };
        }
        
        var directFollower = this.getDirectFollower(layer);
        var deletedName = layer.name;
        
        app.beginUndoGroup(Config.NAME + ": Delete + Reconnect");
        
        try {
            if (directFollower) {
                // Get settings using SensorSystem
                var followerScan = SensorSystem.scanLayer(directFollower);
                var settings = followerScan.controllers.values;
                
                // Free the follower using ControllerManager
                ControllerManager.cleanup(directFollower, 'full');
                
                // Link follower to leader using ControllerManager
                var leaderId = Effects.getSliderValue(leader, Config.EFFECTS.ID);
                ControllerManager.applyPreset(directFollower, 'prey', {
                    targetId: leaderId,
                    hunter: leader,
                    lockOrientation: settings.LOCK_ORIENTATION || false,
                    values: {
                        SNAG_POINT: settings.SNAG_POINT || 5,
                        PREY_ANCHOR: settings.PREY_ANCHOR || 5,
                        OFFSET_X: settings.OFFSET_X || 0,
                        OFFSET_Y: settings.OFFSET_Y || 0,
                        OFFSET_Z: settings.OFFSET_Z || 0,
                        POSITION_DELAY: settings.POSITION_DELAY || 0,
                        ROTATION_DELAY: settings.ROTATION_DELAY || 0
                    }
                });
            }
            
            // Delete the layer
            layer.remove();
            
            app.endUndoGroup();
            Cache.clear();
            ChainRegistry.invalidateCache();
            
            return { 
                success: true, 
                deletedLayer: deletedName,
                reconnected: directFollower ? directFollower.name : null,
                newLeader: leader.name,
                message: "Deleted " + deletedName + (directFollower ? ", reconnected " + directFollower.name : "")
            };
            
        } catch(e) {
            app.endUndoGroup();
            return { success: false, error: e.toString() };
        }
    },
    
    /**
     * Delete + Free - Delete layer and free all followers
     * Uses ControllerManager for consistent cleanup
     * @param {number} layerIndex - Index of the layer
     * @returns {Object} Operation result
     */
    deleteFree: function(layerIndex) {
        var comp = app.project.activeItem;
        
        var compCheck = Validator.comp(comp);
        if (!compCheck.valid) return { success: false, error: compCheck.error };
        
        var layer = comp.layer(layerIndex);
        if (!layer) {
            return { success: false, error: "Invalid layer index" };
        }
        
        var leader = Chain.getLeader(layer);
        if (!leader) {
            return { success: false, error: "Cannot delete Hunter this way. Use Delete Cascade." };
        }
        
        var followers = Chain.getAllFollowers(layer);
        var deletedName = layer.name;
        
        app.beginUndoGroup(Config.NAME + ": Delete + Free");
        
        try {
            var freedNames = [];
            
            // Free all followers using ControllerManager
            for (var i = 0; i < followers.length; i++) {
                freedNames.push(followers[i].name);
                ControllerManager.cleanup(followers[i], 'full');
            }
            
            // Delete the layer
            layer.remove();
            
            app.endUndoGroup();
            Cache.clear();
            ChainRegistry.invalidateCache();
            
            return { 
                success: true, 
                deletedLayer: deletedName,
                freedCount: followers.length,
                freedNames: freedNames,
                message: "Deleted " + deletedName + ", freed " + followers.length + " layer(s)"
            };
            
        } catch(e) {
            app.endUndoGroup();
            return { success: false, error: e.toString() };
        }
    },
    
    /**
     * Delete Cascade - Delete layer and all its followers
     * RISK-01: Deletes from last to first (highest index first)
     * @param {number} layerIndex - Index of the layer
     * @returns {Object} Operation result
     */
    deleteCascade: function(layerIndex) {
        var comp = app.project.activeItem;
        
        var compCheck = Validator.comp(comp);
        if (!compCheck.valid) return { success: false, error: compCheck.error };
        
        var layer = comp.layer(layerIndex);
        if (!layer) {
            return { success: false, error: "Invalid layer index" };
        }
        
        // Collect all layers to delete
        var toDelete = [layer];
        var followers = Chain.getAllFollowers(layer);
        
        for (var i = 0; i < followers.length; i++) {
            toDelete.push(followers[i]);
        }
        
        // Collect names before deletion
        var deletedNames = [];
        for (var j = 0; j < toDelete.length; j++) {
            deletedNames.push(toDelete[j].name);
        }
        
        app.beginUndoGroup(Config.NAME + ": Delete Cascade");
        
        try {
            var deletedCount = toDelete.length;
            
            // RISK-01: Sort by index (highest first) and delete
            this._safeDeleteLayers(toDelete);
            
            app.endUndoGroup();
            Cache.clear();
            ChainRegistry.invalidateCache();
            
            return { 
                success: true, 
                deletedCount: deletedCount,
                deletedNames: deletedNames,
                message: deletedCount + " layer(s) deleted"
            };
            
        } catch(e) {
            app.endUndoGroup();
            return { success: false, error: e.toString() };
        }
    },
    
    /**
     * Delete + Promote - Delete layer and promote first follower as new Hunter
     * Uses ControllerManager for consistent state management
     * @param {number} layerIndex - Index of the layer
     * @returns {Object} Operation result
     */
    deletePromote: function(layerIndex) {
        var comp = app.project.activeItem;
        
        var compCheck = Validator.comp(comp);
        if (!compCheck.valid) return { success: false, error: compCheck.error };
        
        var layer = comp.layer(layerIndex);
        if (!layer) {
            return { success: false, error: "Invalid layer index" };
        }
        
        var directFollower = this.getDirectFollower(layer);
        if (!directFollower) {
            return { success: false, error: "No follower to promote" };
        }
        
        var deletedName = layer.name;
        var promotedName = directFollower.name;
        
        app.beginUndoGroup(Config.NAME + ": Delete + Promote");
        
        try {
            // Save grand-followers BEFORE any changes
            var grandFollowers = Chain.getDirectFollowers(directFollower);
            var grandFollowerSettings = [];
            for (var i = 0; i < grandFollowers.length; i++) {
                grandFollowerSettings.push(SensorSystem.scanLayer(grandFollowers[i]).controllers.values);
            }
            
            // Free the follower using ControllerManager (will become new Hunter)
            ControllerManager.cleanup(directFollower, 'full');
            
            // Add new Hunter ID using ControllerManager
            ControllerManager.applyPreset(directFollower, 'hunter');
            var newHunterId = Effects.getSliderValue(directFollower, Config.EFFECTS.ID);
            
            // Update grand-followers to point to new Hunter using ControllerManager
            for (var j = 0; j < grandFollowers.length; j++) {
                var gf = grandFollowers[j];
                var settings = grandFollowerSettings[j];
                
                // Unlink from old hunter
                ControllerManager.cleanup(gf, 'unlink');
                
                // Apply prey preset with new hunter
                ControllerManager.applyPreset(gf, 'prey', {
                    targetId: newHunterId,
                    hunter: directFollower,
                    lockOrientation: settings.LOCK_ORIENTATION || false,
                    values: {
                        SNAG_POINT: settings.SNAG_POINT || 5,
                        PREY_ANCHOR: settings.PREY_ANCHOR || 5,
                        OFFSET_X: settings.OFFSET_X || 0,
                        OFFSET_Y: settings.OFFSET_Y || 0,
                        OFFSET_Z: settings.OFFSET_Z || 0,
                        POSITION_DELAY: settings.POSITION_DELAY || 0,
                        ROTATION_DELAY: settings.ROTATION_DELAY || 0
                    }
                });
            }
            
            // Delete the original layer
            layer.remove();
            
            app.endUndoGroup();
            Cache.clear();
            ChainRegistry.invalidateCache();
            
            return { 
                success: true, 
                deletedLayer: deletedName,
                newHunter: promotedName,
                newHunterId: newHunterId,
                followerCount: grandFollowers.length,
                message: promotedName + " promoted to Hunter"
            };
            
        } catch(e) {
            app.endUndoGroup();
            return { success: false, error: e.toString() };
        }
    }
};
