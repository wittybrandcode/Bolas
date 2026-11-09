/**
 * BolasPro v4.0 - Validator Module
 * Comprehensive validation for all operations
 */

var Validator = {
    /**
     * Validate a layer for operations
     */
    layer: function(layer, context) {
        if (!layer) {
            return { valid: false, error: context + ": No layer provided" };
        }
        if (!Utils.isLayer(layer)) {
            return { valid: false, error: context + ": Invalid layer type" };
        }
        if (layer.locked) {
            return { valid: false, error: context + ": Layer '" + Utils.truncate(layer.name, 20) + "' is locked" };
        }
        return { valid: true };
    },
    
    /**
     * Validate composition
     */
    comp: function(comp) {
        if (!comp) {
            return { valid: false, error: "No composition selected" };
        }
        if (!Utils.isComp(comp)) {
            return { valid: false, error: "Active item is not a composition" };
        }
        return { valid: true };
    },
    
    /**
     * Validate selection exists
     */
    hasSelection: function(comp) {
        var compCheck = this.comp(comp);
        if (!compCheck.valid) return compCheck;
        
        if (!comp.selectedLayers || comp.selectedLayers.length === 0) {
            return { valid: false, error: "No layers selected" };
        }
        return { valid: true };
    },
    
    /**
     * Full validation for snag operation
     */
    snagOperation: function(comp, hunter, prey) {
        var compCheck = this.comp(comp);
        if (!compCheck.valid) return compCheck;
        
        var hunterCheck = this.layer(hunter, "Hunter");
        if (!hunterCheck.valid) return hunterCheck;
        
        var preyCheck = this.layer(prey, "Prey");
        if (!preyCheck.valid) return preyCheck;
        
        if (hunter.index === prey.index) {
            return { valid: false, error: "Hunter and Prey cannot be the same layer" };
        }
        
        if (Detector.detectCycle(hunter, prey)) {
            return { valid: false, error: "This would create a circular reference" };
        }
        
        return { valid: true };
    },
    
    /**
     * Validate anchor number
     */
    anchorNum: function(num) {
        var n = Math.round(num);
        if (n < 1 || n > 9 || isNaN(n)) {
            return { valid: false, value: 5 };
        }
        return { valid: true, value: n };
    }
};
