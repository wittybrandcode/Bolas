/**
 * BolasPro v5.0 - Undo Manager
 * نظام Undo/Redo مركزي على مستوى الـ Panel
 * 
 * Features:
 * - State-based undo (captures before/after state)
 * - Event-driven architecture
 * - Composition-aware (clears on comp change)
 * - Configurable history limit
 * 
 * Events:
 * - recorded: { entry } - After operation recorded
 * - undone: { entry } - After undo executed
 * - redone: { entry } - After redo executed
 * - cleared: { reason } - After history cleared
 * - stateChanged: { canUndo, canRedo, undoLabel, redoLabel }
 */

var UndoManager = (function() {
    'use strict';

    // ═══════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════
    
    var config = {
        maxHistory: 50,          // Maximum undo steps
        debug: false             // Debug logging
    };

    // ═══════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════
    
    var state = {
        undoStack: [],           // Array of UndoEntry
        redoStack: [],           // Array of UndoEntry
        currentCompId: null,     // Track composition changes
        pendingOperation: null,  // Operation being recorded
        isUndoing: false,        // Prevent recursive recording
        isRedoing: false,        // Prevent recursive recording
        initialized: false,
        entryIdCounter: 0
    };

    // Event listeners: { eventName: [{ callback, id }] }
    var listeners = {};
    var listenerIdCounter = 0;

    // ═══════════════════════════════════════════════════════════════
    // LOGGING
    // ═══════════════════════════════════════════════════════════════
    
    function log(message, data) {
        if (config.debug) {
            if (data !== undefined) {
                console.log('[UndoManager] ' + message, data);
            } else {
                console.log('[UndoManager] ' + message);
            }
        }
    }

    function logError(message, error) {
        console.error('[UndoManager] ' + message, error);
    }

    // ═══════════════════════════════════════════════════════════════
    // EVENT EMITTER
    // ═══════════════════════════════════════════════════════════════
    
    function emit(eventName, data) {
        log('Emitting: ' + eventName, data);
        
        var eventListeners = listeners[eventName];
        if (!eventListeners || eventListeners.length === 0) return;
        
        for (var i = 0; i < eventListeners.length; i++) {
            try {
                eventListeners[i].callback(data);
            } catch (e) {
                logError('Listener error for ' + eventName, e);
            }
        }
    }

    function on(eventName, callback) {
        if (typeof callback !== 'function') {
            logError('Callback must be a function');
            return function() {};
        }
        
        if (!listeners[eventName]) {
            listeners[eventName] = [];
        }
        
        var listenerId = ++listenerIdCounter;
        listeners[eventName].push({ callback: callback, id: listenerId });
        
        log('Subscribed to: ' + eventName + ' (id: ' + listenerId + ')');
        
        // Return unsubscribe function
        return function() {
            off(eventName, listenerId);
        };
    }

    function off(eventName, listenerId) {
        var eventListeners = listeners[eventName];
        if (!eventListeners) return;
        
        for (var i = 0; i < eventListeners.length; i++) {
            if (eventListeners[i].id === listenerId) {
                eventListeners.splice(i, 1);
                log('Unsubscribed from: ' + eventName + ' (id: ' + listenerId + ')');
                break;
            }
        }
    }

    function emitStateChanged() {
        emit('stateChanged', {
            canUndo: canUndo(),
            canRedo: canRedo(),
            undoLabel: getUndoLabel(),
            redoLabel: getRedoLabel(),
            undoCount: state.undoStack.length,
            redoCount: state.redoStack.length
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // OPERATION RECORDING
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Begin recording an operation
     * @param {string} type - Operation type (chain, free, insert, etc.)
     * @param {string} label - Human-readable label
     * @param {Array} layerIndices - Indices of affected layers
     * @param {Object} options - Additional options
     */
    function beginOperation(type, label, layerIndices, options) {
        options = options || {};
        
        // Don't record during undo/redo
        if (state.isUndoing || state.isRedoing) {
            log('Skipping recording during undo/redo');
            return false;
        }
        
        // Cancel any pending operation
        if (state.pendingOperation) {
            log('Canceling previous pending operation');
            cancelOperation();
        }
        
        log('Begin operation: ' + type + ' - ' + label);
        
        // Create pending operation
        state.pendingOperation = {
            id: ++state.entryIdCounter,
            type: type,
            label: label,
            timestamp: Date.now(),
            compId: state.currentCompId,
            layerIndices: layerIndices || [],
            beforeState: null,
            afterState: null,
            canUndo: options.canUndo !== false,  // Default true
            options: options
        };
        
        // Capture before state
        captureBeforeState(layerIndices);
        
        return true;
    }

    /**
     * End recording and save the operation
     */
    function endOperation() {
        if (!state.pendingOperation) {
            log('No pending operation to end');
            return false;
        }
        
        log('End operation: ' + state.pendingOperation.label);
        
        // Capture after state
        captureAfterState(state.pendingOperation.layerIndices);
        
        // Create entry
        var entry = {
            id: state.pendingOperation.id,
            type: state.pendingOperation.type,
            label: state.pendingOperation.label,
            timestamp: state.pendingOperation.timestamp,
            compId: state.pendingOperation.compId,
            layerIndices: state.pendingOperation.layerIndices,
            beforeState: state.pendingOperation.beforeState,
            afterState: state.pendingOperation.afterState,
            canUndo: state.pendingOperation.canUndo,
            options: state.pendingOperation.options
        };
        
        // Push to undo stack
        state.undoStack.push(entry);
        
        // Clear redo stack (new operation invalidates redo)
        state.redoStack = [];
        
        // Enforce max history
        while (state.undoStack.length > config.maxHistory) {
            state.undoStack.shift();
        }
        
        // Clear pending
        state.pendingOperation = null;
        
        // Emit events
        emit('recorded', { entry: entry });
        emitStateChanged();
        
        log('Operation recorded: ' + entry.label + ' (stack size: ' + state.undoStack.length + ')');
        
        return true;
    }

    /**
     * Cancel pending operation (on failure)
     */
    function cancelOperation() {
        if (!state.pendingOperation) {
            return false;
        }
        
        log('Cancel operation: ' + state.pendingOperation.label);
        state.pendingOperation = null;
        return true;
    }

    /**
     * Capture before state of layers
     */
    function captureBeforeState(layerIndices) {
        if (!state.pendingOperation || !layerIndices || layerIndices.length === 0) {
            return;
        }
        
        if (typeof HostService === 'undefined') {
            log('HostService not available for state capture');
            return;
        }
        
        HostService.captureLayerStates(layerIndices).then(function(result) {
            if (result && result.success && state.pendingOperation) {
                state.pendingOperation.beforeState = result.states;
                log('Before state captured: ' + result.states.length + ' layers');
            }
        }).catch(function(e) {
            logError('Failed to capture before state', e);
        });
    }

    /**
     * Capture after state of layers
     */
    function captureAfterState(layerIndices) {
        if (!state.pendingOperation || !layerIndices || layerIndices.length === 0) {
            return;
        }
        
        if (typeof HostService === 'undefined') {
            return;
        }
        
        // Synchronous capture for end operation
        // Note: This is a simplified version - in production, 
        // you might want to make endOperation async
        HostService.captureLayerStates(layerIndices).then(function(result) {
            if (result && result.success && state.pendingOperation) {
                state.pendingOperation.afterState = result.states;
                log('After state captured: ' + result.states.length + ' layers');
            }
        }).catch(function(e) {
            logError('Failed to capture after state', e);
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // UNDO / REDO
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Undo the last operation
     */
    function undo() {
        if (!canUndo()) {
            log('Nothing to undo');
            if (typeof StatusBar !== 'undefined') {
                StatusBar.info('Nothing to undo');
            }
            return false;
        }
        
        var entry = state.undoStack.pop();
        
        // Validate
        var validation = validateEntry(entry);
        if (!validation.valid) {
            logError('Cannot undo: ' + validation.error);
            if (typeof StatusBar !== 'undefined') {
                StatusBar.warning('Cannot undo: ' + validation.error);
            }
            emitStateChanged();
            return false;
        }
        
        // Check if operation can be undone
        if (!entry.canUndo) {
            if (typeof StatusBar !== 'undefined') {
                StatusBar.warning('Use Edit > Undo in After Effects for this operation');
            }
            // Still move to redo stack for tracking
            state.redoStack.push(entry);
            emitStateChanged();
            return false;
        }
        
        log('Undoing: ' + entry.label);
        state.isUndoing = true;
        
        // Restore before state
        if (entry.beforeState && entry.beforeState.length > 0) {
            HostService.restoreLayerStates(entry.beforeState).then(function(result) {
                state.isUndoing = false;
                
                if (result && result.success) {
                    // Move to redo stack
                    state.redoStack.push(entry);
                    
                    // Emit events
                    emit('undone', { entry: entry });
                    emitStateChanged();
                    
                    if (typeof StatusBar !== 'undefined') {
                        StatusBar.success('Undone: ' + entry.label);
                    }
                    
                    // Refresh UI
                    refreshUI();
                    
                    log('Undo complete: ' + entry.label);
                } else {
                    // Put back on undo stack if failed
                    state.undoStack.push(entry);
                    emitStateChanged();
                    
                    if (typeof StatusBar !== 'undefined') {
                        StatusBar.error('Undo failed');
                    }
                }
            }).catch(function(e) {
                state.isUndoing = false;
                state.undoStack.push(entry);
                emitStateChanged();
                logError('Undo error', e);
            });
        } else {
            state.isUndoing = false;
            // No state to restore, just move to redo
            state.redoStack.push(entry);
            emit('undone', { entry: entry });
            emitStateChanged();
        }
        
        return true;
    }

    /**
     * Redo the last undone operation
     */
    function redo() {
        if (!canRedo()) {
            log('Nothing to redo');
            if (typeof StatusBar !== 'undefined') {
                StatusBar.info('Nothing to redo');
            }
            return false;
        }
        
        var entry = state.redoStack.pop();
        
        // Validate
        var validation = validateEntry(entry);
        if (!validation.valid) {
            logError('Cannot redo: ' + validation.error);
            if (typeof StatusBar !== 'undefined') {
                StatusBar.warning('Cannot redo: ' + validation.error);
            }
            emitStateChanged();
            return false;
        }
        
        // Check if operation can be redone
        if (!entry.canUndo) {
            if (typeof StatusBar !== 'undefined') {
                StatusBar.warning('Use Edit > Redo in After Effects for this operation');
            }
            state.undoStack.push(entry);
            emitStateChanged();
            return false;
        }
        
        log('Redoing: ' + entry.label);
        state.isRedoing = true;
        
        // Restore after state
        if (entry.afterState && entry.afterState.length > 0) {
            HostService.restoreLayerStates(entry.afterState).then(function(result) {
                state.isRedoing = false;
                
                if (result && result.success) {
                    // Move back to undo stack
                    state.undoStack.push(entry);
                    
                    // Emit events
                    emit('redone', { entry: entry });
                    emitStateChanged();
                    
                    if (typeof StatusBar !== 'undefined') {
                        StatusBar.success('Redone: ' + entry.label);
                    }
                    
                    // Refresh UI
                    refreshUI();
                    
                    log('Redo complete: ' + entry.label);
                } else {
                    // Put back on redo stack if failed
                    state.redoStack.push(entry);
                    emitStateChanged();
                    
                    if (typeof StatusBar !== 'undefined') {
                        StatusBar.error('Redo failed');
                    }
                }
            }).catch(function(e) {
                state.isRedoing = false;
                state.redoStack.push(entry);
                emitStateChanged();
                logError('Redo error', e);
            });
        } else {
            state.isRedoing = false;
            state.undoStack.push(entry);
            emit('redone', { entry: entry });
            emitStateChanged();
        }
        
        return true;
    }

    /**
     * Validate an undo entry before execution
     */
    function validateEntry(entry) {
        if (!entry) {
            return { valid: false, error: 'No entry' };
        }
        
        // Check composition
        if (entry.compId !== state.currentCompId) {
            return { valid: false, error: 'Composition changed' };
        }
        
        return { valid: true };
    }

    /**
     * Refresh UI after undo/redo
     */
    function refreshUI() {
        // Refresh chain view
        if (typeof BolasGrid !== 'undefined' && BolasGrid.refreshChain) {
            BolasGrid.refreshChain();
        }
        
        // Force selection sync refresh
        if (typeof AESelectionSync !== 'undefined' && AESelectionSync.forceRefresh) {
            AESelectionSync.forceRefresh();
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // STATE QUERIES
    // ═══════════════════════════════════════════════════════════════
    
    function canUndo() {
        return state.undoStack.length > 0;
    }

    function canRedo() {
        return state.redoStack.length > 0;
    }

    function getUndoLabel() {
        if (state.undoStack.length === 0) return null;
        return state.undoStack[state.undoStack.length - 1].label;
    }

    function getRedoLabel() {
        if (state.redoStack.length === 0) return null;
        return state.redoStack[state.redoStack.length - 1].label;
    }

    function getHistory() {
        return {
            undo: state.undoStack.map(function(e) {
                return { id: e.id, label: e.label, type: e.type, timestamp: e.timestamp };
            }),
            redo: state.redoStack.map(function(e) {
                return { id: e.id, label: e.label, type: e.type, timestamp: e.timestamp };
            })
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // CLEANUP
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Clear all history
     */
    function clear(reason) {
        log('Clearing history: ' + (reason || 'manual'));
        
        state.undoStack = [];
        state.redoStack = [];
        state.pendingOperation = null;
        
        emit('cleared', { reason: reason || 'manual' });
        emitStateChanged();
    }

    /**
     * Clear history when composition changes
     */
    function clearOnCompChange(newCompId) {
        if (newCompId !== state.currentCompId) {
            log('Composition changed: ' + state.currentCompId + ' → ' + newCompId);
            state.currentCompId = newCompId;
            
            if (state.undoStack.length > 0 || state.redoStack.length > 0) {
                clear('composition_changed');
                
                if (typeof StatusBar !== 'undefined') {
                    StatusBar.info('Undo history cleared');
                }
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════
    
    function init(options) {
        if (state.initialized) {
            log('Already initialized');
            return;
        }
        
        // Merge options
        if (options) {
            if (options.maxHistory) config.maxHistory = options.maxHistory;
            if (options.debug !== undefined) config.debug = options.debug;
        }
        
        // Subscribe to composition changes
        if (typeof AESelectionSync !== 'undefined') {
            AESelectionSync.on('compositionChanged', function(data) {
                clearOnCompChange(data.id);
            });
            
            // Get current comp
            var currentComp = AESelectionSync.getCurrentComp();
            if (currentComp && currentComp.id) {
                state.currentCompId = currentComp.id;
            }
        }
        
        state.initialized = true;
        log('Initialized with config:', config);
        
        emitStateChanged();
    }

    function setDebug(enabled) {
        config.debug = enabled;
        log('Debug mode: ' + (enabled ? 'ON' : 'OFF'));
    }

    function isRecording() {
        return state.pendingOperation !== null;
    }

    // ═══════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════
    
    return {
        // Lifecycle
        init: init,
        
        // Recording
        beginOperation: beginOperation,
        endOperation: endOperation,
        cancelOperation: cancelOperation,
        isRecording: isRecording,
        
        // Undo/Redo
        undo: undo,
        redo: redo,
        
        // State
        canUndo: canUndo,
        canRedo: canRedo,
        getUndoLabel: getUndoLabel,
        getRedoLabel: getRedoLabel,
        getHistory: getHistory,
        
        // Events
        on: on,
        off: off,
        
        // Cleanup
        clear: clear,
        clearOnCompChange: clearOnCompChange,
        
        // Debug
        setDebug: setDebug
    };

})();

// Export for debugging
if (typeof window !== 'undefined') {
    window.UndoManager = UndoManager;
}
