/**
 * BolasPro v4.0 - ChainRegistry Module (OPTIMIZED)
 * Central registry for chain structure and layer relationships
 * 
 * نظام مركزي لتتبع بنية السلاسل والعلاقات بين الطبقات
 * 
 * OPTIMIZATION: Added internal cache for O(1) lookups
 * 
 * Dependencies: Config.jsx, Effects, DataLoader.jsx, SensorSystem.jsx
 */

var ChainRegistry = {
    // ═══════════════════════════════════════════════════════════════
    // CACHE SYSTEM (OPTIMIZED)
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Internal cache for O(1) lookups
     * Structure:
     * - compId: Composition ID for validation
     * - byId: { bolasPro_id → layerIndex }
     * - byTargetId: { target_id → [layerIndices] }
     * - valid: boolean
     * @private
     */
    _cache: {
        compId: null,
        byId: {},
        byTargetId: {},
        valid: false
    },
    
    /**
     * Build cache from Effects
     * Scans all layers once and builds lookup tables
     * Complexity: O(n) where n = number of layers
     * @private
     * @param {CompItem} comp - The composition
     */
    _buildCache: function(comp) {
        // Reset cache
        this._cache.byId = {};
        this._cache.byTargetId = {};
        
        // Scan all layers
        for (var i = 1; i <= comp.numLayers; i++) {
            var layer = comp.layer(i);
            
            // Index by ID
            var id = Effects.getSliderValue(layer, Config.EFFECTS.ID);
            if (id && id > 0) {
                this._cache.byId[id] = i;
            }
            
            // Index by TARGET_ID
            var targetId = Effects.getSliderValue(layer, Config.EFFECTS.TARGET_ID);
            if (targetId && targetId > 0) {
                if (!this._cache.byTargetId[targetId]) {
                    this._cache.byTargetId[targetId] = [];
                }
                this._cache.byTargetId[targetId].push(i);
            }
        }
        
        // Mark as valid
        this._cache.compId = comp.id;
        this._cache.valid = true;
        
        $.writeln("[ChainRegistry] Cache built: " + 
            this._countKeys(this._cache.byId) + " IDs, " +
            this._countKeys(this._cache.byTargetId) + " targets");
    },
    
    /**
     * Count keys in object (ES3 compatible)
     * @private
     */
    _countKeys: function(obj) {
        var count = 0;
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) count++;
        }
        return count;
    },
    
    /**
     * Invalidate cache
     * MUST be called after any chain operation
     * @public
     */
    invalidateCache: function() {
        this._cache.valid = false;
        $.writeln("[ChainRegistry] Cache invalidated");
    },
    
    /**
     * Ensure cache is valid before use
     * Rebuilds if invalid or composition changed
     * @private
     * @param {CompItem} comp - The composition
     */
    _ensureCache: function(comp) {
        if (!this._cache.valid || this._cache.compId !== comp.id) {
            this._buildCache(comp);
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // LAYER STATE DEFINITIONS
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Layer states with their controller signatures
     * 
     * H (Hunter):      ID only - root of chain, no leader
     * P (Prey):        TARGET_ID + prey_controls - follows a hunter, no followers
     * HP (Hunter-Prey): ID + TARGET_ID + prey_controls - middle of chain
     * F (Free):        No controllers - not in any chain
     */
    STATES: {
        FREE: 'free',
        HUNTER: 'hunter',
        PREY: 'prey',
        HUNTER_PREY: 'hunter-prey'
    },
    
    /**
     * Controller signatures for each state
     */
    SIGNATURES: {
        'free': { hasId: false, hasTargetId: false },
        'hunter': { hasId: true, hasTargetId: false },
        'prey': { hasId: false, hasTargetId: true },
        'hunter-prey': { hasId: true, hasTargetId: true }
    },

    // ═══════════════════════════════════════════════════════════════
    // STATE DETECTION
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Get layer state based on controller signature
     * @param {Layer} layer
     * @returns {string} State: 'free', 'hunter', 'prey', 'hunter-prey'
     */
    getLayerState: function(layer) {
        var hasId = Effects.has(layer, Config.EFFECTS.ID);
        var hasTargetId = Effects.has(layer, Config.EFFECTS.TARGET_ID);
        
        if (hasId && hasTargetId) return this.STATES.HUNTER_PREY;
        if (hasId) return this.STATES.HUNTER;
        if (hasTargetId) return this.STATES.PREY;
        return this.STATES.FREE;
    },
    
    /**
     * Get complete layer info including relationships
     * @param {Layer} layer
     * @returns {Object} Layer info
     */
    getLayerInfo: function(layer) {
        var state = this.getLayerState(layer);
        var id = Effects.getSliderValue(layer, Config.EFFECTS.ID);
        var targetId = Effects.getSliderValue(layer, Config.EFFECTS.TARGET_ID);
        
        return {
            index: layer.index,
            name: layer.name,
            state: state,
            id: id,
            targetId: targetId,
            is3D: layer.threeDLayer,
            // Relationships (computed on demand)
            leader: null,
            followers: [],
            chainPosition: -1,
            chainLength: 0
        };
    },

    // ═══════════════════════════════════════════════════════════════
    // CHAIN BUILDING
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Build complete chain structure from any layer in the chain
     * Returns ordered array from root to last element
     * @param {Layer} layer - Any layer in the chain
     * @returns {Object} Chain structure
     */
    buildChain: function(layer) {
        var comp = layer.containingComp;
        
        // 1. Find root (Hunter with no TARGET_ID)
        var root = this._findRoot(layer, comp);
        if (!root) {
            return {
                success: false,
                error: 'Could not find chain root',
                members: []
            };
        }
        
        // 2. Build chain from root
        var members = [];
        var visited = {};
        var current = root;
        var position = 0;
        
        while (current && !visited[current.index]) {
            visited[current.index] = true;
            
            var info = this.getLayerInfo(current);
            info.chainPosition = position;
            info.isRoot = (position === 0);
            
            // Find leader (previous in chain)
            if (info.targetId) {
                info.leader = this._findLayerById(comp, info.targetId);
            }
            
            // Find followers (next in chain)
            if (info.id) {
                info.followers = this._findFollowers(comp, info.id);
            }
            
            members.push(info);
            position++;
            
            // Move to first follower (linear chain)
            // For branched chains, this only follows first branch
            if (info.followers.length > 0) {
                current = info.followers[0];
            } else {
                current = null;
            }
        }
        
        // 3. Update chain length for all members
        var chainLength = members.length;
        for (var i = 0; i < members.length; i++) {
            members[i].chainLength = chainLength;
            members[i].isLast = (i === chainLength - 1);
        }
        
        return {
            success: true,
            rootId: members[0].id,
            rootIndex: members[0].index,
            length: chainLength,
            members: members,
            hasBranches: this._hasBranches(members)
        };
    },
    
    /**
     * Build all chains in composition
     * @param {CompItem} comp
     * @returns {Array} Array of chain structures
     */
    buildAllChains: function(comp) {
        if (!comp) comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) return [];
        
        var chains = [];
        var processedLayers = {};
        
        // Find all root hunters (have ID but no TARGET_ID)
        for (var i = 1; i <= comp.numLayers; i++) {
            var layer = comp.layer(i);
            if (processedLayers[layer.index]) continue;
            
            var state = this.getLayerState(layer);
            if (state === this.STATES.HUNTER) {
                var chain = this.buildChain(layer);
                if (chain.success) {
                    chains.push(chain);
                    // Mark all members as processed
                    for (var j = 0; j < chain.members.length; j++) {
                        processedLayers[chain.members[j].index] = true;
                    }
                }
            }
        }
        
        return chains;
    },

    // ═══════════════════════════════════════════════════════════════
    // RELATIONSHIP QUERIES - OPTIMIZED O(1)
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Get previous layer in chain (leader) - OPTIMIZED O(1)
     * @param {Layer} layer
     * @returns {Layer|null}
     */
    getPrevious: function(layer) {
        var targetId = Effects.getSliderValue(layer, Config.EFFECTS.TARGET_ID);
        if (!targetId) return null;
        return this._findLayerById(layer.containingComp, targetId);
    },
    
    /**
     * Get next layer(s) in chain (followers) - OPTIMIZED O(k)
     * where k = number of followers
     * @param {Layer} layer
     * @returns {Array<Layer>}
     */
    getNext: function(layer) {
        var id = Effects.getSliderValue(layer, Config.EFFECTS.ID);
        if (!id) return [];
        return this._findFollowers(layer.containingComp, id);
    },
    
    /**
     * Get chain position of layer (0 = root)
     * @param {Layer} layer
     * @returns {number} Position or -1 if not in chain
     */
    getPosition: function(layer) {
        var chain = this.buildChain(layer);
        if (!chain.success) return -1;
        
        for (var i = 0; i < chain.members.length; i++) {
            if (chain.members[i].index === layer.index) {
                return i;
            }
        }
        return -1;
    },
    
    /**
     * Check if two layers are in the same chain
     * @param {Layer} layerA
     * @param {Layer} layerB
     * @returns {boolean}
     */
    areInSameChain: function(layerA, layerB) {
        var chainA = this.buildChain(layerA);
        if (!chainA.success) return false;
        
        for (var i = 0; i < chainA.members.length; i++) {
            if (chainA.members[i].index === layerB.index) {
                return true;
            }
        }
        return false;
    },

    // ═══════════════════════════════════════════════════════════════
    // CHAIN VISUALIZATION (for UI)
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Get chain visualization string
     * @param {Layer} layer
     * @returns {string} e.g., "H → HP → HP → P"
     */
    getChainVisualization: function(layer) {
        var chain = this.buildChain(layer);
        if (!chain.success) return '';
        
        var parts = [];
        for (var i = 0; i < chain.members.length; i++) {
            var m = chain.members[i];
            var stateCode = this._getStateCode(m.state);
            var marker = (m.index === layer.index) ? '[' + stateCode + ']' : stateCode;
            parts.push(marker);
        }
        return parts.join(' → ');
    },
    
    /**
     * Get detailed chain info for UI
     * @param {Layer} layer
     * @returns {Object}
     */
    getChainInfoForUI: function(layer) {
        var chain = this.buildChain(layer);
        if (!chain.success) {
            return {
                inChain: false,
                state: this.getLayerState(layer)
            };
        }
        
        var currentPosition = -1;
        for (var i = 0; i < chain.members.length; i++) {
            if (chain.members[i].index === layer.index) {
                currentPosition = i;
                break;
            }
        }
        
        return {
            inChain: true,
            state: chain.members[currentPosition].state,
            position: currentPosition,
            length: chain.length,
            isRoot: currentPosition === 0,
            isLast: currentPosition === chain.length - 1,
            visualization: this.getChainVisualization(layer),
            members: chain.members.map(function(m) {
                return {
                    index: m.index,
                    name: m.name,
                    state: m.state,
                    isSelected: m.index === layer.index
                };
            })
        };
    },

    // ═══════════════════════════════════════════════════════════════
    // VALIDATION
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Validate chain integrity
     * Checks for orphaned controllers, broken links, etc.
     * @param {Layer} layer
     * @returns {Object} Validation result
     */
    validateChain: function(layer) {
        var chain = this.buildChain(layer);
        var issues = [];
        
        if (!chain.success) {
            return {
                valid: false,
                issues: [{ type: 'NO_CHAIN', message: 'Layer not in valid chain' }]
            };
        }
        
        for (var i = 0; i < chain.members.length; i++) {
            var m = chain.members[i];
            
            // Check: Root should not have TARGET_ID
            if (i === 0 && m.targetId) {
                issues.push({
                    type: 'ROOT_HAS_TARGET',
                    layerIndex: m.index,
                    message: 'Root hunter should not have TARGET_ID'
                });
            }
            
            // Check: Non-root should have TARGET_ID
            if (i > 0 && !m.targetId) {
                issues.push({
                    type: 'MISSING_TARGET',
                    layerIndex: m.index,
                    message: 'Non-root layer missing TARGET_ID'
                });
            }
            
            // Check: Middle elements should have ID (if they have followers)
            if (i < chain.length - 1 && !m.id) {
                issues.push({
                    type: 'MISSING_ID',
                    layerIndex: m.index,
                    message: 'Middle layer missing ID for followers'
                });
            }
            
            // Check: TARGET_ID should match previous layer's ID
            if (i > 0 && m.targetId) {
                var prevId = chain.members[i - 1].id;
                if (m.targetId !== prevId) {
                    issues.push({
                        type: 'BROKEN_LINK',
                        layerIndex: m.index,
                        message: 'TARGET_ID does not match previous layer ID'
                    });
                }
            }
        }
        
        return {
            valid: issues.length === 0,
            issues: issues,
            chain: chain
        };
    },

    // ═══════════════════════════════════════════════════════════════
    // PRIVATE HELPERS - OPTIMIZED
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Find chain root from any layer
     * @private
     */
    _findRoot: function(layer, comp) {
        var current = layer;
        var visited = {};
        var maxDepth = 100;
        
        while (current && maxDepth-- > 0) {
            if (visited[current.index]) break; // Cycle detected
            visited[current.index] = true;
            
            var targetId = Effects.getSliderValue(current, Config.EFFECTS.TARGET_ID);
            if (!targetId) {
                // No TARGET_ID means this is root (or free layer)
                var hasId = Effects.has(current, Config.EFFECTS.ID);
                return hasId ? current : null;
            }
            
            // Find leader
            var leader = this._findLayerById(comp, targetId);
            if (!leader) break; // Broken link
            current = leader;
        }
        
        return current;
    },
    
    /**
     * Find layer by ID - OPTIMIZED O(1)
     * Uses cache for fast lookup
     * @private
     */
    _findLayerById: function(comp, id) {
        this._ensureCache(comp);
        
        var layerIndex = this._cache.byId[id];
        if (layerIndex) {
            return comp.layer(layerIndex);
        }
        return null;
    },
    
    /**
     * Find all followers of a layer by ID - OPTIMIZED O(k)
     * where k = number of followers
     * Uses cache for fast lookup
     * @private
     */
    _findFollowers: function(comp, id) {
        this._ensureCache(comp);
        
        var indices = this._cache.byTargetId[id] || [];
        var followers = [];
        
        for (var i = 0; i < indices.length; i++) {
            followers.push(comp.layer(indices[i]));
        }
        
        return followers;
    },
    
    /**
     * Check if chain has branches
     * @private
     */
    _hasBranches: function(members) {
        for (var i = 0; i < members.length; i++) {
            if (members[i].followers && members[i].followers.length > 1) {
                return true;
            }
        }
        return false;
    },
    
    /**
     * Get short state code
     * @private
     */
    _getStateCode: function(state) {
        switch(state) {
            case 'hunter': return 'H';
            case 'prey': return 'P';
            case 'hunter-prey': return 'HP';
            default: return 'F';
        }
    }
};

$.writeln("[BolasPro] ChainRegistry loaded (OPTIMIZED)");
