/**
 * BolasPro v5.0.0 - Keyboard Handler
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
        // Ignore if typing in input, select or textarea
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        // =====================================================================
        // Undo / Redo Shortcuts (REF-01: Centralized in keyboard.js)
        // =====================================================================
        
        // Undo: Ctrl+Z (or Cmd+Z) without Shift
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
            e.preventDefault();
            if (typeof UndoManager !== 'undefined') {
                UndoManager.undo();
            }
            return;
        }

        // Redo: Ctrl+Y or Ctrl+Shift+Z (or Cmd+Shift+Z)
        if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') || 
            ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && e.shiftKey)) {
            e.preventDefault();
            if (typeof UndoManager !== 'undefined') {
                UndoManager.redo();
            }
            return;
        }

        // =====================================================================
        // Action Shortcuts
        // =====================================================================

        // Snag: Alt+S or Ctrl+Shift+S (FIX-03: Safe shortcut, leaves Ctrl+S for AE native save)
        if ((e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's') || (e.altKey && e.key.toLowerCase() === 's')) {
            e.preventDefault();
            triggerSnag();
            return;
        }

        // Free: Ctrl+F or Alt+F
        if ((e.ctrlKey && e.key.toLowerCase() === 'f') || (e.altKey && e.key.toLowerCase() === 'f')) {
            e.preventDefault();
            triggerFree();
            return;
        }

        // Refresh: Ctrl+R or Alt+R
        if ((e.ctrlKey && e.key.toLowerCase() === 'r') || (e.altKey && e.key.toLowerCase() === 'r')) {
            e.preventDefault();
            triggerRefresh();
            return;
        }

        // =====================================================================
        // Tab Navigation: 1 for Setup, 2 for Chain View (FIX-04)
        // =====================================================================
        if ((e.key === '1' || e.key === '2') && !e.ctrlKey && !e.metaKey && !e.altKey) {
            var targetTab = e.key === '1' ? 'setup' : 'chain';
            if (typeof BolasGrid !== 'undefined' && BolasGrid.switchTab) {
                BolasGrid.switchTab(targetTab);
            }
            return;
        }

        // =====================================================================
        // Numpad 1-9 for 3x3 Grid Position Selection (FIX-04)
        // =====================================================================
        var numpadMap = {
            'Numpad7': 1, 'Numpad8': 2, 'Numpad9': 3,
            'Numpad4': 4, 'Numpad5': 5, 'Numpad6': 6,
            'Numpad1': 7, 'Numpad2': 8, 'Numpad3': 9
        };

        if (numpadMap[e.code]) {
            var pos = numpadMap[e.code];
            if (typeof BolasGrid !== 'undefined' && BolasGrid.selectPosition) {
                e.preventDefault();
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
