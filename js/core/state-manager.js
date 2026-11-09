/**
 * BolasPro v5.0 - State Manager v2
 * Centralized state management for Bolas Grid UI
 */

var StateManager = (function() {
    'use strict';

    // ═══════════════════════════════════════════════════════════════
    // Default State
    // ═══════════════════════════════════════════════════════════════
    
    var defaultState = {
        // Bolas Grid State
        currentTab: 'setup',
        positions: {
            source: 5,
            attach: 5,
            anchor: 5
        },
        
        // Hunter State
        selectedHunter: null,
        hunterIndex: null,
        sortOrder: 'asc',
        layers: [],
        
        // Chain State
        currentChain: null,
        selectedChainItem: null,
        
        // Options State
        lockOrientation: true,
        maintainOffset: false,
        positionDelay: 0,
        rotationDelay: 0
    };

    // Current state (clone of default)
    var state = JSON.parse(JSON.stringify(defaultState));
    
    // Subscribers
    var listeners = [];

    // ═══════════════════════════════════════════════════════════════
    // Position Names (for display)
    // ═══════════════════════════════════════════════════════════════
    
    var positionNames = {
        1: 'Top Left',
        2: 'Top',
        3: 'Top Right',
        4: 'Left',
        5: 'Center',
        6: 'Right',
        7: 'Bottom Left',
        8: 'Bottom',
        9: 'Bottom Right'
    };

    var tabLabels = {
        setup: 'SETUP',
        anchor: 'ANCHOR',
        chain: 'CHAIN'
    };

    var tabColors = {
        setup: '#4ade80',
        anchor: '#e8a634',
        chain: '#f472b6'
    };

    // ═══════════════════════════════════════════════════════════════
    // Public API
    // ═══════════════════════════════════════════════════════════════
    
    return {
        /**
         * Get state value
         * @param {string} key - State key (supports dot notation: 'positions.source')
         * @returns {*} State value
         */
        get: function(key) {
            if (!key) return state;
            
            var keys = key.split('.');
            var value = state;
            
            for (var i = 0; i < keys.length; i++) {
                if (value === undefined || value === null) return undefined;
                value = value[keys[i]];
            }
            
            return value;
        },

        /**
         * Set state value
         * @param {string} key - State key (supports dot notation)
         * @param {*} value - New value
         */
        set: function(key, value) {
            var keys = key.split('.');
            var target = state;
            
            for (var i = 0; i < keys.length - 1; i++) {
                if (target[keys[i]] === undefined) {
                    target[keys[i]] = {};
                }
                target = target[keys[i]];
            }
            
            var lastKey = keys[keys.length - 1];
            var oldValue = target[lastKey];
            target[lastKey] = value;
            
            // Notify listeners
            this.notify(key, value, oldValue);
            
            // Auto-save certain keys
            if (['lockOrientation', 'maintainOffset', 'sortOrder', 'positions'].indexOf(keys[0]) !== -1) {
                this.save();
            }
        },

        /**
         * Subscribe to state changes
         * @param {function} callback - Callback(key, newValue, oldValue)
         * @returns {function} Unsubscribe function
         */
        subscribe: function(callback) {
            listeners.push(callback);
            
            return function() {
                var index = listeners.indexOf(callback);
                if (index > -1) {
                    listeners.splice(index, 1);
                }
            };
        },

        /**
         * Notify all listeners
         * @param {string} key - Changed key
         * @param {*} newValue - New value
         * @param {*} oldValue - Old value
         */
        notify: function(key, newValue, oldValue) {
            for (var i = 0; i < listeners.length; i++) {
                try {
                    listeners[i](key, newValue, oldValue);
                } catch (e) {
                    console.error('[StateManager] Listener error:', e);
                }
            }
        },

        /**
         * Save state to localStorage
         */
        save: function() {
            try {
                var toSave = {
                    positions: state.positions,
                    sortOrder: state.sortOrder,
                    lockOrientation: state.lockOrientation,
                    maintainOffset: state.maintainOffset,
                    positionDelay: state.positionDelay,
                    rotationDelay: state.rotationDelay
                };
                localStorage.setItem('bolaspro_state', JSON.stringify(toSave));
            } catch (e) {
                console.warn('[StateManager] Could not save state:', e);
            }
        },

        /**
         * Load state from localStorage
         */
        load: function() {
            try {
                var saved = localStorage.getItem('bolaspro_state');
                if (saved) {
                    var parsed = JSON.parse(saved);
                    
                    // Merge with current state
                    if (parsed.positions) state.positions = parsed.positions;
                    if (parsed.sortOrder) state.sortOrder = parsed.sortOrder;
                    if (typeof parsed.lockOrientation === 'boolean') state.lockOrientation = parsed.lockOrientation;
                    if (typeof parsed.maintainOffset === 'boolean') state.maintainOffset = parsed.maintainOffset;
                    if (typeof parsed.positionDelay === 'number') state.positionDelay = parsed.positionDelay;
                    if (typeof parsed.rotationDelay === 'number') state.rotationDelay = parsed.rotationDelay;
                    
                    console.log('[StateManager] State loaded from storage');
                }
            } catch (e) {
                console.warn('[StateManager] Could not load state:', e);
            }
        },

        /**
         * Reset state to defaults
         */
        reset: function() {
            state = JSON.parse(JSON.stringify(defaultState));
            this.notify('*', state, null);
        },

        // ═══════════════════════════════════════════════════════════════
        // Helper Methods
        // ═══════════════════════════════════════════════════════════════

        /**
         * Get position name
         * @param {number} pos - Position (1-9)
         * @returns {string} Position name
         */
        getPositionName: function(pos) {
            return positionNames[pos] || 'Unknown';
        },

        /**
         * Get tab label
         * @param {string} tab - Tab name
         * @returns {string} Tab label
         */
        getTabLabel: function(tab) {
            return tabLabels[tab] || tab.toUpperCase();
        },

        /**
         * Get tab color
         * @param {string} tab - Tab name
         * @returns {string} Tab color
         */
        getTabColor: function(tab) {
            return tabColors[tab] || '#e8a634';
        },

        /**
         * Get current tab position
         * @returns {number} Current position for active tab
         */
        getCurrentPosition: function() {
            var tab = state.currentTab;
            return state.positions[tab] || 5;
        },

        /**
         * Set current tab position
         * @param {number} pos - Position (1-9)
         */
        setCurrentPosition: function(pos) {
            var tab = state.currentTab;
            if (tab !== 'chain') {
                this.set('positions.' + tab, pos);
            }
        },

        /**
         * Check if current tab is an action tab (executes immediately)
         * @returns {boolean}
         */
        isActionTab: function() {
            return state.currentTab === 'anchor';
        },

        /**
         * Get snag options for chain operation
         * @returns {object} Options object
         */
        getSnagOptions: function() {
            return {
                sourceAnchor: state.positions.source,
                attachAnchor: state.positions.attach,
                lockOrientation: state.lockOrientation,
                maintainOffset: state.maintainOffset,
                positionDelay: state.positionDelay,
                rotationDelay: state.rotationDelay,
                sortOrder: state.sortOrder
            };
        }
    };

})();

// Export for debugging
if (typeof window !== 'undefined') {
    window.StateManager = StateManager;
}
