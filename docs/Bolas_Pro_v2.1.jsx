/*
╔══════════════════════════════════════════════════════════════╗
║                      BolasPro v3.1                           ║
║            Professional Layer Snag Tool                      ║
║                                                              ║
║  Author: Tawfik Mostefaoui                                   ║
║  Email: most.toufik@gmail.com                                ║
║  Version: 3.1 (Smart Chain)                                  ║
║  Date: December 2024                                         ║
║                                                              ║
║  Changelog v3.1:                                             ║
║  - NEW: Smart Chain - select root from dropdown              ║
║  - NEW: Chain order control (Ascending/Descending)           ║
║  - NEW: Chain preview before execution                       ║
║  - Improved UI layout for chain operations                   ║
║                                                              ║
║  Changelog v3.0:                                             ║
║  - Chain Linking - link multiple layers with one click       ║
║  - Chain Break modes (this/all/downstream)                   ║
║  - Chain visualization (A → B → C → D)                       ║
║  - Maintain Offset option for chains                         ║
║                                                              ║
║  Changelog v2.2:                                             ║
║  - Position Delay - follow with time lag                     ║
║  - Rotation Delay - rotation follows with lag                ║
║                                                              ║
║  SOLID Principles Applied:                                   ║
║  - S: Single Responsibility - Each module has one job        ║
║  - O: Open/Closed - Extensible without modification          ║
║  - L: Liskov Substitution - Consistent interfaces            ║
║  - I: Interface Segregation - Small, focused interfaces      ║
║  - D: Dependency Inversion - Depend on abstractions          ║
╚══════════════════════════════════════════════════════════════╝
*/

(function(thisObj) {
    "use strict";

    // ═══════════════════════════════════════════════════════════════
    // CONFIG - Single source of truth for all constants
    // ═══════════════════════════════════════════════════════════════
    /**
     * @module CONFIG
     * @description Central configuration object containing all constants
     */
    var CONFIG = {
        NAME: "BolasPro",
        VERSION: "3.1",
        
        /** Anchor point ratios [x, y] for positions 1-9 */
        ANCHORS: {
            1: [0, 0],     2: [0.5, 0],   3: [1, 0],
            4: [0, 0.5],   5: [0.5, 0.5], 6: [1, 0.5],
            7: [0, 1],     8: [0.5, 1],   9: [1, 1]
        },
        
        /** After Effects property match names */
        AE: {
            EFFECTS: "ADBE Effect Parade",
            SLIDER: "ADBE Slider Control",
            SLIDER_VAL: "ADBE Slider Control-0001",
            TRANSFORM: "ADBE Transform Group",
            ANCHOR: "ADBE Anchor Point",
            POSITION: "ADBE Position",
            ROTATION: "ADBE Rotate Z",
            ROTATION_X: "ADBE Rotate X",
            ROTATION_Y: "ADBE Rotate Y"
        },
        
        /** Available element types for prey creation */
        ELEMENT_TYPES: ["New Shape", "New Null", "Existing Layer"],
        
        /** Cache settings */
        CACHE: {
            MAX_AGE: 1000,  // milliseconds
            ENABLED: true
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // UTILS - Pure utility functions (no side effects)
    // ═══════════════════════════════════════════════════════════════
    /**
     * @module Utils
     * @description Pure utility functions with no side effects
     */
    var Utils = {
        /**
         * Check if value is not null/undefined
         * @param {*} x - Value to check
         * @returns {boolean}
         */
        isValid: function(x) { 
            return x != null; 
        },
        
        /**
         * Check if object is an AE layer
         * @param {*} x - Object to check
         * @returns {boolean}
         */
        isLayer: function(x) { 
            return this.isValid(x) && x.sourceRectAtTime !== undefined; 
        },
        
        /**
         * Check if object is an AE composition
         * @param {*} x - Object to check
         * @returns {boolean}
         */
        isComp: function(x) { 
            return this.isValid(x) && x instanceof CompItem; 
        },
        
        /**
         * Escape special characters in layer name for expressions
         * @param {string} name - Layer name
         * @returns {string} Escaped name
         */
        escapeName: function(name) {
            return name.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/'/g, "\\'");
        },
        
        /**
         * Get anchor ratio for position number
         * @param {number} num - Anchor position (1-9)
         * @returns {Array<number>} [x, y] ratio
         */
        getAnchorRatio: function(num) {
            return CONFIG.ANCHORS[num] || [0.5, 0.5];
        },
        
        /**
         * Calculate anchor coordinates for a layer
         * @param {Layer} layer - AE layer
         * @param {number} anchorNum - Anchor position (1-9)
         * @returns {Array<number>} [x, y] coordinates
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
         * @param {number} deg - Degrees
         * @returns {number} Radians
         */
        degToRad: function(deg) { 
            return deg * Math.PI / 180; 
        },
        
        /**
         * Truncate text with ellipsis
         * @param {string} text - Text to truncate
         * @param {number} max - Maximum length
         * @returns {string} Truncated text
         */
        truncate: function(text, max) {
            if (!text || text.length <= max) return text || "";
            return text.substring(0, max - 3) + "...";
        },
        
        /**
         * Clamp number to range
         * @param {number} val - Value to clamp
         * @param {number} min - Minimum
         * @param {number} max - Maximum
         * @returns {number} Clamped value
         */
        clamp: function(val, min, max) {
            return Math.max(min, Math.min(max, val));
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // CACHE - Time-based caching for expensive operations
    // ═══════════════════════════════════════════════════════════════
    /**
     * @module Cache
     * @description Time-based caching system for performance optimization
     */
    var Cache = {
        _store: {},
        
        /**
         * Get cached value if not expired
         * @param {string} key - Cache key
         * @returns {*} Cached value or null if expired/missing
         */
        get: function(key) {
            if (!CONFIG.CACHE.ENABLED) return null;
            var item = this._store[key];
            if (item && (Date.now() - item.time) < CONFIG.CACHE.MAX_AGE) {
                return item.value;
            }
            return null;
        },
        
        /**
         * Store value in cache with timestamp
         * @param {string} key - Cache key
         * @param {*} value - Value to cache
         */
        set: function(key, value) {
            if (!CONFIG.CACHE.ENABLED) return;
            this._store[key] = { 
                value: value, 
                time: Date.now() 
            };
        },
        
        /**
         * Clear all cached data
         */
        clear: function() {
            this._store = {};
        },
        
        /**
         * Remove specific key from cache
         * @param {string} key - Cache key to remove
         */
        remove: function(key) {
            delete this._store[key];
        },
        
        /**
         * Get cache statistics
         * @returns {{size: number, keys: Array<string>}}
         */
        stats: function() {
            var keys = [];
            for (var k in this._store) {
                if (this._store.hasOwnProperty(k)) keys.push(k);
            }
            return { size: keys.length, keys: keys };
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // MATRIX - 3D transformation calculations
    // ═══════════════════════════════════════════════════════════════
    /**
     * @module Matrix
     * @description 3D matrix operations for rotation and transformation
     */
    var Matrix = {
        /**
         * Multiply two 3x3 matrices
         * @param {Array<Array<number>>} a - First matrix
         * @param {Array<Array<number>>} b - Second matrix
         * @returns {Array<Array<number>>} Result matrix
         */
        multiply: function(a, b) {
            var r = [[0,0,0], [0,0,0], [0,0,0]];
            for (var i = 0; i < 3; i++) {
                for (var j = 0; j < 3; j++) {
                    for (var k = 0; k < 3; k++) {
                        r[i][j] += a[i][k] * b[k][j];
                    }
                }
            }
            return r;
        },
        
        /**
         * Transform a 3D vector by a matrix
         * @param {Array<Array<number>>} m - 3x3 matrix
         * @param {Array<number>} v - 3D vector [x, y, z]
         * @returns {Array<number>} Transformed vector
         */
        transform: function(m, v) {
            return [
                m[0][0]*v[0] + m[0][1]*v[1] + m[0][2]*v[2],
                m[1][0]*v[0] + m[1][1]*v[1] + m[1][2]*v[2],
                m[2][0]*v[0] + m[2][1]*v[1] + m[2][2]*v[2]
            ];
        },
        
        /**
         * Create rotation matrix from Euler angles (ZYX order)
         * @param {number} x - X rotation in degrees
         * @param {number} y - Y rotation in degrees
         * @param {number} z - Z rotation in degrees
         * @returns {Array<Array<number>>} 3x3 rotation matrix
         */
        rotation: function(x, y, z) {
            var rx = Utils.degToRad(x), ry = Utils.degToRad(y), rz = Utils.degToRad(z);
            var cx = Math.cos(rx), sx = Math.sin(rx);
            var cy = Math.cos(ry), sy = Math.sin(ry);
            var cz = Math.cos(rz), sz = Math.sin(rz);
            
            return [
                [cy*cz, -cy*sz, sy],
                [sx*sy*cz + cx*sz, -sx*sy*sz + cx*cz, -sx*cy],
                [-cx*sy*cz + sx*sz, cx*sy*sz + sx*cz, cx*cy]
            ];
        },
        
        /**
         * Get rotation matrix from layer at specific time
         * @param {Layer} layer - AE layer
         * @param {number} time - Time in seconds
         * @returns {Array<Array<number>>} 3x3 rotation matrix
         */
        getLayerMatrix: function(layer, time) {
            if (!layer.threeDLayer) {
                var rz = layer.rotation.valueAtTime(time, false);
                var c = Math.cos(Utils.degToRad(rz)), s = Math.sin(Utils.degToRad(rz));
                return [[c, -s, 0], [s, c, 0], [0, 0, 1]];
            }
            var rot = layer.property(CONFIG.AE.TRANSFORM);
            return this.rotation(
                rot.property(CONFIG.AE.ROTATION_X).valueAtTime(time, false),
                rot.property(CONFIG.AE.ROTATION_Y).valueAtTime(time, false),
                rot.property(CONFIG.AE.ROTATION).valueAtTime(time, false)
            );
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // EFFECTS - Effect management (Single Responsibility)
    // ═══════════════════════════════════════════════════════════════
    /**
     * @module Effects
     * @description Manages After Effects effect properties
     */
    var Effects = {
        /**
         * Find effect by name on layer (with caching)
         * @param {Layer} layer - AE layer
         * @param {string} name - Effect name
         * @returns {Property|null} Effect property or null
         */
        find: function(layer, name) {
            try {
                // Check cache first
                var cacheKey = layer.index + "_" + layer.containingComp.id + "_" + name;
                var cached = Cache.get(cacheKey);
                if (cached !== null) return cached;
                
                var fx = layer.property(CONFIG.AE.EFFECTS);
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
         * @param {Layer} layer - AE layer
         * @param {string} name - Effect name
         * @returns {boolean}
         */
        has: function(layer, name) { 
            return this.find(layer, name) !== null; 
        },
        
        /**
         * Remove effect from layer
         * @param {Layer} layer - AE layer
         * @param {string} name - Effect name
         * @returns {boolean} True if removed
         */
        remove: function(layer, name) {
            var fx = this.find(layer, name);
            if (fx) { 
                fx.remove(); 
                // Invalidate cache
                Cache.remove(layer.index + "_" + layer.containingComp.id + "_" + name);
                return true; 
            }
            return false;
        },
        
        /**
         * Add slider control effect
         * @param {Layer} layer - AE layer
         * @param {string} name - Effect name
         * @param {number} value - Initial value
         * @param {string} [expr] - Optional expression
         * @returns {Property} Slider property
         */
        addSlider: function(layer, name, value, expr) {
            var existing = this.find(layer, name);
            if (existing) return existing.property(CONFIG.AE.SLIDER_VAL);
            
            var fx = layer.property(CONFIG.AE.EFFECTS).addProperty(CONFIG.AE.SLIDER);
            fx.name = name;
            var slider = fx.property(CONFIG.AE.SLIDER_VAL);
            slider.setValue(value || 0);
            if (expr) slider.expression = expr;
            
            // Invalidate cache
            Cache.remove(layer.index + "_" + layer.containingComp.id + "_" + name);
            return slider;
        },
        
        /**
         * Add checkbox control effect
         * @param {Layer} layer - AE layer
         * @param {string} name - Effect name
         * @param {boolean} value - Initial value (true/false)
         * @returns {Property} Checkbox property
         */
        addCheckbox: function(layer, name, value) {
            var existing = this.find(layer, name);
            if (existing) return existing.property("ADBE Checkbox Control-0001");
            
            var fx = layer.property(CONFIG.AE.EFFECTS).addProperty("ADBE Checkbox Control");
            fx.name = name;
            var checkbox = fx.property("ADBE Checkbox Control-0001");
            checkbox.setValue(value ? 1 : 0);
            
            // Invalidate cache
            Cache.remove(layer.index + "_" + layer.containingComp.id + "_" + name);
            return checkbox;
        },
        
        /**
         * Get checkbox value from effect
         * @param {Layer} layer - AE layer
         * @param {string} name - Effect name
         * @returns {boolean|null} Checkbox value or null
         */
        getCheckboxValue: function(layer, name) {
            var fx = this.find(layer, name);
            if (!fx) return null;
            var checkbox = fx.property("ADBE Checkbox Control-0001");
            return checkbox ? (checkbox.value === 1) : null;
        },
        
        /**
         * Set checkbox value
         * @param {Layer} layer - AE layer
         * @param {string} name - Effect name
         * @param {boolean} value - New value
         * @returns {boolean} Success
         */
        setCheckboxValue: function(layer, name, value) {
            var fx = this.find(layer, name);
            if (!fx) return false;
            var checkbox = fx.property("ADBE Checkbox Control-0001");
            if (checkbox) {
                checkbox.setValue(value ? 1 : 0);
                return true;
            }
            return false;
        },
        
        /**
         * Get slider value from effect
         * @param {Layer} layer - AE layer
         * @param {string} name - Effect name
         * @returns {number|null} Slider value or null
         */
        getSliderValue: function(layer, name) {
            var fx = this.find(layer, name);
            return fx ? fx.property(CONFIG.AE.SLIDER_VAL).value : null;
        },
        
        /**
         * Get all BolasPro effects on layer
         * @param {Layer} layer - AE layer
         * @returns {Array<string>} Effect names
         */
        getBolasEffects: function(layer) {
            var list = [];
            try {
                var fx = layer.property(CONFIG.AE.EFFECTS);
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
         * @param {Layer} layer - AE layer
         */
        cleanup: function(layer) {
            var effects = this.getBolasEffects(layer);
            for (var i = 0; i < effects.length; i++) {
                this.remove(layer, effects[i]);
            }
            // Clear expressions
            try {
                var t = layer.property(CONFIG.AE.TRANSFORM);
                var props = [CONFIG.AE.POSITION, CONFIG.AE.ANCHOR];
                for (var j = 0; j < props.length; j++) {
                    var p = t.property(props[j]);
                    if (p && p.expressionEnabled) {
                        p.expression = "";
                        p.expressionEnabled = false;
                    }
                }
            } catch(e) {}
        }
    };


    // ═══════════════════════════════════════════════════════════════
    // STATE - Application state management
    // ═══════════════════════════════════════════════════════════════
    /**
     * @module State
     * @description Manages application state with persistence
     */
    var State = {
        _data: {
            sourceAnchor: 5,
            attachedAnchor: 5,
            lockOrientation: false
        },
        
        /**
         * Get state value
         * @param {string} key - State key
         * @returns {*} State value
         */
        get: function(key) { 
            return this._data[key]; 
        },
        
        /**
         * Set state value
         * @param {string} key - State key
         * @param {*} val - Value to set
         */
        set: function(key, val) { 
            this._data[key] = val; 
        },
        
        /**
         * Save state to AE settings
         * @param {string} key - State key to save
         */
        save: function(key) {
            try { 
                app.settings.saveSetting(CONFIG.NAME, key, String(this._data[key])); 
            } catch(e) {}
        },
        
        /**
         * Load state from AE settings
         * @param {string} key - State key to load
         * @param {*} defaultVal - Default value if not found
         * @returns {*} Loaded value or default
         */
        load: function(key, defaultVal) {
            try {
                if (app.settings.haveSetting(CONFIG.NAME, key)) {
                    var val = app.settings.getSetting(CONFIG.NAME, key);
                    if (typeof defaultVal === "boolean") return val === "true";
                    if (typeof defaultVal === "number") return parseFloat(val);
                    return val;
                }
            } catch(e) {}
            return defaultVal;
        },
        
        /**
         * Load all state values from settings
         */
        loadAll: function() {
            this._data.sourceAnchor = this.load("sourceAnchor", 5);
            this._data.attachedAnchor = this.load("attachedAnchor", 5);
            this._data.lockOrientation = this.load("lockOrientation", false);
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // VALIDATOR - Comprehensive input validation
    // ═══════════════════════════════════════════════════════════════
    /**
     * @module Validator
     * @description Comprehensive validation for all operations
     */
    var Validator = {
        /**
         * Validate a layer for operations
         * @param {Layer} layer - AE Layer object
         * @param {string} context - Context for error message
         * @returns {{valid: boolean, error?: string}}
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
         * @param {CompItem} comp - AE Composition
         * @returns {{valid: boolean, error?: string}}
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
         * @param {CompItem} comp - AE Composition
         * @returns {{valid: boolean, error?: string}}
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
         * @param {CompItem} comp - Composition
         * @param {Layer} hunter - Hunter layer
         * @param {Layer} prey - Prey layer
         * @param {Object} detector - Detector module reference
         * @returns {{valid: boolean, error?: string}}
         */
        snagOperation: function(comp, hunter, prey, detector) {
            // Validate comp
            var compCheck = this.comp(comp);
            if (!compCheck.valid) return compCheck;
            
            // Validate hunter
            var hunterCheck = this.layer(hunter, "Hunter");
            if (!hunterCheck.valid) return hunterCheck;
            
            // Validate prey
            var preyCheck = this.layer(prey, "Prey");
            if (!preyCheck.valid) return preyCheck;
            
            // Same layer check
            if (hunter.index === prey.index) {
                return { valid: false, error: "Hunter and Prey cannot be the same layer" };
            }
            
            // Cycle detection
            if (detector && detector.detectCycle(hunter, prey)) {
                return { valid: false, error: "This would create a circular reference" };
            }
            
            return { valid: true };
        },
        
        /**
         * Validate anchor number
         * @param {number} num - Anchor number (1-9)
         * @returns {{valid: boolean, value: number}}
         */
        anchorNum: function(num) {
            var n = Math.round(num);
            if (n < 1 || n > 9 || isNaN(n)) {
                return { valid: false, value: 5 }; // Default to center
            }
            return { valid: true, value: n };
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // DETECTOR - Layer state detection
    // ═══════════════════════════════════════════════════════════════
    /**
     * @module Detector
     * @description Detects layer states and relationships
     */
    var Detector = {
        /**
         * Check if layer is a Hunter (has BolasPro ID)
         * @param {Layer} layer - AE layer
         * @returns {boolean}
         */
        isHunter: function(layer) {
            return Effects.has(layer, "BolasPro ID");
        },
        
        /**
         * Check if layer is a Prey (has Target ID)
         * @param {Layer} layer - AE layer
         * @returns {boolean}
         */
        isPrey: function(layer) {
            return Effects.has(layer, "BolasPro Target ID");
        },
        
        /**
         * Get complete state of a layer
         * @param {Layer} layer - AE layer
         * @returns {{isHunter: boolean, isPrey: boolean, isClean: boolean}}
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
         * @param {Layer} source - Source layer
         * @param {Layer} target - Target layer
         * @returns {boolean} True if cycle would be created
         */
        detectCycle: function(source, target) {
            var visited = {};
            var current = target;
            var maxDepth = 100;
            
            while (current && maxDepth-- > 0) {
                if (current.index === source.index) return true;
                if (visited[current.index]) break;
                visited[current.index] = true;
                
                // Check if current has a target
                var targetId = Effects.getSliderValue(current, "BolasPro Target ID");
                if (!targetId) break;
                
                // Find layer with that ID
                var comp = current.containingComp;
                var found = null;
                for (var i = 1; i <= comp.numLayers; i++) {
                    var id = Effects.getSliderValue(comp.layer(i), "BolasPro ID");
                    if (id === targetId) { found = comp.layer(i); break; }
                }
                current = found;
            }
            return false;
        },
        
        /**
         * Find all layers attached to a hunter
         * @param {Layer} hunter - Hunter layer
         * @param {CompItem} comp - Composition
         * @returns {Array<Layer>} Attached layers
         */
        findAttachedLayers: function(hunter, comp) {
            var hunterId = Effects.getSliderValue(hunter, "BolasPro ID");
            if (!hunterId) return [];
            
            var attached = [];
            for (var i = 1; i <= comp.numLayers; i++) {
                var layer = comp.layer(i);
                var targetId = Effects.getSliderValue(layer, "BolasPro Target ID");
                if (targetId === hunterId) attached.push(layer);
            }
            return attached;
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // STATUS MANAGER - UI feedback management
    // ═══════════════════════════════════════════════════════════════
    /**
     * @module StatusManager
     * @description Manages status bar feedback in UI
     */
    var StatusManager = {
        _statusText: null,
        _timeout: null,
        
        /**
         * Initialize with UI element
         * @param {StaticText} element - ScriptUI statictext element
         */
        init: function(element) {
            this._statusText = element;
            this.clear();
        },
        
        /**
         * Update status display
         * @param {string} message - Status message
         * @param {string} type - 'success' | 'error' | 'info' | 'warning'
         * @param {number} [autoClear] - Auto clear after ms (0 = no auto clear)
         */
        update: function(message, type, autoClear) {
            if (!this._statusText) return;
            
            var colors = {
                success: [0.2, 0.8, 0.2, 1],
                error: [0.9, 0.2, 0.2, 1],
                info: [0.4, 0.7, 1, 1],
                warning: [1, 0.7, 0.2, 1]
            };
            
            try {
                this._statusText.text = message;
                var color = colors[type] || colors.info;
                this._statusText.graphics.foregroundColor = 
                    this._statusText.graphics.newPen(
                        this._statusText.graphics.PenType.SOLID_COLOR, 
                        color, 1
                    );
            } catch(e) {
                // Fallback: just set text
                this._statusText.text = message;
            }
        },
        
        /**
         * Show success message
         * @param {string} message - Message to show
         */
        success: function(message) {
            this.update("✓ " + message, "success");
        },
        
        /**
         * Show error message
         * @param {string} message - Message to show
         */
        error: function(message) {
            this.update("✗ " + message, "error");
        },
        
        /**
         * Show info message
         * @param {string} message - Message to show
         */
        info: function(message) {
            this.update("● " + message, "info");
        },
        
        /**
         * Show warning message
         * @param {string} message - Message to show
         */
        warning: function(message) {
            this.update("⚠ " + message, "warning");
        },
        
        /**
         * Clear status to ready state
         */
        clear: function() {
            this.update("Ready", "info");
        },
        
        /**
         * Cleanup on close
         */
        cleanup: function() {
            this._statusText = null;
        }
    };


    // ═══════════════════════════════════════════════════════════════
    // EXPRESSIONS - Expression templates with error handling
    // ═══════════════════════════════════════════════════════════════
    /**
     * @module Expressions
     * @description Expression templates with comprehensive error handling
     * NOTE: Uses layer NAME as primary reference (survives Undo/Redo)
     *       Index is used as fallback only
     */
    var Expressions = {
        /**
         * Generate position expression with error handling, offset and delay support
         * Uses layer NAME as primary reference (survives Undo/Redo)
         * @param {number} hunterIndex - Hunter layer index (fallback)
         * @param {string} hunterName - Hunter layer name (primary)
         * @param {boolean} is3D - Whether hunter is 3D
         * @returns {string} Expression code
         */
        position: function(hunterIndex, hunterName, is3D) {
            var esc = Utils.escapeName(hunterName);
            var expr = [
                '// BolasPro Position v3.1 - Undo-Safe (Name-based)',
                'try {',
                '    // Primary: use name (survives Undo/Redo)',
                '    var hunter = null;',
                '    try { hunter = thisComp.layer("' + esc + '"); } catch(e) {}',
                '    ',
                '    // Fallback: use index if name not found',
                '    if (!hunter) {',
                '        try { hunter = thisComp.layer(' + hunterIndex + '); } catch(e) {}',
                '    }',
                '    ',
                '    if (!hunter) throw "Hunter not found";',
                '    ',
                '    // Get position delay (in seconds)',
                '    var posDelay = 0;',
                '    try { posDelay = Math.max(0, effect("BolasPro - Position Delay")("Slider").value); } catch(e) {}',
                '    var effectiveTime = Math.max(0, time - posDelay);',
                '    ',
                '    // Get snag point with safe clamping',
                '    var snagPt = 5; // default center',
                '    try {',
                '        snagPt = effect("BolasPro - Snag Point")("Slider").value;',
                '        snagPt = clamp(Math.round(snagPt), 1, 9);',
                '    } catch(e) {}',
                '    ',
                '    // Anchor ratios for positions 1-9',
                '    var ratios = [[0,0],[0.5,0],[1,0],[0,0.5],[0.5,0.5],[1,0.5],[0,1],[0.5,1],[1,1]];',
                '    var ratio = ratios[snagPt - 1];',
                '    ',
                '    // Calculate snag point on Hunter at effective time (with delay)',
                '    var rect = hunter.sourceRectAtTime(effectiveTime, false);',
                '    var snagPos = [',
                '        rect.left + rect.width * ratio[0],',
                '        rect.top + rect.height * ratio[1]',
                is3D ? '        ,0' : '',
                '    ];',
                '    ',
                '    // Convert to world space at effective time',
                '    var basePos = hunter.toWorld(snagPos, effectiveTime);',
                '    ',
                '    // Get offset values',
                '    var offX = 0, offY = 0, offZ = 0;',
                '    try { offX = effect("BolasPro - Offset X")("Slider").value; } catch(e) {}',
                '    try { offY = effect("BolasPro - Offset Y")("Slider").value; } catch(e) {}'
            ];
            
            if (is3D) {
                expr.push('    try { offZ = effect("BolasPro - Offset Z")("Slider").value; } catch(e) {}');
                expr.push('    ');
                expr.push('    // Apply offset');
                expr.push('    basePos + [offX, offY, offZ];');
            } else {
                expr.push('    ');
                expr.push('    // Apply offset');
                expr.push('    basePos + [offX, offY];');
            }
            
            expr.push('    ');
            expr.push('} catch(e) {');
            expr.push('    // Fallback: keep current position on any error');
            expr.push('    value;');
            expr.push('}');
            
            return expr.join('\n');
        },
        
        /**
         * Generate anchor expression with error handling
         * @returns {string} Expression code
         */
        anchor: function() {
            return [
                '// BolasPro Anchor v2.1 - Error Protected',
                'try {',
                '    // Get prey anchor with safe clamping',
                '    var preyAnchor = 5; // default center',
                '    try {',
                '        preyAnchor = effect("BolasPro - Prey Anchor")("Slider").value;',
                '        preyAnchor = clamp(Math.round(preyAnchor), 1, 9);',
                '    } catch(e) {}',
                '    ',
                '    // Anchor ratios for positions 1-9',
                '    var ratios = [[0,0],[0.5,0],[1,0],[0,0.5],[0.5,0.5],[1,0.5],[0,1],[0.5,1],[1,1]];',
                '    var ratio = ratios[preyAnchor - 1];',
                '    ',
                '    // Calculate anchor from source rect',
                '    var rect = sourceRectAtTime(time, false);',
                '    [rect.left + rect.width * ratio[0], rect.top + rect.height * ratio[1]];',
                '    ',
                '} catch(e) {',
                '    // Fallback: keep current anchor on any error',
                '    value;',
                '}'
            ].join('\n');
        },
        
        /**
         * Generate rotation expression for Lock Orientation with delay
         * Uses layer NAME as primary reference (survives Undo/Redo)
         * @param {number} hunterIndex - Hunter layer index (fallback)
         * @param {string} hunterName - Hunter layer name (primary)
         * @returns {string} Expression code
         */
        rotation: function(hunterIndex, hunterName) {
            var esc = Utils.escapeName(hunterName);
            return [
                '// BolasPro Rotation Lock v3.1 - Undo-Safe',
                'var result = value;',
                'try {',
                '    var lockOn = effect("BolasPro - Lock Orientation")("Checkbox").value == 1;',
                '    if (lockOn) {',
                '        var hunter = null;',
                '        try { hunter = thisComp.layer("' + esc + '"); } catch(e) {}',
                '        if (!hunter) try { hunter = thisComp.layer(' + hunterIndex + '); } catch(e) {}',
                '        ',
                '        if (hunter) {',
                '            var d = 0;',
                '            try { d = effect("BolasPro - Rotation Delay")("Slider").value; } catch(e) {}',
                '            if (d < 0) d = 0;',
                '            ',
                '            var t = time - d;',
                '            if (t < 0) t = 0;',
                '            ',
                '            result = hunter.transform.rotation.valueAtTime(t);',
                '        }',
                '    }',
                '} catch(e) {}',
                'result;'
            ].join('\n');
        },
        
        /**
         * Generate 3D rotation expressions for Lock Orientation with delay
         * Uses layer NAME as primary reference (survives Undo/Redo)
         * @param {number} hunterIndex - Hunter layer index (fallback)
         * @param {string} hunterName - Hunter layer name (primary)
         * @param {string} axis - 'x', 'y', or 'z'
         * @returns {string} Expression code
         */
        rotation3D: function(hunterIndex, hunterName, axis) {
            var esc = Utils.escapeName(hunterName);
            var propName = axis === 'x' ? 'xRotation' : (axis === 'y' ? 'yRotation' : 'rotation');
            return [
                '// BolasPro 3D Rotation Lock v3.1 - Undo-Safe (' + axis.toUpperCase() + ')',
                'var result = value;',
                'try {',
                '    var lockOn = effect("BolasPro - Lock Orientation")("Checkbox").value == 1;',
                '    if (lockOn) {',
                '        var hunter = null;',
                '        try { hunter = thisComp.layer("' + esc + '"); } catch(e) {}',
                '        if (!hunter) try { hunter = thisComp.layer(' + hunterIndex + '); } catch(e) {}',
                '        ',
                '        if (hunter) {',
                '            var d = 0;',
                '            try { d = effect("BolasPro - Rotation Delay")("Slider").value; } catch(e) {}',
                '            if (d < 0) d = 0;',
                '            ',
                '            var t = time - d;',
                '            if (t < 0) t = 0;',
                '            ',
                '            result = hunter.' + propName + '.valueAtTime(t);',
                '        }',
                '    }',
                '} catch(e) {}',
                'result;'
            ].join('\n');
        },
        
        /**
         * Generate orientation expression for 3D Lock Orientation with delay
         * Uses layer NAME as primary reference (survives Undo/Redo)
         * @param {number} hunterIndex - Hunter layer index (fallback)
         * @param {string} hunterName - Hunter layer name (primary)
         * @returns {string} Expression code
         */
        orientation: function(hunterIndex, hunterName) {
            var esc = Utils.escapeName(hunterName);
            return [
                '// BolasPro Orientation Lock v3.1 - Undo-Safe',
                'var result = value;',
                'try {',
                '    var lockOn = effect("BolasPro - Lock Orientation")("Checkbox").value == 1;',
                '    if (lockOn) {',
                '        var hunter = null;',
                '        try { hunter = thisComp.layer("' + esc + '"); } catch(e) {}',
                '        if (!hunter) try { hunter = thisComp.layer(' + hunterIndex + '); } catch(e) {}',
                '        ',
                '        if (hunter) {',
                '            var d = 0;',
                '            try { d = effect("BolasPro - Rotation Delay")("Slider").value; } catch(e) {}',
                '            if (d < 0) d = 0;',
                '            ',
                '            var t = time - d;',
                '            if (t < 0) t = 0;',
                '            ',
                '            result = hunter.orientation.valueAtTime(t);',
                '        }',
                '    }',
                '} catch(e) {}',
                'result;'
            ].join('\n');
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // COMPENSATION - Professional position compensation system
    // ═══════════════════════════════════════════════════════════════
    /**
     * @module Compensation
     * @description Handles position compensation when anchor changes
     */
    var Compensation = {
        /**
         * Apply delta to property (handles keyframes)
         * @param {Property} property - AE property
         * @param {number|Array<number>} delta - Delta to apply
         */
        applyDelta: function(property, delta) {
            if (property.numKeys > 0) {
                // Has keyframes - update all
                for (var i = 1; i <= property.numKeys; i++) {
                    var keyTime = property.keyTime(i);
                    var val = property.keyValue(i);
                    
                    if (typeof delta === 'number') {
                        property.setValueAtTime(keyTime, val + delta);
                    } else {
                        var newVal = [
                            val[0] + delta[0],
                            val[1] + delta[1],
                            (val[2] || 0) + (delta[2] || 0)
                        ];
                        property.setValueAtTime(keyTime, newVal);
                    }
                }
            } else {
                // No keyframes - simple update
                var val = property.value;
                if (typeof delta === 'number') {
                    property.setValue(val + delta);
                } else {
                    var newVal = [
                        val[0] + delta[0],
                        val[1] + delta[1],
                        (val[2] || 0) + (delta[2] || 0)
                    ];
                    property.setValue(newVal);
                }
            }
        },
        
        /**
         * Get full transform matrix (Orientation + Rotation)
         * @param {Layer} layer - AE layer
         * @param {number} time - Time in seconds
         * @returns {Array<Array<number>>} 3x3 rotation matrix
         */
        getFullMatrix: function(layer, time) {
            if (!layer.threeDLayer) {
                var rot = layer.rotation.valueAtTime(time, false);
                return Matrix.rotation(0, 0, rot);
            }
            
            // Get Orientation
            var orientX = 0, orientY = 0, orientZ = 0;
            if (layer.orientation) {
                var orient = layer.orientation.valueAtTime(time, false);
                orientX = orient[0];
                orientY = orient[1];
                orientZ = orient[2];
            }
            var matOrient = Matrix.rotation(orientX, orientY, orientZ);
            
            // Get Rotation (X, Y, Z)
            var rotX = 0, rotY = 0, rotZ = 0;
            if (layer.xRotation) rotX = layer.xRotation.valueAtTime(time, false);
            if (layer.yRotation) rotY = layer.yRotation.valueAtTime(time, false);
            if (layer.zRotation) rotZ = layer.zRotation.valueAtTime(time, false);
            var matRot = Matrix.rotation(rotX, rotY, rotZ);
            
            // Combine: Total = Rotation * Orientation
            return Matrix.multiply(matRot, matOrient);
        },
        
        /**
         * Professional position compensation for anchor change
         * Handles 3D, keyframes, and separated dimensions
         * @param {Layer} layer - AE layer
         * @param {Array<number>} oldAnchor - Previous anchor [x, y, z?]
         * @param {Array<number>} newAnchor - New anchor [x, y, z?]
         * @returns {Array<number>} The delta applied to position
         */
        forAnchorChange: function(layer, oldAnchor, newAnchor) {
            var time = layer.containingComp.time;
            
            // Ensure 3D vectors
            var oldVec = [oldAnchor[0], oldAnchor[1], oldAnchor[2] || 0];
            var newVec = [newAnchor[0], newAnchor[1], newAnchor[2] || 0];
            
            // 1. Calculate Local Delta
            var deltaLocal = [
                newVec[0] - oldVec[0],
                newVec[1] - oldVec[1],
                newVec[2] - oldVec[2]
            ];
            
            // 2. Get Scale
            var scale = layer.scale.valueAtTime(time, false);
            var scaleVec = [scale[0] / 100, scale[1] / 100, (scale[2] || 100) / 100];
            
            // 3. Apply Scale to Delta
            var deltaScaled = [
                deltaLocal[0] * scaleVec[0],
                deltaLocal[1] * scaleVec[1],
                deltaLocal[2] * scaleVec[2]
            ];
            
            // 4. Apply Full Rotation Matrix
            var matrix = this.getFullMatrix(layer, time);
            var deltaParent = Matrix.transform(matrix, deltaScaled);
            
            // 5. Apply to Position
            var posProp = layer.property(CONFIG.AE.TRANSFORM).property(CONFIG.AE.POSITION);
            
            if (posProp.dimensionsSeparated) {
                // Separated Dimensions
                this.applyDelta(posProp.getSeparationFollower(0), deltaParent[0]); // X
                this.applyDelta(posProp.getSeparationFollower(1), deltaParent[1]); // Y
                if (layer.threeDLayer) {
                    this.applyDelta(posProp.getSeparationFollower(2), deltaParent[2]); // Z
                }
            } else {
                // Combined Position
                this.applyDelta(posProp, deltaParent);
            }
            
            return deltaParent;
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // ANCHOR - Anchor point operations (uses Compensation)
    // ═══════════════════════════════════════════════════════════════
    /**
     * @module Anchor
     * @description Anchor point manipulation with compensation
     */
    var Anchor = {
        /**
         * Set anchor point directly on layer with compensation
         * @param {Layer} layer - AE layer
         * @param {number} anchorNum - Anchor position (1-9)
         * @returns {boolean} Success
         */
        setDirect: function(layer, anchorNum) {
            // Validate
            var validation = Validator.layer(layer, "Anchor");
            if (!validation.valid) {
                StatusManager.error(validation.error);
                return false;
            }
            
            var time = layer.containingComp.time;
            var rect = layer.sourceRectAtTime(time, false);
            var ratio = Utils.getAnchorRatio(anchorNum);
            
            // Calculate new anchor
            var newAnchor = [
                rect.left + rect.width * ratio[0],
                rect.top + rect.height * ratio[1]
            ];
            
            var anchorProp = layer.property(CONFIG.AE.TRANSFORM).property(CONFIG.AE.ANCHOR);
            var oldAnchor = anchorProp.value;
            
            // Add Z for 3D layers
            if (layer.threeDLayer) {
                newAnchor.push(oldAnchor[2] || 0);
            }
            
            // Set new anchor
            anchorProp.setValue(newAnchor);
            
            // Apply professional compensation
            Compensation.forAnchorChange(layer, oldAnchor, newAnchor);
            
            return true;
        },
        
        /**
         * Set anchor for all selected layers
         * @param {number} anchorNum - Anchor position (1-9)
         */
        setForSelected: function(anchorNum) {
            var comp = app.project.activeItem;
            
            // Validate
            var validation = Validator.hasSelection(comp);
            if (!validation.valid) {
                StatusManager.error(validation.error);
                return;
            }
            
            // Validate anchor number
            var anchorValidation = Validator.anchorNum(anchorNum);
            anchorNum = anchorValidation.value;
            
            app.beginUndoGroup(CONFIG.NAME + ": Quick Anchor " + anchorNum);
            
            try {
                var successCount = 0;
                var failCount = 0;
                
                for (var i = 0; i < comp.selectedLayers.length; i++) {
                    if (this.setDirect(comp.selectedLayers[i], anchorNum)) {
                        successCount++;
                    } else {
                        failCount++;
                    }
                }
                
                if (failCount === 0) {
                    StatusManager.success("Anchor set for " + successCount + " layer(s)");
                } else {
                    StatusManager.warning("Set " + successCount + ", failed " + failCount);
                }
                
            } catch(e) {
                StatusManager.error("Anchor failed: " + e.toString());
            }
            
            app.endUndoGroup();
        }
    };


    // ═══════════════════════════════════════════════════════════════
    // SNAG - Core snag operation (Single Responsibility)
    // ═══════════════════════════════════════════════════════════════
    /**
     * @module Snag
     * @description Core snag (link) operation between layers
     */
    var Snag = {
        /**
         * Validate snag operation
         * @param {CompItem} comp - Composition
         * @param {Layer} hunter - Hunter layer
         * @param {Layer} prey - Prey layer
         * @returns {{valid: boolean, error?: string}}
         */
        validate: function(comp, hunter, prey) {
            return Validator.snagOperation(comp, hunter, prey, Detector);
        },
        
        /**
         * Tag layer as Hunter with unique ID
         * @param {Layer} layer - Layer to tag
         * @returns {number} Hunter ID
         */
        tagHunter: function(layer) {
            if (!Effects.has(layer, "BolasPro ID")) {
                // Generate ID within AE slider range (-1000000 to 1000000)
                var id = Math.floor(Math.random() * 999999) + 1;
                Effects.addSlider(layer, "BolasPro ID", id);
            }
            return Effects.getSliderValue(layer, "BolasPro ID");
        },
        
        /**
         * Tag layer as Prey with Hunter's ID
         * @param {Layer} layer - Layer to tag
         * @param {number} hunterId - Hunter's ID
         */
        tagPrey: function(layer, hunterId) {
            // Ensure hunterId is within range
            var safeId = Math.min(Math.max(hunterId, -999999), 999999);
            Effects.addSlider(layer, "BolasPro Target ID", safeId);
        },
        
        /**
         * Apply control sliders to prey
         * @param {Layer} prey - Prey layer
         * @param {number} snagPoint - Snag point (1-9)
         * @param {number} preyAnchor - Prey anchor (1-9)
         * @param {boolean} is3D - Whether hunter is 3D
         * @param {boolean} lockOrientation - Lock orientation enabled
         */
        applyPreyControls: function(prey, snagPoint, preyAnchor, is3D, lockOrientation) {
            // Add control sliders
            Effects.addSlider(prey, "BolasPro - Snag Point", snagPoint);
            Effects.addSlider(prey, "BolasPro - Prey Anchor", preyAnchor);
            
            // Lock Orientation: Checkbox (true/false)
            Effects.addCheckbox(prey, "BolasPro - Lock Orientation", lockOrientation);
            
            // Offset controls for fine-tuning position
            Effects.addSlider(prey, "BolasPro - Offset X", 0);
            Effects.addSlider(prey, "BolasPro - Offset Y", 0);
            if (is3D) {
                Effects.addSlider(prey, "BolasPro - Offset Z", 0);
            }
            
            // Delay controls for follow lag (in seconds)
            // Enables natural animations like fish fins, tails, hair
            Effects.addSlider(prey, "BolasPro - Position Delay", 0);
            Effects.addSlider(prey, "BolasPro - Rotation Delay", 0);
        },
        
        /**
         * Apply expressions to prey layer
         * @param {Layer} prey - Prey layer
         * @param {Layer} hunter - Hunter layer
         * @param {boolean} lockOrientation - Lock orientation enabled
         */
        applyExpressions: function(prey, hunter, lockOrientation) {
            var is3D = hunter.threeDLayer;
            
            // Position expression with index reference
            var posProp = prey.property(CONFIG.AE.TRANSFORM).property(CONFIG.AE.POSITION);
            posProp.expression = Expressions.position(hunter.index, hunter.name, is3D);
            
            // Anchor expression
            var anchorProp = prey.property(CONFIG.AE.TRANSFORM).property(CONFIG.AE.ANCHOR);
            anchorProp.expression = Expressions.anchor();
            
            // Enable 3D if hunter is 3D
            if (is3D && !prey.threeDLayer) {
                prey.threeDLayer = true;
            }
            
            // Apply rotation expressions for Lock Orientation
            // Always apply the expression - it checks the checkbox value internally
            try {
                if (prey.threeDLayer) {
                    // 3D layer - apply to X, Y, Z rotation + Orientation
                    var xRot = prey.property(CONFIG.AE.TRANSFORM).property(CONFIG.AE.ROTATION_X);
                    var yRot = prey.property(CONFIG.AE.TRANSFORM).property(CONFIG.AE.ROTATION_Y);
                    var zRot = prey.property(CONFIG.AE.TRANSFORM).property(CONFIG.AE.ROTATION);
                    
                    if (xRot && xRot.canSetExpression) xRot.expression = Expressions.rotation3D(hunter.index, hunter.name, 'x');
                    if (yRot && yRot.canSetExpression) yRot.expression = Expressions.rotation3D(hunter.index, hunter.name, 'y');
                    if (zRot && zRot.canSetExpression) zRot.expression = Expressions.rotation3D(hunter.index, hunter.name, 'z');
                    
                    // Apply Orientation expression for 3D layers
                    if (hunter.threeDLayer) {
                        var orientProp = prey.property(CONFIG.AE.TRANSFORM).property("ADBE Orientation");
                        if (orientProp && orientProp.canSetExpression) {
                            orientProp.expression = Expressions.orientation(hunter.index, hunter.name);
                        }
                    }
                } else {
                    // 2D layer - apply to rotation
                    var rot = prey.property(CONFIG.AE.TRANSFORM).property(CONFIG.AE.ROTATION);
                    if (rot && rot.canSetExpression) rot.expression = Expressions.rotation(hunter.index, hunter.name);
                }
            } catch(e) {
                // Rotation expression failed - not critical
            }
        },
        
        /**
         * Internal snag execution (no Undo group - for use in Chain)
         * @param {CompItem} comp - Composition
         * @param {Layer} hunter - Hunter layer
         * @param {Layer} prey - Prey layer
         * @param {number} snagPoint - Snag point (1-9)
         * @param {number} preyAnchor - Prey anchor (1-9)
         * @param {boolean} lockOrientation - Lock orientation to hunter
         * @returns {boolean} Success
         */
        _executeInternal: function(comp, hunter, prey, snagPoint, preyAnchor, lockOrientation) {
            var validation = this.validate(comp, hunter, prey);
            if (!validation.valid) {
                throw new Error(validation.error);
            }
            
            // Tag hunter
            var hunterId = this.tagHunter(hunter);
            
            // Tag and setup prey
            this.tagPrey(prey, hunterId);
            this.applyPreyControls(prey, snagPoint, preyAnchor, hunter.threeDLayer, lockOrientation);
            this.applyExpressions(prey, hunter, lockOrientation);
            
            return true;
        },
        
        /**
         * Execute snag operation (with Undo group)
         * @param {CompItem} comp - Composition
         * @param {Layer} hunter - Hunter layer
         * @param {Layer} prey - Prey layer
         * @param {number} snagPoint - Snag point (1-9)
         * @param {number} preyAnchor - Prey anchor (1-9)
         * @param {boolean} lockOrientation - Lock orientation to hunter
         * @returns {boolean} Success
         */
        execute: function(comp, hunter, prey, snagPoint, preyAnchor, lockOrientation) {
            StatusManager.info("Snagging layers...");
            
            app.beginUndoGroup(CONFIG.NAME + ": Snag");
            
            try {
                this._executeInternal(comp, hunter, prey, snagPoint, preyAnchor, lockOrientation);
                
                // Clear cache for affected layers
                Cache.clear();
                
                app.endUndoGroup();
                
                StatusManager.success("Snag complete! " + Utils.truncate(prey.name, 15) + " → " + Utils.truncate(hunter.name, 15));
                return true;
                
            } catch(e) {
                app.endUndoGroup();
                StatusManager.error("Snag failed: " + e.toString());
                return false;
            }
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // FREE - Core free operation
    // ═══════════════════════════════════════════════════════════════
    /**
     * @module Free
     * @description Releases layers from snag relationships
     */
    var Free = {
        /**
         * Bake expressions to values
         * @param {Layer} layer - Layer to bake
         */
        bakeExpressions: function(layer) {
            try {
                var t = layer.property(CONFIG.AE.TRANSFORM);
                var props = [CONFIG.AE.POSITION, CONFIG.AE.ANCHOR];
                for (var i = 0; i < props.length; i++) {
                    var p = t.property(props[i]);
                    if (p && p.expressionEnabled) {
                        var val = p.value;
                        p.expression = "";
                        p.expressionEnabled = false;
                        p.setValue(val);
                    }
                }
                
                // Bake rotation expressions
                if (layer.threeDLayer) {
                    // 3D layer
                    var rotProps = ['xRotation', 'yRotation', 'zRotation'];
                    for (var j = 0; j < rotProps.length; j++) {
                        if (layer[rotProps[j]] && layer[rotProps[j]].expressionEnabled) {
                            var rotVal = layer[rotProps[j]].value;
                            layer[rotProps[j]].expression = "";
                            layer[rotProps[j]].expressionEnabled = false;
                            layer[rotProps[j]].setValue(rotVal);
                        }
                    }
                } else {
                    // 2D layer
                    if (layer.rotation && layer.rotation.expressionEnabled) {
                        var rot2dVal = layer.rotation.value;
                        layer.rotation.expression = "";
                        layer.rotation.expressionEnabled = false;
                        layer.rotation.setValue(rot2dVal);
                    }
                }
            } catch(e) {}
        },
        
        /**
         * Free a single layer
         * @param {Layer} layer - Layer to free
         */
        freeLayer: function(layer) {
            this.bakeExpressions(layer);
            Effects.cleanup(layer);
        },
        
        /**
         * Internal free execution (no Undo group - for use in Chain.unchain)
         * @param {Layer} layer - Layer to free
         * @returns {boolean} Success
         */
        _executeInternal: function(layer) {
            var comp = layer.containingComp;
            var state = Detector.getState(layer);
            
            if (state.isHunter) {
                // Free all attached preys first
                var attached = Detector.findAttachedLayers(layer, comp);
                for (var i = 0; i < attached.length; i++) {
                    this.freeLayer(attached[i]);
                }
                // Free hunter
                this.freeLayer(layer);
            } else if (state.isPrey) {
                this.freeLayer(layer);
            }
            
            return true;
        },
        
        /**
         * Execute free operation (with Undo group)
         * @param {Layer} layer - Layer to free
         * @returns {boolean} Success
         */
        execute: function(layer) {
            // Validate
            var validation = Validator.layer(layer, "Free");
            if (!validation.valid) {
                StatusManager.error(validation.error);
                return false;
            }
            
            var comp = layer.containingComp;
            var state = Detector.getState(layer);
            
            if (state.isClean) {
                StatusManager.warning("Layer is not part of BolasPro system");
                return false;
            }
            
            StatusManager.info("Freeing layer...");
            
            app.beginUndoGroup(CONFIG.NAME + ": Free");
            
            try {
                var attached = [];
                if (state.isHunter) {
                    attached = Detector.findAttachedLayers(layer, comp);
                }
                
                this._executeInternal(layer);
                
                // Clear cache
                Cache.clear();
                
                app.endUndoGroup();
                
                if (state.isHunter) {
                    StatusManager.success("Freed Hunter + " + attached.length + " attached layer(s)");
                } else {
                    StatusManager.success("Freed Prey layer");
                }
                
                return true;
                
            } catch(e) {
                app.endUndoGroup();
                StatusManager.error("Free failed: " + e.toString());
                return false;
            }
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // PREY CONTROLS - Update prey sliders
    // ═══════════════════════════════════════════════════════════════
    /**
     * @module PreyControls
     * @description Updates prey control sliders
     */
    var PreyControls = {
        /**
         * Update prey control slider
         * @param {string} controlType - 'snagPoint' or 'preyAnchor'
         * @param {number} value - New value (1-9)
         */
        update: function(controlType, value) {
            var comp = app.project.activeItem;
            
            // Validate
            var validation = Validator.hasSelection(comp);
            if (!validation.valid) {
                StatusManager.error("Select Prey layer(s) first");
                return;
            }
            
            // Validate value
            var valueValidation = Validator.anchorNum(value);
            value = valueValidation.value;
            
            var sliderName = controlType === "snagPoint" 
                ? "BolasPro - Snag Point" 
                : "BolasPro - Prey Anchor";
            
            var displayName = controlType === "snagPoint" ? "Snag Point" : "Prey Anchor";
            
            app.beginUndoGroup(CONFIG.NAME + ": Update " + displayName);
            
            var count = 0;
            for (var i = 0; i < comp.selectedLayers.length; i++) {
                var layer = comp.selectedLayers[i];
                var fx = Effects.find(layer, sliderName);
                if (fx) {
                    fx.property(CONFIG.AE.SLIDER_VAL).setValue(value);
                    count++;
                }
            }
            
            app.endUndoGroup();
            
            if (count === 0) {
                StatusManager.warning("No Prey layers in selection");
            } else {
                StatusManager.success(displayName + " → " + value + " (" + count + " layer" + (count > 1 ? "s" : "") + ")");
            }
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // ORIENTATION CONTROL - Toggle Lock Orientation for Prey layers
    // ═══════════════════════════════════════════════════════════════
    /**
     * @module OrientationControl
     * @description Toggle Lock Orientation for selected Prey layers
     */
    var OrientationControl = {
        /**
         * Get current Lock Orientation state for a layer
         * @param {Layer} layer - AE layer
         * @returns {boolean} True if locked
         */
        isLocked: function(layer) {
            return Effects.getCheckboxValue(layer, "BolasPro - Lock Orientation") === true;
        },
        
        /**
         * Toggle Lock Orientation for selected Prey layers
         * If mixed states, will enable all. If all enabled, will disable all.
         */
        toggle: function() {
            var comp = app.project.activeItem;
            
            // Validate
            var validation = Validator.hasSelection(comp);
            if (!validation.valid) {
                StatusManager.error("Select Prey layer(s) first");
                return;
            }
            
            // Find prey layers and their current states
            var preyLayers = [];
            var lockedCount = 0;
            
            for (var i = 0; i < comp.selectedLayers.length; i++) {
                var layer = comp.selectedLayers[i];
                if (Detector.isPrey(layer)) {
                    preyLayers.push(layer);
                    if (this.isLocked(layer)) lockedCount++;
                }
            }
            
            if (preyLayers.length === 0) {
                StatusManager.warning("No Prey layers in selection");
                return;
            }
            
            // Determine new state: if all locked, unlock; otherwise lock all
            var newState = (lockedCount < preyLayers.length);
            var actionName = newState ? "Lock" : "Unlock";
            
            app.beginUndoGroup(CONFIG.NAME + ": " + actionName + " Orientation");
            
            try {
                for (var j = 0; j < preyLayers.length; j++) {
                    Effects.setCheckboxValue(preyLayers[j], "BolasPro - Lock Orientation", newState);
                }
                
                app.endUndoGroup();
                
                var stateText = newState ? "ON" : "OFF";
                StatusManager.success("Lock Orientation " + stateText + " (" + preyLayers.length + " layer" + (preyLayers.length > 1 ? "s" : "") + ")");
                
            } catch(e) {
                app.endUndoGroup();
                StatusManager.error("Toggle failed: " + e.toString());
            }
        },
        
        /**
         * Set Lock Orientation to specific state
         * @param {boolean} locked - True to lock, false to unlock
         */
        set: function(locked) {
            var comp = app.project.activeItem;
            
            // Validate
            var validation = Validator.hasSelection(comp);
            if (!validation.valid) {
                StatusManager.error("Select Prey layer(s) first");
                return;
            }
            
            var actionName = locked ? "Lock" : "Unlock";
            
            app.beginUndoGroup(CONFIG.NAME + ": " + actionName + " Orientation");
            
            var count = 0;
            for (var i = 0; i < comp.selectedLayers.length; i++) {
                var layer = comp.selectedLayers[i];
                if (Effects.setCheckboxValue(layer, "BolasPro - Lock Orientation", locked)) {
                    count++;
                }
            }
            
            app.endUndoGroup();
            
            if (count === 0) {
                StatusManager.warning("No Prey layers in selection");
            } else {
                var stateText = locked ? "ON" : "OFF";
                StatusManager.success("Lock Orientation " + stateText + " (" + count + " layer" + (count > 1 ? "s" : "") + ")");
            }
        }
    };


    // ═══════════════════════════════════════════════════════════════
    // CHAIN - Multi-layer chain linking system (v3.0)
    // ═══════════════════════════════════════════════════════════════
    /**
     * @module Chain
     * @description Creates and manages chains of linked layers
     */
    var Chain = {
        /**
         * Create chain from selected layers
         * @param {Array<Layer>} layers - Layers in order (first = root)
         * @param {Object} options - {lockOrientation, maintainOffset, snagPoint, preyAnchor}
         * @returns {{success: boolean, chainLength?: number, error?: string}}
         */
        create: function(layers, options) {
            // Validate minimum layers
            if (!layers || layers.length < 2) {
                return { success: false, error: "Select 2+ layers to chain" };
            }
            
            // Check for cycles before starting
            for (var i = 1; i < layers.length; i++) {
                if (Detector.detectCycle(layers[i-1], layers[i])) {
                    return { success: false, error: "Would create circular reference" };
                }
            }
            
            // Validate all layers
            for (var j = 0; j < layers.length; j++) {
                var validation = Validator.layer(layers[j], "Chain layer " + (j+1));
                if (!validation.valid) {
                    return { success: false, error: validation.error };
                }
            }
            
            app.beginUndoGroup(CONFIG.NAME + ": Chain " + layers.length + " layers");
            
            try {
                var opts = options || {};
                var snagPoint = opts.snagPoint || 5;
                var preyAnchor = opts.preyAnchor || 5;
                var lockOrientation = opts.lockOrientation || false;
                var maintainOffset = opts.maintainOffset || false;
                
                for (var k = 1; k < layers.length; k++) {
                    var leader = layers[k - 1];
                    var follower = layers[k];
                    var comp = leader.containingComp;
                    
                    // Calculate offset before snag if needed
                    var offset = null;
                    if (maintainOffset) {
                        offset = this._calculateOffset(leader, follower);
                    }
                    
                    // Use internal Snag (no nested Undo group)
                    Snag._executeInternal(comp, leader, follower, snagPoint, preyAnchor, lockOrientation);
                    
                    // Apply offset if needed
                    if (offset) {
                        this._applyOffset(follower, offset);
                    }
                }
                
                app.endUndoGroup();
                Cache.clear();
                
                return { success: true, chainLength: layers.length };
                
            } catch(e) {
                app.endUndoGroup();
                return { success: false, error: e.toString() };
            }
        },
        
        /**
         * Break chain at specific layer
         * @param {Layer} layer - Layer to unchain
         * @param {string} mode - "this" | "all" | "downstream"
         * @returns {{success: boolean, freedCount?: number, error?: string}}
         */
        unchain: function(layer, mode) {
            var validation = Validator.layer(layer, "Break");
            if (!validation.valid) {
                return { success: false, error: validation.error };
            }
            
            var state = Detector.getState(layer);
            if (state.isClean) {
                return { success: false, error: "Layer is not part of a chain" };
            }
            
            app.beginUndoGroup(CONFIG.NAME + ": Break Chain (" + mode + ")");
            
            try {
                var freedCount = 0;
                
                switch(mode) {
                    case "this":
                        // Unchain this layer only, reconnect followers to previous leader
                        var followers = this.getDirectFollowers(layer);
                        var leader = this.getLeader(layer);
                        
                        // Free this layer (use freeLayer directly, no nested Undo)
                        if (Detector.isPrey(layer)) {
                            Free.freeLayer(layer);
                            freedCount++;
                        }
                        
                        // Reconnect followers to previous leader
                        if (leader && followers.length > 0) {
                            for (var i = 0; i < followers.length; i++) {
                                this._reconnect(leader, followers[i]);
                            }
                        }
                        break;
                        
                    case "all":
                        // Break entire chain
                        var chain = this.getFullChain(layer);
                        for (var j = 0; j < chain.length; j++) {
                            if (Detector.isPrey(chain[j])) {
                                Free.freeLayer(chain[j]);
                                freedCount++;
                            }
                        }
                        // Also free root if it's a hunter
                        if (chain.length > 0 && Detector.isHunter(chain[0])) {
                            Effects.remove(chain[0], "BolasPro ID");
                        }
                        break;
                        
                    case "downstream":
                        // Break this and all followers
                        var downstream = this.getAllFollowers(layer);
                        
                        // Free this layer first
                        if (Detector.isPrey(layer)) {
                            Free.freeLayer(layer);
                            freedCount++;
                        }
                        
                        // Free all downstream
                        for (var m = 0; m < downstream.length; m++) {
                            if (Detector.isPrey(downstream[m])) {
                                Free.freeLayer(downstream[m]);
                                freedCount++;
                            }
                        }
                        break;
                        
                    default:
                        throw new Error("Invalid break mode: " + mode);
                }
                
                app.endUndoGroup();
                Cache.clear();
                
                return { success: true, freedCount: freedCount };
                
            } catch(e) {
                app.endUndoGroup();
                return { success: false, error: e.toString() };
            }
        },
        
        /**
         * Get full chain containing layer (from root to end)
         * @param {Layer} layer - Any layer in chain
         * @returns {Array<Layer>} All layers in chain order
         */
        getFullChain: function(layer) {
            var root = this.getRoot(layer);
            var chain = [root];
            var current = root;
            var maxDepth = 100;
            
            while (maxDepth-- > 0) {
                var followers = this.getDirectFollowers(current);
                if (followers.length === 0) break;
                
                // Take first follower (linear chain)
                chain.push(followers[0]);
                current = followers[0];
            }
            
            return chain;
        },
        
        /**
         * Get chain root (top-level leader that isn't a prey)
         * @param {Layer} layer - Any layer in chain
         * @returns {Layer} Root layer
         */
        getRoot: function(layer) {
            var current = layer;
            var maxDepth = 100;
            
            while (maxDepth-- > 0) {
                var leader = this.getLeader(current);
                if (!leader) return current;
                current = leader;
            }
            
            return current;
        },
        
        /**
         * Get leader of a layer (who it follows)
         * @param {Layer} layer - Prey layer
         * @returns {Layer|null} Leader layer or null
         */
        getLeader: function(layer) {
            var targetId = Effects.getSliderValue(layer, "BolasPro Target ID");
            if (!targetId) return null;
            
            var comp = layer.containingComp;
            for (var i = 1; i <= comp.numLayers; i++) {
                var id = Effects.getSliderValue(comp.layer(i), "BolasPro ID");
                if (id === targetId) return comp.layer(i);
            }
            
            return null;
        },
        
        /**
         * Get direct followers of a layer
         * @param {Layer} layer - Leader layer
         * @returns {Array<Layer>} Direct followers
         */
        getDirectFollowers: function(layer) {
            return Detector.findAttachedLayers(layer, layer.containingComp);
        },
        
        /**
         * Get all followers (recursive)
         * @param {Layer} layer - Leader layer
         * @returns {Array<Layer>} All downstream followers
         */
        getAllFollowers: function(layer) {
            var all = [];
            var direct = this.getDirectFollowers(layer);
            
            for (var i = 0; i < direct.length; i++) {
                all.push(direct[i]);
                var sub = this.getAllFollowers(direct[i]);
                for (var j = 0; j < sub.length; j++) {
                    all.push(sub[j]);
                }
            }
            
            return all;
        },
        
        /**
         * Get chain visualization string
         * @param {Layer} layer - Any layer in chain
         * @returns {string} "A → B → C → D"
         */
        visualize: function(layer) {
            var chain = this.getFullChain(layer);
            var names = [];
            
            for (var i = 0; i < chain.length; i++) {
                var name = chain[i].name;
                // Truncate long names
                if (name.length > 12) {
                    name = name.substring(0, 10) + "..";
                }
                names.push(name);
            }
            
            return names.join(" → ");
        },
        
        /**
         * Get chain length
         * @param {Layer} layer - Any layer in chain
         * @returns {number} Number of layers in chain
         */
        getLength: function(layer) {
            return this.getFullChain(layer).length;
        },
        
        /**
         * Check if layer is part of a chain
         * @param {Layer} layer - Layer to check
         * @returns {boolean}
         */
        isInChain: function(layer) {
            var state = Detector.getState(layer);
            return state.isHunter || state.isPrey;
        },
        
        /**
         * Get position in chain (0 = root, -1 = not in chain)
         * @param {Layer} layer - Layer to check
         * @returns {number} Position index
         */
        getPosition: function(layer) {
            if (!this.isInChain(layer)) return -1;
            
            var chain = this.getFullChain(layer);
            for (var i = 0; i < chain.length; i++) {
                if (chain[i].index === layer.index) return i;
            }
            return -1;
        },
        
        /**
         * Select all layers in chain
         * @param {Layer} layer - Any layer in chain
         */
        selectAll: function(layer) {
            var chain = this.getFullChain(layer);
            var comp = layer.containingComp;
            
            // Deselect all first
            for (var i = 1; i <= comp.numLayers; i++) {
                comp.layer(i).selected = false;
            }
            
            // Select chain members
            for (var j = 0; j < chain.length; j++) {
                chain[j].selected = true;
            }
        },
        
        // ═══════════════════════════════════════════════════════════
        // Private helpers
        // ═══════════════════════════════════════════════════════════
        
        /**
         * Calculate offset between leader and follower
         * @private
         */
        _calculateOffset: function(leader, follower) {
            var time = leader.containingComp.time;
            var leaderPos = leader.position.valueAtTime(time, false);
            var followerPos = follower.position.valueAtTime(time, false);
            
            return [
                followerPos[0] - leaderPos[0],
                followerPos[1] - leaderPos[1],
                (followerPos[2] || 0) - (leaderPos[2] || 0)
            ];
        },
        
        /**
         * Apply offset to layer's offset sliders
         * @private
         */
        _applyOffset: function(layer, offset) {
            // Set offset slider values
            var fxX = Effects.find(layer, "BolasPro - Offset X");
            var fxY = Effects.find(layer, "BolasPro - Offset Y");
            
            if (fxX) fxX.property(CONFIG.AE.SLIDER_VAL).setValue(offset[0]);
            if (fxY) fxY.property(CONFIG.AE.SLIDER_VAL).setValue(offset[1]);
            
            if (layer.threeDLayer) {
                var fxZ = Effects.find(layer, "BolasPro - Offset Z");
                if (fxZ) fxZ.property(CONFIG.AE.SLIDER_VAL).setValue(offset[2]);
            }
        },
        
        /**
         * Reconnect follower to new leader (internal, no Undo group)
         * @private
         */
        _reconnect: function(leader, follower) {
            var comp = leader.containingComp;
            
            // Get current settings from follower
            var snagPoint = Effects.getSliderValue(follower, "BolasPro - Snag Point") || 5;
            var preyAnchor = Effects.getSliderValue(follower, "BolasPro - Prey Anchor") || 5;
            var lockOrientation = Effects.getCheckboxValue(follower, "BolasPro - Lock Orientation") || false;
            
            // Free follower first (use freeLayer directly)
            Free.freeLayer(follower);
            
            // Re-snag to new leader (use internal, no nested Undo)
            Snag._executeInternal(comp, leader, follower, snagPoint, preyAnchor, lockOrientation);
        }
    };


    // ═══════════════════════════════════════════════════════════════
    // UI BUILDER - User interface (Single Responsibility)
    // ═══════════════════════════════════════════════════════════════
    /**
     * @module UI
     * @description Builds and manages the user interface
     */
    var UI = {
        /**
         * Create anchor grid buttons
         * @param {Group} parent - Parent container
         * @param {boolean} isSource - Is source anchor grid
         * @returns {Array<Button>} Grid buttons
         */
        createAnchorGrid: function(parent, isSource) {
            var group = parent.add("group");
            group.orientation = "column";
            group.spacing = 3;
            
            var buttons = [];
            for (var r = 0; r < 3; r++) {
                var row = group.add("group");
                row.orientation = "row";
                row.spacing = 3;
                
                for (var c = 0; c < 3; c++) {
                    var num = r * 3 + c + 1;
                    var btn = row.add("button", undefined, String(num));
                    btn.preferredSize = [32, 32];
                    btn.anchorNum = num;
                    btn.helpTip = "Anchor " + num;
                    buttons.push(btn);
                }
            }
            return buttons;
        },
        
        /**
         * Create quick anchor grid with symbols
         * @param {Group} parent - Parent container
         * @returns {Array<Button>} Grid buttons
         */
        createQuickAnchorGrid: function(parent) {
            var symbols = ["◤","▲","◥","◀","●","▶","◣","▼","◢"];
            var group = parent.add("group");
            group.orientation = "column";
            group.spacing = 3;
            
            var buttons = [];
            for (var r = 0; r < 3; r++) {
                var row = group.add("group");
                row.orientation = "row";
                row.spacing = 3;
                
                for (var c = 0; c < 3; c++) {
                    var idx = r * 3 + c;
                    var btn = row.add("button", undefined, symbols[idx]);
                    btn.preferredSize = [36, 36];
                    btn.anchorNum = idx + 1;
                    btn.helpTip = "Set Anchor " + (idx + 1);
                    buttons.push(btn);
                }
            }
            return buttons;
        },
        
        /**
         * Create prey control grid
         * @param {Group} parent - Parent container
         * @param {string} type - Control type
         * @returns {Array<Button>} Grid buttons
         */
        createPreyGrid: function(parent, type) {
            var symbols = ["◤","▲","◥","◀","●","▶","◣","▼","◢"];
            var group = parent.add("group");
            group.orientation = "column";
            group.spacing = 2;
            
            var buttons = [];
            for (var r = 0; r < 3; r++) {
                var row = group.add("group");
                row.orientation = "row";
                row.spacing = 2;
                
                for (var c = 0; c < 3; c++) {
                    var idx = r * 3 + c;
                    var btn = row.add("button", undefined, symbols[idx]);
                    btn.preferredSize = [28, 28];
                    btn.anchorNum = idx + 1;
                    btn.controlType = type;
                    buttons.push(btn);
                }
            }
            return buttons;
        },
        
        /**
         * Populate dropdown with layers
         * @param {DropDownList} dropdown - Dropdown to populate
         * @param {CompItem} comp - Composition
         * @param {boolean} preserve - Preserve selection
         * @param {Layer} excludeLayer - Layer to exclude
         */
        populateDropdown: function(dropdown, comp, preserve, excludeLayer) {
            var selected = preserve && dropdown.selection ? dropdown.selection.text : null;
            dropdown.removeAll();
            
            if (!comp) return;
            
            for (var i = 1; i <= comp.numLayers; i++) {
                var layer = comp.layer(i);
                
                // Skip excluded layer (e.g., Hunter shouldn't appear in Prey list)
                if (excludeLayer && layer.index === excludeLayer.index) continue;
                
                var name = Utils.truncate(layer.name, 30);
                var item = dropdown.add("item", name);
                item.layer = layer;
                if (name === selected) dropdown.selection = item;
            }
        },
        
        /**
         * Build the complete UI
         * @param {Object} thisObj - Script context
         * @returns {Object} UI elements
         */
        build: function(thisObj) {
            var win = (thisObj instanceof Panel) 
                ? thisObj 
                : new Window("palette", CONFIG.NAME + " v" + CONFIG.VERSION, undefined, {resizeable: true});
            
            win.orientation = "column";
            win.alignChildren = ["fill", "top"];
            win.spacing = 8;
            win.margins = 10;
            
            // === HEADER ===
            var header = win.add("group");
            header.alignment = ["fill", "top"];
            var title = header.add("statictext", undefined, CONFIG.NAME + " v" + CONFIG.VERSION);
            try {
                title.graphics.font = ScriptUI.newFont("Arial", "BOLD", 14);
                title.graphics.foregroundColor = title.graphics.newPen(title.graphics.PenType.SOLID_COLOR, [0.4,0.7,1,1], 1);
            } catch(e) {}
            
            // === SMART CHAIN (Hunter Selection) ===
            var chainPanel = win.add("panel", undefined, "Smart Chain");
            chainPanel.alignChildren = ["fill", "top"];
            chainPanel.margins = 8;
            
            // Hunter selection row
            var hunterRow = chainPanel.add("group");
            hunterRow.alignment = ["fill", "center"];
            hunterRow.spacing = 5;
            
            hunterRow.add("statictext", undefined, "Hunter:");
            var rootDropdown = hunterRow.add("dropdownlist", undefined, []);
            rootDropdown.preferredSize = [140, 25];
            rootDropdown.helpTip = "Select Hunter from selected layers";
            
            var refreshRootBtn = hunterRow.add("button", undefined, "🔄");
            refreshRootBtn.preferredSize = [28, 25];
            refreshRootBtn.helpTip = "Refresh list";
            
            // Order selection row (radio buttons)
            var orderRow = chainPanel.add("group");
            orderRow.alignment = ["center", "center"];
            orderRow.spacing = 15;
            
            var ascRadio = orderRow.add("radiobutton", undefined, "↑ Asc");
            ascRadio.value = true;
            ascRadio.helpTip = "Prey: lowest index first";
            
            var descRadio = orderRow.add("radiobutton", undefined, "↓ Desc");
            descRadio.helpTip = "Prey: highest index first";
            
            // === ANCHOR GRIDS ===
            var anchorGroup = win.add("group");
            anchorGroup.orientation = "row";
            anchorGroup.alignChildren = ["center", "top"];
            anchorGroup.spacing = 15;
            
            var srcPanel = anchorGroup.add("panel", undefined, "Source Anchor");
            srcPanel.alignChildren = ["center", "center"];
            srcPanel.margins = 8;
            var srcBtns = this.createAnchorGrid(srcPanel, true);
            
            var attPanel = anchorGroup.add("panel", undefined, "Attached Anchor");
            attPanel.alignChildren = ["center", "center"];
            attPanel.margins = 8;
            var attBtns = this.createAnchorGrid(attPanel, false);
            
            // === CHAIN VIEW ===
            var chainViewPanel = win.add("panel", undefined, "Chain View");
            chainViewPanel.alignChildren = ["fill", "top"];
            chainViewPanel.margins = 8;
            
            var chainViewText = chainViewPanel.add("statictext", undefined, "No chain selected");
            chainViewText.alignment = ["fill", "center"];
            chainViewText.preferredSize = [200, 20];
            
            var chainViewBtnRow = chainViewPanel.add("group");
            chainViewBtnRow.alignment = ["center", "center"];
            chainViewBtnRow.spacing = 8;
            
            var selectAllChainBtn = chainViewBtnRow.add("button", undefined, "Select All");
            selectAllChainBtn.preferredSize = [70, 24];
            selectAllChainBtn.helpTip = "Select all layers in chain";
            
            var unchainBtn = chainViewBtnRow.add("button", undefined, "✂ Unchain");
            unchainBtn.preferredSize = [70, 24];
            unchainBtn.helpTip = "Break chain for selected layer";
            
            var breakAllChainBtn = chainViewBtnRow.add("button", undefined, "Break All");
            breakAllChainBtn.preferredSize = [70, 24];
            breakAllChainBtn.helpTip = "Break entire chain";

            // === OPTIONS ===
            var optPanel = win.add("panel", undefined, "Options");
            optPanel.alignChildren = ["fill", "top"];
            optPanel.margins = 8;
            
            var lockCheck = optPanel.add("checkbox", undefined, "Lock Orientation");
            lockCheck.value = State.get('lockOrientation');
            lockCheck.helpTip = "Lock prey rotation to hunter";
            
            var maintainOffsetCheck = optPanel.add("checkbox", undefined, "Maintain Offset");
            maintainOffsetCheck.value = false;
            maintainOffsetCheck.helpTip = "Preserve original distances when chaining";
            
            var toggleRow = optPanel.add("group");
            toggleRow.orientation = "row";
            toggleRow.alignChildren = ["left", "center"];
            
            var toggleLockBtn = toggleRow.add("button", undefined, "Toggle Lock (Selected)");
            toggleLockBtn.preferredSize = [140, 24];
            toggleLockBtn.helpTip = "Toggle Lock Orientation ON/OFF for selected Prey layers";
            
            // === QUICK ANCHOR ===
            var quickPanel = win.add("panel", undefined, "Quick Anchor (Selected)");
            quickPanel.alignChildren = ["center", "center"];
            quickPanel.margins = 8;
            var quickBtns = this.createQuickAnchorGrid(quickPanel);
            
            // === PREY CONTROLS ===
            var preyCtrlPanel = win.add("panel", undefined, "Prey Controls");
            preyCtrlPanel.orientation = "row";
            preyCtrlPanel.alignChildren = ["center", "top"];
            preyCtrlPanel.margins = 8;
            preyCtrlPanel.spacing = 20;
            
            var snagGrp = preyCtrlPanel.add("group");
            snagGrp.orientation = "column";
            snagGrp.add("statictext", undefined, "Snag Point");
            var snagBtns = this.createPreyGrid(snagGrp, "snagPoint");
            
            var preyAnchorGrp = preyCtrlPanel.add("group");
            preyAnchorGrp.orientation = "column";
            preyAnchorGrp.add("statictext", undefined, "Prey Anchor");
            var preyAnchorBtns = this.createPreyGrid(preyAnchorGrp, "preyAnchor");
            
            // === ACTION BUTTONS ===
            var btnGroup = win.add("group");
            btnGroup.alignment = ["center", "center"];
            btnGroup.spacing = 15;
            
            var snagBtn = btnGroup.add("button", undefined, "Snag");
            snagBtn.preferredSize = [70, 28];
            snagBtn.helpTip = "Link Prey to Hunter";
            
            var freeBtn = btnGroup.add("button", undefined, "Free");
            freeBtn.preferredSize = [70, 28];
            freeBtn.helpTip = "Release selected layer(s)";
            
            // === STATUS BAR ===
            var statusBar = win.add("group");
            statusBar.alignment = ["fill", "bottom"];
            statusBar.margins = [5, 5, 5, 5];
            
            var statusText = statusBar.add("statictext", undefined, "Ready");
            statusText.alignment = ["fill", "center"];
            statusText.preferredSize = [200, 20];
            
            // === RESIZE ===
            win.onResizing = win.onResize = function() { this.layout.resize(); };
            win.layout.layout(true);
            
            return {
                win: win,
                srcBtns: srcBtns,
                attBtns: attBtns,
                quickBtns: quickBtns,
                snagBtns: snagBtns,
                preyAnchorBtns: preyAnchorBtns,
                lockCheck: lockCheck,
                maintainOffsetCheck: maintainOffsetCheck,
                toggleLockBtn: toggleLockBtn,
                snagBtn: snagBtn,
                freeBtn: freeBtn,
                // Smart Chain UI elements
                rootDropdown: rootDropdown,
                refreshRootBtn: refreshRootBtn,
                ascRadio: ascRadio,
                descRadio: descRadio,
                // Chain View UI elements
                unchainBtn: unchainBtn,
                chainViewText: chainViewText,
                selectAllChainBtn: selectAllChainBtn,
                breakAllChainBtn: breakAllChainBtn,
                statusText: statusText
            };
        }
    };


    // ═══════════════════════════════════════════════════════════════
    // APP - Main application controller
    // ═══════════════════════════════════════════════════════════════
    /**
     * @module App
     * @description Main application controller - orchestrates all modules
     */
    var App = {
        ui: null,
        
        /**
         * Initialize the application
         */
        init: function() {
            // Load saved state
            State.loadAll();
            
            // Build UI
            this.ui = UI.build(thisObj);
            
            // Initialize status manager
            StatusManager.init(this.ui.statusText);
            
            // Bind events
            this.bindEvents();
            
            // Select default anchors
            this.selectDefaultAnchors();
            
            // Setup cleanup
            this.setupCleanup();
            
            // Show window
            this.show();
            
            // Initial updates
            this.updateRootDropdown();
            this.updateChainView();
            
            StatusManager.info("BolasPro v" + CONFIG.VERSION + " ready");
        },
        
        /**
         * Setup cleanup handlers
         */
        setupCleanup: function() {
            var self = this;
            
            // Cleanup on window close
            this.ui.win.onClose = function() {
                // Clear cache
                Cache.clear();
                
                // Cleanup status manager
                StatusManager.cleanup();
                
                // Null UI references
                self.ui = null;
                
                return true; // Allow close
            };
        },
        
        /**
         * Select default anchor buttons (center)
         */
        selectDefaultAnchors: function() {
            // Select saved or center (5) by default
            var srcIdx = State.get('sourceAnchor') - 1;
            var attIdx = State.get('attachedAnchor') - 1;
            
            this.highlightAnchor(this.ui.srcBtns, srcIdx, true);
            this.highlightAnchor(this.ui.attBtns, attIdx, false);
        },
        
        /**
         * Highlight selected anchor button
         * @param {Array<Button>} buttons - Button array
         * @param {number} index - Button index (0-8)
         * @param {boolean} isSource - Is source anchor
         */
        highlightAnchor: function(buttons, index, isSource) {
            for (var i = 0; i < buttons.length; i++) {
                buttons[i].text = String(i + 1);
            }
            if (buttons[index]) {
                buttons[index].text = "●";
            }
            State.set(isSource ? 'sourceAnchor' : 'attachedAnchor', index + 1);
        },
        
        /**
         * Bind all UI events
         */
        bindEvents: function() {
            var self = this;
            
            // Window activate - auto refresh
            this.ui.win.onActivate = function() { 
                self.updateChainView();
            };
            
            // Lock orientation checkbox
            this.ui.lockCheck.onClick = function() {
                State.set('lockOrientation', this.value);
                State.save('lockOrientation');
            };
            
            // Toggle Lock Orientation button (for existing prey)
            this.ui.toggleLockBtn.onClick = function() {
                OrientationControl.toggle();
            };
            
            // Source anchor buttons
            for (var i = 0; i < this.ui.srcBtns.length; i++) {
                (function(btn, idx) {
                    btn.onClick = function() {
                        self.highlightAnchor(self.ui.srcBtns, idx, true);
                        State.save('sourceAnchor');
                    };
                })(this.ui.srcBtns[i], i);
            }
            
            // Attached anchor buttons
            for (var j = 0; j < this.ui.attBtns.length; j++) {
                (function(btn, idx) {
                    btn.onClick = function() {
                        self.highlightAnchor(self.ui.attBtns, idx, false);
                        State.save('attachedAnchor');
                    };
                })(this.ui.attBtns[j], j);
            }
            
            // Quick anchor buttons
            for (var k = 0; k < this.ui.quickBtns.length; k++) {
                (function(btn) {
                    btn.onClick = function() {
                        Anchor.setForSelected(this.anchorNum);
                    };
                })(this.ui.quickBtns[k]);
            }
            
            // Prey control buttons (Snag Point)
            for (var m = 0; m < this.ui.snagBtns.length; m++) {
                (function(btn) {
                    btn.onClick = function() {
                        PreyControls.update("snagPoint", this.anchorNum);
                    };
                })(this.ui.snagBtns[m]);
            }
            
            // Prey control buttons (Prey Anchor)
            for (var n = 0; n < this.ui.preyAnchorBtns.length; n++) {
                (function(btn) {
                    btn.onClick = function() {
                        PreyControls.update("preyAnchor", this.anchorNum);
                    };
                })(this.ui.preyAnchorBtns[n]);
            }
            
            // Snag button
            this.ui.snagBtn.onClick = function() { self.onSnag(); };
            
            // Free button
            this.ui.freeBtn.onClick = function() { self.onFree(); };
            
            // === SMART CHAIN EVENTS ===
            
            // Refresh root button
            this.ui.refreshRootBtn.onClick = function() { 
                self.updateRootDropdown();
            };
            
            // === CHAIN VIEW EVENTS ===
            
            // Unchain button
            this.ui.unchainBtn.onClick = function() { self.onUnchain(); };
            
            // Select All Chain button
            this.ui.selectAllChainBtn.onClick = function() { self.onSelectAllChain(); };
            
            // Break All Chain button
            this.ui.breakAllChainBtn.onClick = function() { self.onBreakAllChain(); };
        },
        
        /**
         * Update root dropdown with selected layers only
         */
        updateRootDropdown: function() {
            var comp = app.project.activeItem;
            var dropdown = this.ui.rootDropdown;
            
            dropdown.removeAll();
            
            if (!comp || !comp.selectedLayers || comp.selectedLayers.length < 2) {
                var item = dropdown.add("item", "Select 2+ layers");
                dropdown.selection = 0;
                dropdown.enabled = false;
                return;
            }
            
            dropdown.enabled = true;
            
            // Add only selected layers (sorted by index for clarity)
            var layers = [];
            for (var i = 0; i < comp.selectedLayers.length; i++) {
                layers.push(comp.selectedLayers[i]);
            }
            layers.sort(function(a, b) { return a.index - b.index; });
            
            // Remember current selection
            var previousSelection = dropdown.selection ? dropdown.selection.text : null;
            
            for (var j = 0; j < layers.length; j++) {
                var layer = layers[j];
                var name = Utils.truncate(layer.name, 20);
                var itemText = layer.index + ": " + name;
                var item = dropdown.add("item", itemText);
                item.layer = layer;
            }
            
            // Restore previous selection if possible, otherwise select first
            var restored = false;
            if (previousSelection) {
                for (var k = 0; k < dropdown.items.length; k++) {
                    if (dropdown.items[k].text === previousSelection) {
                        dropdown.selection = k;
                        restored = true;
                        break;
                    }
                }
            }
            if (!restored) {
                dropdown.selection = 0;
            }
        },
        
        /**
         * Update chain view display
         */
        updateChainView: function() {
            var comp = app.project.activeItem;
            if (!comp || !comp.selectedLayers || comp.selectedLayers.length === 0) {
                this.ui.chainViewText.text = "No chain selected";
                return;
            }
            
            var layer = comp.selectedLayers[0];
            if (Chain.isInChain(layer)) {
                var viz = Chain.visualize(layer);
                var len = Chain.getLength(layer);
                this.ui.chainViewText.text = viz + " (" + len + " layers)";
            } else {
                this.ui.chainViewText.text = "Layer not in chain";
            }
        },
        
        /**
         * Handle Unchain button click - shows break options
         */
        onUnchain: function() {
            var comp = app.project.activeItem;
            
            // Validate selection
            var validation = Validator.hasSelection(comp);
            if (!validation.valid) {
                StatusManager.error("Select a layer to unchain");
                return;
            }
            
            var layer = comp.selectedLayers[0];
            
            if (!Chain.isInChain(layer)) {
                StatusManager.warning("Layer is not part of a chain");
                return;
            }
            
            // Show break options dialog
            this.showBreakDialog(layer);
        },
        
        /**
         * Show break options dialog
         * @param {Layer} layer - Layer to break
         */
        showBreakDialog: function(layer) {
            var self = this;
            var dlg = new Window("dialog", "Break Chain Options");
            dlg.orientation = "column";
            dlg.alignChildren = ["fill", "top"];
            dlg.spacing = 10;
            dlg.margins = 15;
            
            // Info text
            var chainViz = Chain.visualize(layer);
            var pos = Chain.getPosition(layer);
            var len = Chain.getLength(layer);
            
            dlg.add("statictext", undefined, "Chain: " + chainViz);
            dlg.add("statictext", undefined, "Position: " + (pos + 1) + " of " + len);
            
            // Separator
            dlg.add("panel", undefined, "").preferredSize = [200, 2];
            
            // Options
            var optGroup = dlg.add("group");
            optGroup.orientation = "column";
            optGroup.alignChildren = ["left", "top"];
            optGroup.spacing = 8;
            
            var thisOnlyRb = optGroup.add("radiobutton", undefined, "Unchain this layer only");
            thisOnlyRb.value = true;
            thisOnlyRb.helpTip = "Remove this layer from chain, reconnect followers";
            
            var downstreamRb = optGroup.add("radiobutton", undefined, "Break this + downstream");
            downstreamRb.helpTip = "Break this layer and all followers";
            
            var allRb = optGroup.add("radiobutton", undefined, "Break entire chain");
            allRb.helpTip = "Free all layers in the chain";
            
            // Smart detection - disable unavailable options
            if (pos === 0) {
                // Root layer - can't unchain "this only" (nothing to reconnect to)
                thisOnlyRb.enabled = false;
                downstreamRb.value = true;
            }
            if (pos === len - 1) {
                // End layer - downstream is same as "this only"
                downstreamRb.enabled = false;
            }
            
            // Buttons
            var btnGroup = dlg.add("group");
            btnGroup.alignment = ["center", "center"];
            btnGroup.spacing = 15;
            
            var okBtn = btnGroup.add("button", undefined, "Break", {name: "ok"});
            var cancelBtn = btnGroup.add("button", undefined, "Cancel", {name: "cancel"});
            
            okBtn.onClick = function() {
                var mode = "this";
                if (downstreamRb.value) mode = "downstream";
                if (allRb.value) mode = "all";
                
                var result = Chain.unchain(layer, mode);
                
                if (result.success) {
                    StatusManager.success("Freed " + result.freedCount + " layer(s)");
                    self.updateRootDropdown();
                    self.updateChainView();
                } else {
                    StatusManager.error(result.error);
                }
                
                dlg.close();
            };
            
            cancelBtn.onClick = function() {
                dlg.close();
            };
            
            dlg.center();
            dlg.show();
        },
        
        /**
         * Handle Select All Chain button
         */
        onSelectAllChain: function() {
            var comp = app.project.activeItem;
            
            var validation = Validator.hasSelection(comp);
            if (!validation.valid) {
                StatusManager.error("Select a layer in a chain first");
                return;
            }
            
            var layer = comp.selectedLayers[0];
            
            if (!Chain.isInChain(layer)) {
                StatusManager.warning("Layer is not part of a chain");
                return;
            }
            
            Chain.selectAll(layer);
            var len = Chain.getLength(layer);
            StatusManager.success("Selected " + len + " layers in chain");
            this.updateChainView();
        },
        
        /**
         * Handle Break All Chain button
         */
        onBreakAllChain: function() {
            var comp = app.project.activeItem;
            
            var validation = Validator.hasSelection(comp);
            if (!validation.valid) {
                StatusManager.error("Select a layer in a chain first");
                return;
            }
            
            var layer = comp.selectedLayers[0];
            
            if (!Chain.isInChain(layer)) {
                StatusManager.warning("Layer is not part of a chain");
                return;
            }
            
            var result = Chain.unchain(layer, "all");
            
            if (result.success) {
                StatusManager.success("Freed " + result.freedCount + " layer(s)");
                this.updateRootDropdown();
                this.updateChainView();
            } else {
                StatusManager.error(result.error);
            }
        },
        
        /**
         * Handle Snag button click
         * Supports both single snag and Smart Chain
         */
        onSnag: function() {
            var comp = app.project.activeItem;
            
            // Validate comp
            var compValidation = Validator.comp(comp);
            if (!compValidation.valid) {
                StatusManager.error(compValidation.error);
                return;
            }
            
            // Check if Smart Chain mode (Hunter selected from rootDropdown)
            var rootItem = this.ui.rootDropdown.selection;
            if (!rootItem || !rootItem.layer) {
                StatusManager.error("Select Hunter from dropdown first");
                return;
            }
            
            if (comp.selectedLayers.length < 2) {
                StatusManager.error("Select 2+ layers");
                return;
            }
            
            // Use Smart Chain
            this.onSmartChain();
        },
        
        /**
         * Handle Smart Chain (uses rootDropdown for Hunter, rest are Prey)
         */
        onSmartChain: function() {
            var comp = app.project.activeItem;
            
            // Get hunter from rootDropdown
            var rootItem = this.ui.rootDropdown.selection;
            if (!rootItem || !rootItem.layer) {
                StatusManager.error("Select Hunter from dropdown");
                return;
            }
            var hunter = rootItem.layer;
            
            
            // Get remaining selected layers (Prey)
            var others = [];
            for (var i = 0; i < comp.selectedLayers.length; i++) {
                var layer = comp.selectedLayers[i];
                if (layer.index !== hunter.index) {
                    others.push(layer);
                }
            }
            
            if (others.length === 0) {
                StatusManager.error("Need at least 1 Prey layer");
                return;
            }
            
            // Sort by index based on radio selection
            var ascending = this.ui.ascRadio.value;
            others.sort(function(a, b) {
                return ascending ? (a.index - b.index) : (b.index - a.index);
            });
            
            // Build layers array: [hunter, ...sorted others]
            var layers = [hunter];
            for (var j = 0; j < others.length; j++) {
                layers.push(others[j]);
            }
            
            // Get options
            var options = {
                snagPoint: State.get('sourceAnchor'),
                preyAnchor: State.get('attachedAnchor'),
                lockOrientation: this.ui.lockCheck.value,
                maintainOffset: this.ui.maintainOffsetCheck.value
            };
            
            var result = Chain.create(layers, options);
            
            if (result.success) {
                var order = ascending ? "↑" : "↓";
                StatusManager.success(order + " Chained " + result.chainLength + " layers");
                this.updateRootDropdown();
                this.updateChainView();
            } else {
                StatusManager.error(result.error);
            }
        },
        
        /**
         * Handle Free button click
         */
        onFree: function() {
            var comp = app.project.activeItem;
            
            // Validate selection
            var validation = Validator.hasSelection(comp);
            if (!validation.valid) {
                StatusManager.error("Please select a layer to free");
                return;
            }
            
            // Free first selected layer
            if (Free.execute(comp.selectedLayers[0])) {
                this.updateRootDropdown();
            }
        },
        
        /**
         * Show the window
         */
        show: function() {
            if (this.ui.win instanceof Window) {
                this.ui.win.center();
                this.ui.win.show();
            }
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // ENTRY POINT
    // ═══════════════════════════════════════════════════════════════
    App.init();

})(this);
