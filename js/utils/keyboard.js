/**
 * BolasPro v5.0 - Keyboard Handler
 * Keyboard shortcuts for quick actions
 */

var KeyboardHandler = (function() {
    'use strict';

    // ═══════════════════════════════════════════════════════════════
    // Initialization
    // ═══════════════════════════════════════════════════════════════

    function init() {
        console.log('[KeyboardHandler] Initializing...');
        
        document.addEventListener('keydown', handleKeyDown);
        
        console.log('[KeyboardHandler] Initialized');
    }

    // ═══════════════════════════════════════════════════════════════
    // Key Handler
    // ═══════════════════════════════════════════════════════════════

    function handleKeyDown(e) {
        // Ignore if typing in input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        // Ctrl/Cmd shortcuts
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 's':
                    e.preventDefault();
                    triggerSnag();
                    break;
                case 'f':
                    e.preventDefault();
                    triggerFree();
                    break;
                case 'r':
                    e.preventDefault();
                    triggerRefresh();
                    break;
            }
            return;
        }

        // Number keys 1-6 for tabs
        if (e.key >= '1' && e.key <= '6' && !e.ctrlKey && !e.metaKey && !e.altKey) {
            var tabs = ['source', 'attach', 'quick', 'snag', 'prey', 'chain'];
            var idx = parseInt(e.key) - 1;
            if (tabs[idx] && typeof BolasGrid !== 'undefined') {
                BolasGrid.switchTab(tabs[idx]);
            }
            return;
        }

        // Numpad for grid positions
        var numpadMap = {
            'Numpad7': 1, 'Numpad8': 2, 'Numpad9': 3,
            'Numpad4': 4, 'Numpad5': 5, 'Numpad6': 6,
            'Numpad1': 7, 'Numpad2': 8, 'Numpad3': 9
        };

        if (numpadMap[e.code]) {
            var pos = numpadMap[e.code];
            if (typeof BolasGrid !== 'undefined') {
                BolasGrid.selectPosition(pos);
            }
            return;
        }

        // Arrow keys for grid navigation
        handleArrowKeys(e);
    }

    // ═══════════════════════════════════════════════════════════════
    // Arrow Key Navigation
    // ═══════════════════════════════════════════════════════════════

    function handleArrowKeys(e) {
        if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            return;
        }

        var currentPos = StateManager.getCurrentPosition();
        var newPos = currentPos;

        // Grid layout:
        // 1 2 3
        // 4 5 6
        // 7 8 9

        switch (e.key) {
            case 'ArrowUp':
                if (currentPos > 3) newPos = currentPos - 3;
                break;
            case 'ArrowDown':
                if (currentPos < 7) newPos = currentPos + 3;
                break;
            case 'ArrowLeft':
                if (currentPos % 3 !== 1) newPos = currentPos - 1;
                break;
            case 'ArrowRight':
                if (currentPos % 3 !== 0) newPos = currentPos + 1;
                break;
        }

        if (newPos !== currentPos && typeof BolasGrid !== 'undefined') {
            e.preventDefault();
            BolasGrid.selectPosition(newPos);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // Action Triggers
    // ═══════════════════════════════════════════════════════════════

    function triggerSnag() {
        var snagBtn = document.getElementById('snagBtn');
        if (snagBtn) {
            snagBtn.click();
        } else if (typeof Actions !== 'undefined') {
            Actions.snag();
        }
    }

    function triggerFree() {
        var freeBtn = document.getElementById('freeBtn');
        if (freeBtn) {
            freeBtn.click();
        } else if (typeof Actions !== 'undefined') {
            Actions.free();
        }
    }

    function triggerRefresh() {
        if (typeof HunterBar !== 'undefined') {
            HunterBar.refreshLayers();
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // Public API
    // ═══════════════════════════════════════════════════════════════

    return {
        init: init
    };

})();

// Export for debugging
if (typeof window !== 'undefined') {
    window.KeyboardHandler = KeyboardHandler;
}
