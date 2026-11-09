/**
 * BolasPro v4.0 - Utility Functions
 * Pure utility functions with no side effects
 */

var Utils = {
    // ═══════════════════════════════════════════════════════════════
    // API HELPERS
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Safe function call with error handling
     */
    safeCall: function(fn, context, args) {
        try {
            return fn.apply(context || null, args || []);
        } catch(e) {
            return { success: false, error: e.toString() };
        }
    },
    
    /**
     * Wrap result as JSON API response
     */
    apiResponse: function(fn, context, args) {
        return JSON.stringify(this.safeCall(fn, context, args));
    },
    
    // ═══════════════════════════════════════════════════════════════
    // VALIDATION HELPERS
    // ═══════════════════════════════════════════════════════════════
    /**
     * Check if value is not null/undefined
     */
    isValid: function(x) { 
        return x != null; 
    },
    
    // ═══════════════════════════════════════════════════════════════
    // TYPE CHECKS
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Check if object is an AE layer
     */
    isLayer: function(x) { 
        return this.isValid(x) && x.sourceRectAtTime !== undefined; 
    },
    
    /**
     * Check if object is an AE composition
     */
    isComp: function(x) { 
        return this.isValid(x) && x instanceof CompItem; 
    },
    
    /**
     * Escape special characters in layer name for expressions
     */
    escapeName: function(name) {
        return name.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/'/g, "\\'");
    },
    
    /**
     * Get anchor ratio for position number (1-9)
     */
    getAnchorRatio: function(num) {
        return Config.ANCHORS[num] || [0.5, 0.5];
    },
    
    /**
     * Calculate anchor coordinates for a layer
     */
    getAnchorCoords: function(layer, anchorNum) {
        if (!this.isLayer(layer)) return [0, 0];
        var rect = layer.sourceRectAtTime(0, false);
        var ratio = this.getAnchorRatio(anchorNum);
        return [
            rect.left + rect.width * ratio[0],
            rect.top + rect.height * ratio[1]
        ];
    },
    
    /**
     * Convert degrees to radians
     */
    degToRad: function(deg) { 
        return deg * Math.PI / 180; 
    },
    
    /**
     * Truncate text with ellipsis
     */
    truncate: function(text, max) {
        if (!text || text.length <= max) return text || "";
        return text.substring(0, max - 3) + "...";
    },
    
    /**
     * Clamp number to range
     */
    clamp: function(val, min, max) {
        return Math.max(min, Math.min(max, val));
    },
    
    /**
     * Generate unique ID within AE slider range
     */
    generateId: function() {
        return Math.floor(Math.random() * 999999) + 1;
    }
};
