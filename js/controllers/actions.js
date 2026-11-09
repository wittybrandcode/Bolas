/**
 * BolasPro v5.0 - Actions Controller (Legacy Compatibility)
 * This file is kept for backward compatibility but main actions are in main.js
 */

var Actions = (function() {
    'use strict';
    
    return {
        /**
         * Snag (Chain) selected layers
         */
        snag: function() {
            var snagBtn = document.getElementById('snagBtn');
            if (snagBtn) {
                snagBtn.click();
            }
        },

        /**
         * Free selected layers
         */
        free: function() {
            var freeBtn = document.getElementById('freeBtn');
            if (freeBtn) {
                freeBtn.click();
            }
        },

        /**
         * Refresh layers list
         */
        refreshLayers: function() {
            if (typeof HunterBar !== 'undefined') {
                HunterBar.refreshLayers();
            }
        },

        /**
         * Toggle lock orientation
         */
        toggleLock: function() {
            if (typeof OptionsController !== 'undefined') {
                OptionsController.toggleLockOrientation();
            }
        }
    };
})();
