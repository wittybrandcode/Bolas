/**
 * BolasPro v4.0 - DataLoader Module
 * Loads and manages JSON configuration files
 * 
 * Dependencies: JSONPolyfill.jsx
 */

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
     * Initialize DataLoader - loads all JSON config files
     * @returns {boolean} Success status
     */
    init: function() {
        if (this._initialized) return true;
        
        try {
            // Determine base path from script location
            this._basePath = this._getBasePath();
            
            // Load core configuration files
            this._cache.controllers = this._loadJSON('controllers.json');
            this._cache.cleanupProfiles = this._loadJSON('cleanup-profiles.json');
            
            // Load presets
            this._cache.presets.hunter = this._loadJSON('presets/hunter.json');
            this._cache.presets.prey = this._loadJSON('presets/prey.json');
            this._cache.presets.hunterPrey = this._loadJSON('presets/hunter-prey.json');
            
            // Validate loaded data
            if (!this._cache.controllers || !this._cache.controllers.controllers) {
                $.writeln("[DataLoader] ERROR: Failed to load controllers.json");
                return false;
            }
            
            this._initialized = true;
            $.writeln("[DataLoader] Initialized - " + 
                Object.keys(this._cache.controllers.controllers).length + " controllers loaded");
            
            return true;
        } catch(e) {
            $.writeln("[DataLoader] Init error: " + e);
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
            var scriptFile = new File($.fileName);
            var scriptFolder = scriptFile.parent;
            
            // Navigate from jsx/core/ to jsx/data/
            var dataFolder = new Folder(scriptFolder.fsName + '/../data/');
            
            if (dataFolder.exists) {
                return dataFolder.fsName + '/';
            }
            
            // Fallback: try relative to jsx folder
            dataFolder = new Folder(scriptFolder.parent.fsName + '/data/');
            if (dataFolder.exists) {
                return dataFolder.fsName + '/';
            }
            
            $.writeln("[DataLoader] Warning: data folder not found, using default path");
            return scriptFolder.fsName + '/../data/';
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
            if (file.open) file.close();
            return null;
        }
    },
    
    /**
     * Check if DataLoader is initialized
     * @returns {boolean}
     */
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
