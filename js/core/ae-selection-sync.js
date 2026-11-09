/**
 * BolasPro v5.0 - AE Selection Sync
 * نظام مركزي لمزامنة التحديد مع After Effects
 * 
 * Features:
 * - Centralized polling (single source of truth)
 * - Event-based architecture (pub/sub)
 * - Adaptive polling (fast/normal/idle modes)
 * - Selection caching and change detection
 * - Composition change detection
 * 
 * Events:
 * - selectionChanged: { layers, count, isSingle }
 * - singleLayerSelected: { index, name, isFree, isHunter, isPrey, is3D }
 * - multipleLayersSelected: { layers, count }
 * - noSelection: null
 * - chainDetected: { inChain, members, chainLength, selectedIndex }
 * - freeLayerSelected: { index, name, is3D }
 * - compositionChanged: { id, name, numLayers }
 * - error: { message, code }
 */

var AESelectionSync = (function() {
    'use strict';

    // ═══════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════
    
    var config = {
        fastPollRate: 150,      // Fast mode: 150ms
        normalPollRate: 300,    // Normal mode: 300ms
        idlePollRate: 600,      // Idle mode: 600ms
        idleTimeout: 3000,      // Switch to idle after 3s of no changes
        debounceTime: 50,       // Debounce rapid changes
        maxRetries: 3,          // Max retries on error
        debug: false            // Debug logging
    };

    // ═══════════════════════════════════════════════════════════════
    // PRIVATE STATE
    // ═══════════════════════════════════════════════════════════════
    
    var state = {
        isRunning: false,
        isPaused: false,
        mode: 'normal',         // 'fast' | 'normal' | 'idle'
        pollInterval: null,
        lastActivity: Date.now(),
        lastPollTime: 0,
        errorCount: 0,
        initialized: false
    };

    // Selection cache
    var cache = {
        layers: [],
        layerIndices: [],       // For quick comparison
        count: 0,
        compId: null,
        compName: null,
        numLayers: 0,
        chainInfo: null,
        lastUpdate: 0
    };

    // Event listeners: { eventName: [{ callback, id }] }
    var listeners = {};
    var listenerIdCounter = 0;

    // Debounce timer
    var debounceTimer = null;

    // ═══════════════════════════════════════════════════════════════
    // LOGGING
    // ═══════════════════════════════════════════════════════════════
    
    function log(message, data) {
        if (config.debug) {
            if (data !== undefined) {
                console.log('[AESelectionSync] ' + message, data);
            } else {
                console.log('[AESelectionSync] ' + message);
            }
        }
    }

    function logError(message, error) {
        console.error('[AESelectionSync] ' + message, error);
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

    // ═══════════════════════════════════════════════════════════════
    // POLLING ENGINE
    // ═══════════════════════════════════════════════════════════════
    
    function startPolling() {
        if (state.pollInterval) {
            clearInterval(state.pollInterval);
        }
        
        var rate = getPollRate();
        state.pollInterval = setInterval(poll, rate);
        log('Polling started at ' + rate + 'ms (' + state.mode + ' mode)');
    }

    function stopPolling() {
        if (state.pollInterval) {
            clearInterval(state.pollInterval);
            state.pollInterval = null;
        }
        log('Polling stopped');
    }

    function getPollRate() {
        switch (state.mode) {
            case 'fast': return config.fastPollRate;
            case 'idle': return config.idlePollRate;
            default: return config.normalPollRate;
        }
    }

    function setMode(newMode) {
        if (state.mode === newMode) return;
        
        var oldMode = state.mode;
        state.mode = newMode;
        
        log('Mode changed: ' + oldMode + ' → ' + newMode);
        
        // Restart polling with new rate
        if (state.isRunning && !state.isPaused) {
            startPolling();
        }
    }

    function checkIdleState() {
        var timeSinceActivity = Date.now() - state.lastActivity;
        
        if (state.mode === 'fast' && timeSinceActivity > 1000) {
            setMode('normal');
        } else if (state.mode === 'normal' && timeSinceActivity > config.idleTimeout) {
            setMode('idle');
        }
    }

    function recordActivity() {
        state.lastActivity = Date.now();
        
        if (state.mode === 'idle') {
            setMode('normal');
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // POLLING LOGIC
    // ═══════════════════════════════════════════════════════════════
    
    function poll() {
        if (state.isPaused) return;
        
        // Check idle state
        checkIdleState();
        
        // Get selection state from AE
        if (typeof HostService === 'undefined' || !HostService) {
            return;
        }

        HostService.getSelectionState().then(function(result) {
            state.errorCount = 0;
            processSelectionState(result);
        }).catch(function(error) {
            handlePollError(error);
        });
    }

    function processSelectionState(result) {
        if (!result || !result.success) {
            // No comp or error
            if (cache.compId !== null || cache.count > 0) {
                clearCache();
                emit('noSelection', null);
            }
            return;
        }

        // Check composition change
        if (result.compId !== cache.compId) {
            handleCompositionChange(result);
        }

        // Check selection change
        if (hasSelectionChanged(result.layers)) {
            handleSelectionChange(result);
        }
    }

    function hasSelectionChanged(newLayers) {
        if (!newLayers) newLayers = [];
        
        // Quick count check
        if (newLayers.length !== cache.count) {
            return true;
        }
        
        // Compare indices
        var newIndices = newLayers.map(function(l) { return l.index; }).sort();
        
        if (newIndices.length !== cache.layerIndices.length) {
            return true;
        }
        
        for (var i = 0; i < newIndices.length; i++) {
            if (newIndices[i] !== cache.layerIndices[i]) {
                return true;
            }
        }
        
        return false;
    }

    function handleCompositionChange(result) {
        log('Composition changed: ' + result.compName);
        
        cache.compId = result.compId;
        cache.compName = result.compName;
        cache.numLayers = result.numLayers;
        
        emit('compositionChanged', {
            id: result.compId,
            name: result.compName,
            numLayers: result.numLayers
        });
    }

    function handleSelectionChange(result) {
        // Debounce rapid changes
        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }
        
        debounceTimer = setTimeout(function() {
            processSelectionChange(result);
        }, config.debounceTime);
    }

    function processSelectionChange(result) {
        var layers = result.layers || [];
        var count = layers.length;
        
        // Update cache
        cache.layers = layers;
        cache.layerIndices = layers.map(function(l) { return l.index; }).sort();
        cache.count = count;
        cache.chainInfo = result.chainInfo;
        cache.lastUpdate = Date.now();
        
        // Record activity
        recordActivity();
        
        log('Selection changed: ' + count + ' layer(s)');
        
        // Emit events based on selection
        if (count === 0) {
            emit('noSelection', null);
            emit('selectionChanged', { layers: [], count: 0, isSingle: false });
            
        } else if (count === 1) {
            var layer = layers[0];
            
            emit('selectionChanged', { layers: layers, count: 1, isSingle: true });
            emit('singleLayerSelected', layer);
            
            // Check if free layer
            if (layer.isFree) {
                emit('freeLayerSelected', {
                    index: layer.index,
                    name: layer.name,
                    is3D: layer.is3D
                });
            }
            
            // Check if in chain
            if (result.chainInfo && result.chainInfo.inChain) {
                emit('chainDetected', result.chainInfo);
            }
            
        } else {
            emit('selectionChanged', { layers: layers, count: count, isSingle: false });
            emit('multipleLayersSelected', { layers: layers, count: count });
        }
    }

    function handlePollError(error) {
        state.errorCount++;
        logError('Poll error (' + state.errorCount + '/' + config.maxRetries + ')', error);
        
        if (state.errorCount >= config.maxRetries) {
            emit('error', { message: 'Connection lost', code: 'POLL_ERROR' });
            setMode('idle');
        }
    }

    function clearCache() {
        cache.layers = [];
        cache.layerIndices = [];
        cache.count = 0;
        cache.chainInfo = null;
        cache.lastUpdate = Date.now();
    }

    // ═══════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════
    
    function init(options) {
        if (state.initialized) {
            log('Already initialized');
            return;
        }
        
        // Merge options
        if (options) {
            if (options.fastPollRate) config.fastPollRate = options.fastPollRate;
            if (options.normalPollRate) config.normalPollRate = options.normalPollRate;
            if (options.idlePollRate) config.idlePollRate = options.idlePollRate;
            if (options.idleTimeout) config.idleTimeout = options.idleTimeout;
            if (options.debug !== undefined) config.debug = options.debug;
        }
        
        state.initialized = true;
        log('Initialized with config:', config);
        
        // Auto-start
        start();
    }

    function start() {
        if (state.isRunning) {
            log('Already running');
            return;
        }
        
        state.isRunning = true;
        state.isPaused = false;
        state.lastActivity = Date.now();
        
        startPolling();
        log('Started');
    }

    function stop() {
        if (!state.isRunning) return;
        
        state.isRunning = false;
        stopPolling();
        log('Stopped');
    }

    function pause() {
        if (state.isPaused) return;
        
        state.isPaused = true;
        log('Paused');
    }

    function resume() {
        if (!state.isPaused) return;
        
        state.isPaused = false;
        recordActivity();
        log('Resumed');
    }

    function forceRefresh() {
        log('Force refresh');
        recordActivity();
        setMode('fast');
        poll();
    }

    function getSelection() {
        return {
            layers: cache.layers.slice(),
            count: cache.count,
            isSingle: cache.count === 1
        };
    }

    function getCurrentComp() {
        return {
            id: cache.compId,
            name: cache.compName,
            numLayers: cache.numLayers
        };
    }

    function getChainInfo() {
        return cache.chainInfo;
    }

    function isRunning() {
        return state.isRunning && !state.isPaused;
    }

    function getMode() {
        return state.mode;
    }

    function setDebug(enabled) {
        config.debug = enabled;
        log('Debug mode: ' + (enabled ? 'ON' : 'OFF'));
    }

    // ═══════════════════════════════════════════════════════════════
    // EXPORT
    // ═══════════════════════════════════════════════════════════════
    
    return {
        // Lifecycle
        init: init,
        start: start,
        stop: stop,
        pause: pause,
        resume: resume,
        
        // Events
        on: on,
        off: off,
        
        // Data
        getSelection: getSelection,
        getCurrentComp: getCurrentComp,
        getChainInfo: getChainInfo,
        
        // Control
        forceRefresh: forceRefresh,
        setMode: setMode,
        getMode: getMode,
        isRunning: isRunning,
        
        // Debug
        setDebug: setDebug
    };

})();

// Export for debugging
if (typeof window !== 'undefined') {
    window.AESelectionSync = AESelectionSync;
}
