/**
 * BolasPro v4.0 - Detector Module
 * Detects layer states and relationships
 */

var Detector = {
    /**
     * Check if layer is a Hunter (has BolasPro ID)
     */
    isHunter: function(layer) {
        return Effects.has(layer, Config.EFFECTS.ID);
    },
    
    /**
     * Check if layer is a Prey (has Target ID)
     */
    isPrey: function(layer) {
        return Effects.has(layer, Config.EFFECTS.TARGET_ID);
    },
    
    /**
     * Get complete state of a layer
     */
    getState: function(layer) {
        var isHunter = this.isHunter(layer);
        var isPrey = this.isPrey(layer);
        return {
            isHunter: isHunter,
            isPrey: isPrey,
            isClean: !isHunter && !isPrey
        };
    },
    
    /**
     * Detect if linking would create a cycle
     */
    detectCycle: function(source, target) {
        var visited = {};
        var current = target;
        var maxDepth = 100;
        
        while (current && maxDepth-- > 0) {
            if (current.index === source.index) return true;
            if (visited[current.index]) break;
            visited[current.index] = true;
            
            var targetId = Effects.getSliderValue(current, Config.EFFECTS.TARGET_ID);
            if (!targetId) break;
            
            var comp = current.containingComp;
            var found = null;
            for (var i = 1; i <= comp.numLayers; i++) {
                var id = Effects.getSliderValue(comp.layer(i), Config.EFFECTS.ID);
                if (id === targetId) { found = comp.layer(i); break; }
            }
            current = found;
        }
        return false;
    },
    
    /**
     * Find all layers attached to a hunter
     */
    findAttachedLayers: function(hunter, comp) {
        var hunterId = Effects.getSliderValue(hunter, Config.EFFECTS.ID);
        if (!hunterId) return [];
        
        var attached = [];
        for (var i = 1; i <= comp.numLayers; i++) {
            var layer = comp.layer(i);
            var targetId = Effects.getSliderValue(layer, Config.EFFECTS.TARGET_ID);
            if (targetId === hunterId) attached.push(layer);
        }
        return attached;
    },
    
    /**
     * Get selected layers info for UI
     */
    getSelectedLayers: function() {
        var comp = app.project.activeItem;
        if (!Utils.isComp(comp)) {
            return { success: false, error: "No composition selected", layers: [], count: 0 };
        }
        
        var layers = [];
        try {
            var sel = comp.selectedLayers;
            if (sel) {
                for (var i = 0; i < sel.length; i++) {
                    try {
                        var layer = sel[i];
                        if (layer) {
                            var state = this.getState(layer);
                            layers.push({
                                index: layer.index,
                                name: layer.name,
                                isHunter: state ? !!state.isHunter : false,
                                isPrey: state ? !!state.isPrey : false,
                                is3D: !!layer.threeDLayer
                            });
                        }
                    } catch(err) {
                        $.writeln("[Detector] Warning on layer: " + (err ? (err.message || String(err)) : ""));
                    }
                }
            }
        } catch(e) {
            return { success: false, error: (e ? (e.message || String(e)) : "Error"), layers: [], count: 0 };
        }
        
        return { 
            success: true, 
            layers: layers,
            count: layers.length
        };
    },
    
    /**
     * Get all hunters in composition (tagged as Hunter)
     */
    getHunters: function() {
        var comp = app.project.activeItem;
        if (!Utils.isComp(comp)) return { error: "No composition selected" };
        
        var hunters = [];
        for (var i = 1; i <= comp.numLayers; i++) {
            var layer = comp.layer(i);
            if (this.isHunter(layer)) {
                hunters.push({
                    index: layer.index,
                    name: layer.name
                });
            }
        }
        
        return { success: true, hunters: hunters };
    },
    
    /**
     * Get ALL layers in composition (for dropdown)
     */
    getAllLayers: function() {
        var comp = app.project.activeItem;
        if (!Utils.isComp(comp)) return { success: false, error: "No composition selected", layers: [] };
        
        var layers = [];
        for (var i = 1; i <= comp.numLayers; i++) {
            var layer = comp.layer(i);
            // Skip locked layers and adjustment layers
            if (layer.locked) continue;
            
            var state = this.getState(layer);
            layers.push({
                index: layer.index,
                name: layer.name,
                isHunter: state.isHunter,
                isPrey: state.isPrey,
                is3D: layer.threeDLayer
            });
        }
        
        return { success: true, layers: layers, count: layers.length };
    }
};
