/**
 * BolasPro v5.0 - DataLoader Module
 * Loads and manages JSON configuration files
 * 
 * Dependencies: JSONPolyfill.jsx
 */

// Capture script file location at evaluation time
var _dataLoaderScriptFile = (function() {
    try {
        if (typeof $.fileName !== 'undefined' && $.fileName) {
            return new File($.fileName);
        }
    } catch(e) {}
    return null;
})();

var DataLoader = {
    // ═══════════════════════════════════════════════════════════════
    // PRIVATE STATE
    // ═══════════════════════════════════════════════════════════════
    _cache: {
        controllers: null,
        cleanupProfiles: null,
        presets: {}
    },
    _basePath: null,
    _initialized: false,

    // ═══════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Set explicit base path for data folder
     * @param {string} path - Absolute path to data directory
     */
    setBasePath: function(path) {
        if (path) {
            this._basePath = path.replace(/\\/g, '/');
            if (this._basePath.charAt(this._basePath.length - 1) !== '/') {
                this._basePath += '/';
            }
            this.reload();
        }
    },
    
    /**
     * Initialize DataLoader - loads all JSON config files
     * @param {string} [customPath] - Optional custom path to data folder
     * @returns {boolean} Success status
     */
    init: function(customPath) {
        if (customPath) {
            this._basePath = customPath.replace(/\\/g, '/');
            if (this._basePath.charAt(this._basePath.length - 1) !== '/') {
                this._basePath += '/';
            }
            this._initialized = false;
        }
        
        if (this._initialized) return true;
        
        try {
            // Determine base path from script location if not set
            if (!this._basePath) {
                this._basePath = this._getBasePath();
            }
            
            // Load core configuration files
            this._cache.controllers = this._loadJSON('controllers.json');
            this._cache.cleanupProfiles = this._loadJSON('cleanup-profiles.json');
            
            // Load presets
            this._cache.presets.hunter = this._loadJSON('presets/hunter.json');
            this._cache.presets.prey = this._loadJSON('presets/prey.json');
            this._cache.presets.hunterPrey = this._loadJSON('presets/hunter-prey.json');
            
            // Validate loaded data
            // Validate loaded data with embedded fallback
            if (!this._cache.controllers || !this._cache.controllers.controllers) {
                $.writeln("[DataLoader] Applying embedded fallback controllers...");
                var fallback = this._getEmbeddedFallback();
                this._cache.controllers = { controllers: fallback.controllers };
                this._cache.presets.hunter = fallback.presets.hunter;
                this._cache.presets.prey = fallback.presets.prey;
            }
            
            this._initialized = true;
            $.writeln("[DataLoader] Initialized - " + 
                (function(obj){ var c=0; for(var k in obj){ if(Object.prototype.hasOwnProperty.call(obj, k)) c++; } return c; })(this._cache.controllers.controllers) + " controllers loaded from " + this._basePath);
            
            return true;
        } catch(e) {
            $.writeln("[DataLoader] Init error: " + (e ? (e.message || String(e)) : "unknown"));
            return false;
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // PUBLIC API - Controllers
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Get controller definition by ID
     * @param {string} id - Controller ID (e.g., 'ID', 'TARGET_ID')
     * @returns {Object|null} Controller definition
     */
    getController: function(id) {
        if (!this._initialized) this.init();
        if (!this._cache.controllers) return null;
        return this._cache.controllers.controllers[id] || null;
    },
    
    /**
     * Get all controller definitions
     * @returns {Object} All controllers
     */
    getAllControllers: function() {
        if (!this._initialized) this.init();
        return this._cache.controllers ? this._cache.controllers.controllers : {};
    },
    
    /**
     * Get controller group by ID
     * @param {string} groupId - Group ID (e.g., 'prey_full', 'all')
     * @returns {Array|null} Array of controller IDs
     */
    getGroup: function(groupId) {
        if (!this._initialized) this.init();
        if (!this._cache.controllers || !this._cache.controllers.groups) return null;
        
        var group = this._cache.controllers.groups[groupId];
        if (!group) return null;
        
        return group.controllers || group;
    },

    // ═══════════════════════════════════════════════════════════════
    // PUBLIC API - Cleanup Profiles
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Get cleanup profile by mode
     * @param {string} mode - Cleanup mode (full, unlink, soft, prey_only)
     * @returns {Object|null} Cleanup profile
     */
    getCleanupProfile: function(mode) {
        if (!this._initialized) this.init();
        if (!this._cache.cleanupProfiles) return null;
        return this._cache.cleanupProfiles.modes[mode] || null;
    },
    
    /**
     * Get cleanup profile for specific operation
     * @param {string} operation - Operation name
     * @returns {Object|null} Operation cleanup profile
     */
    getOperationProfile: function(operation) {
        if (!this._initialized) this.init();
        if (!this._cache.cleanupProfiles) return null;
        return this._cache.cleanupProfiles.operations[operation] || null;
    },

    // ═══════════════════════════════════════════════════════════════
    // PUBLIC API - Presets
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Get preset by ID
     * @param {string} id - Preset ID (hunter, prey, hunter-prey)
     * @returns {Object|null} Preset definition
     */
    getPreset: function(id) {
        if (!this._initialized) this.init();
        
        // Normalize ID
        var normalizedId = id.replace(/-/g, '');
        if (normalizedId === 'hunterprey') normalizedId = 'hunterPrey';
        
        return this._cache.presets[normalizedId] || this._cache.presets[id] || null;
    },

    // ═══════════════════════════════════════════════════════════════
    // PRIVATE METHODS
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Determine base path for data files
     * @private
     */
    _getBasePath: function() {
        try {
            var candidateFolders = [];
            
            // 1. From captured evaluation-time script location (DataLoader.jsx is in jsx/core/)
            if (_dataLoaderScriptFile && _dataLoaderScriptFile.exists) {
                var coreFolder = _dataLoaderScriptFile.parent;
                candidateFolders.push(new Folder(coreFolder.fsName + '/../data/'));
                candidateFolders.push(new Folder(coreFolder.fsName + '/data/'));
            }
            
            // 2. From runtime $.fileName (could be hostscript.jsx in jsx/, or tests/ in tests/)
            if (typeof $.fileName !== 'undefined' && $.fileName) {
                var currentFile = new File($.fileName);
                if (currentFile.exists) {
                    var curFolder = currentFile.parent;
                    candidateFolders.push(new Folder(curFolder.fsName + '/data/'));
                    candidateFolders.push(new Folder(curFolder.fsName + '/../data/'));
                    candidateFolders.push(new Folder(curFolder.fsName + '/../jsx/data/'));
                    candidateFolders.push(new Folder(curFolder.fsName + '/jsx/data/'));
                }
            }
            
            // Check candidates
            for (var i = 0; i < candidateFolders.length; i++) {
                var f = candidateFolders[i];
                if (f && f.exists) {
                    var path = f.fsName.replace(/\\/g, '/');
                    if (path.charAt(path.length - 1) !== '/') path += '/';
                    // Verify controllers.json exists in this folder
                    var testFile = new File(path + 'controllers.json');
                    if (testFile.exists) {
                        return path;
                    }
                }
            }
            
            $.writeln("[DataLoader] Warning: data folder not found in candidates, using fallback");
            return (_dataLoaderScriptFile ? _dataLoaderScriptFile.parent.fsName.replace(/\\/g, '/') : '') + '/../data/';
        } catch(e) {
            $.writeln("[DataLoader] Path error: " + e);
            return '';
        }
    },
    
    /**
     * Load and parse JSON file
     * @private
     */
    _loadJSON: function(filename) {
        var path = this._basePath + filename;
        
        // Normalize path separators for Windows
        path = path.replace(/\\/g, '/');
        
        var file = new File(path);
        
        if (!file.exists) {
            $.writeln("[DataLoader] File not found: " + path);
            return null;
        }
        
        try {
            file.open('r');
            file.encoding = 'UTF-8';
            var content = file.read();
            file.close();
            
            return JSON.parse(content);
        } catch(e) {
            $.writeln("[DataLoader] Error loading " + filename + ": " + e);
            try { file.close(); } catch(err) {}
            return null;
        }
    },
    
    /**
     * Check if DataLoader is initialized
     * @returns {boolean}
     */
    
    /** Embedded fallback in case external JSON files are inaccessible */
    _getEmbeddedFallback: function() {
        return {
            controllers: {
                "ID": { "name": "BolasPro ID", "type": "slider", "role": "hunter", "defaultValue": null, "generateValue": true, "range": [-999999, 999999] },
                "TARGET_ID": { "name": "BolasPro Target ID", "type": "slider", "role": "prey", "defaultValue": null, "range": [-999999, 999999] },
                "SNAG_POINT": { "name": "BolasPro - Snag Point", "type": "slider", "role": "prey", "defaultValue": 5, "range": [1, 9] },
                "PREY_ANCHOR": { "name": "BolasPro - Prey Anchor", "type": "slider", "role": "prey", "defaultValue": 5, "range": [1, 9] },
                "LOCK_ORIENTATION": { "name": "BolasPro - Lock Orientation", "type": "checkbox", "role": "prey", "defaultValue": false },
                "OFFSET_X": { "name": "BolasPro - Offset X", "type": "slider", "role": "prey", "defaultValue": 0, "range": [-10000, 10000] },
                "OFFSET_Y": { "name": "BolasPro - Offset Y", "type": "slider", "role": "prey", "defaultValue": 0, "range": [-10000, 10000] },
                "OFFSET_Z": { "name": "BolasPro - Offset Z", "type": "slider", "role": "prey", "defaultValue": 0, "condition": "is3D", "range": [-10000, 10000] },
                "POSITION_DELAY": { "name": "BolasPro - Position Delay", "type": "slider", "role": "prey", "defaultValue": 0, "range": [0, 10] },
                "ROTATION_DELAY": { "name": "BolasPro - Rotation Delay", "type": "slider", "role": "prey", "defaultValue": 0, "condition": "lockOrientation", "range": [0, 10] },
                "SPRING": { "name": "BolasPro - Spring", "type": "slider", "role": "prey", "defaultValue": 0, "range": [0, 10] },
                "DAMPING": { "name": "BolasPro - Damping", "type": "slider", "role": "prey", "defaultValue": 2, "range": [0, 10] }
            },
            presets: {
                hunter: {
                    id: "hunter",
                    controllers: [{ id: "ID", required: true, generateValue: true }]
                },
                prey: {
                    id: "prey",
                    controllers: [
                        { id: "TARGET_ID", required: true },
                        { id: "SNAG_POINT", defaultValue: 5 },
                        { id: "PREY_ANCHOR", defaultValue: 5 },
                        { id: "LOCK_ORIENTATION", defaultValue: false },
                        { id: "OFFSET_X", defaultValue: 0 },
                        { id: "OFFSET_Y", defaultValue: 0 },
                        { id: "OFFSET_Z", defaultValue: 0, condition: "is3D" },
                        { id: "POSITION_DELAY", defaultValue: 0 },
                        { id: "ROTATION_DELAY", defaultValue: 0 },
                        { id: "SPRING", defaultValue: 0 },
                        { id: "DAMPING", defaultValue: 2 }
                    ],
                    expressions: {
                        position: { always: true },
                        anchor: { always: true },
                        rotation: { condition: "lockOrientation" },
                        orientation: { condition: "lockOrientation && hunter3D" }
                    }
                }
            }
        };
    },

    isInitialized: function() {
        return this._initialized;
    },
    
    /**
     * Force reload all data
     */
    reload: function() {
        this._initialized = false;
        this._cache = {
            controllers: null,
            cleanupProfiles: null,
            presets: {}
        };
        return this.init();
    }
};
