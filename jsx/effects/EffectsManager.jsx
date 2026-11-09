/**
 * BolasPro v4.0 - Effects Manager
 * Manages After Effects effect properties
 */

var Effects = {
    /**
     * Find effect by name on layer (with caching)
     */
    find: function(layer, name) {
        try {
            var cacheKey = layer.index + "_" + layer.containingComp.id + "_" + name;
            var cached = Cache.get(cacheKey);
            if (cached !== null) return cached;
            
            var fx = layer.property(Config.AE.EFFECTS);
            if (!fx) return null;
            
            for (var i = 1; i <= fx.numProperties; i++) {
                if (fx.property(i).name === name) {
                    var result = fx.property(i);
                    Cache.set(cacheKey, result);
                    return result;
                }
            }
            
            Cache.set(cacheKey, null);
        } catch(e) {}
        return null;
    },
    
    /**
     * Check if layer has effect
     */
    has: function(layer, name) { 
        return this.find(layer, name) !== null; 
    },
    
    /**
     * Remove effect from layer
     */
    remove: function(layer, name) {
        var fx = this.find(layer, name);
        if (fx) { 
            fx.remove(); 
            Cache.remove(layer.index + "_" + layer.containingComp.id + "_" + name);
            return true; 
        }
        return false;
    },
    
    /**
     * Add slider control effect
     */
    addSlider: function(layer, name, value, expr) {
        var existing = this.find(layer, name);
        if (existing) return existing.property(Config.AE.SLIDER_VAL);
        
        var fx = layer.property(Config.AE.EFFECTS).addProperty(Config.AE.SLIDER);
        fx.name = name;
        var slider = fx.property(Config.AE.SLIDER_VAL);
        slider.setValue(value || 0);
        if (expr) slider.expression = expr;
        
        Cache.remove(layer.index + "_" + layer.containingComp.id + "_" + name);
        return slider;
    },
    
    /**
     * Add checkbox control effect
     */
    addCheckbox: function(layer, name, value) {
        var existing = this.find(layer, name);
        if (existing) return existing.property(Config.AE.CHECKBOX_VAL);
        
        var fx = layer.property(Config.AE.EFFECTS).addProperty(Config.AE.CHECKBOX);
        fx.name = name;
        var checkbox = fx.property(Config.AE.CHECKBOX_VAL);
        checkbox.setValue(value ? 1 : 0);
        
        Cache.remove(layer.index + "_" + layer.containingComp.id + "_" + name);
        return checkbox;
    },
    
    /**
     * Get slider value from effect
     */
    getSliderValue: function(layer, name) {
        var fx = this.find(layer, name);
        return fx ? fx.property(Config.AE.SLIDER_VAL).value : null;
    },
    
    /**
     * Get checkbox value from effect
     */
    getCheckboxValue: function(layer, name) {
        var fx = this.find(layer, name);
        if (!fx) return null;
        var checkbox = fx.property(Config.AE.CHECKBOX_VAL);
        return checkbox ? (checkbox.value === 1) : null;
    },
    
    /**
     * Set checkbox value
     */
    setCheckboxValue: function(layer, name, value) {
        var fx = this.find(layer, name);
        if (!fx) return false;
        var checkbox = fx.property(Config.AE.CHECKBOX_VAL);
        if (checkbox) {
            checkbox.setValue(value ? 1 : 0);
            return true;
        }
        return false;
    },
    
    /**
     * Get all BolasPro effects on layer
     */
    getBolasEffects: function(layer) {
        var list = [];
        try {
            var fx = layer.property(Config.AE.EFFECTS);
            for (var i = 1; i <= fx.numProperties; i++) {
                if (fx.property(i).name.indexOf("BolasPro") === 0) {
                    list.push(fx.property(i).name);
                }
            }
        } catch(e) {}
        return list;
    },
    
    /**
     * Remove all BolasPro effects and expressions from layer
     */
    cleanup: function(layer) {
        var effects = this.getBolasEffects(layer);
        for (var i = 0; i < effects.length; i++) {
            this.remove(layer, effects[i]);
        }
        // Clear expressions
        try {
            var t = layer.property(Config.AE.TRANSFORM);
            var props = [Config.AE.POSITION, Config.AE.ANCHOR];
            for (var j = 0; j < props.length; j++) {
                var p = t.property(props[j]);
                if (p && p.expressionEnabled) {
                    p.expression = "";
                    p.expressionEnabled = false;
                }
            }
            // Clear rotation expressions
            if (layer.threeDLayer) {
                var rotProps = [Config.AE.ROTATION_X, Config.AE.ROTATION_Y, Config.AE.ROTATION];
                for (var k = 0; k < rotProps.length; k++) {
                    var rp = t.property(rotProps[k]);
                    if (rp && rp.expressionEnabled) {
                        rp.expression = "";
                        rp.expressionEnabled = false;
                    }
                }
            } else {
                var rot = t.property(Config.AE.ROTATION);
                if (rot && rot.expressionEnabled) {
                    rot.expression = "";
                    rot.expressionEnabled = false;
                }
            }
        } catch(e) {}
    }
};
